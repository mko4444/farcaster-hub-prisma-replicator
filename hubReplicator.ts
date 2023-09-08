import fastq, { queueAsPromised } from "fastq";
import prettyMilliseconds from "pretty-ms";
import {
  HubRpcClient,
  fromFarcasterTime,
  getInsecureHubRpcClient,
  getSSLHubRpcClient,
  isMergeMessageHubEvent,
  isPruneMessageHubEvent,
  isRevokeMessageHubEvent,
} from "@farcaster/hub-nodejs";
import { bytesToHexString } from "./helpers/bytesToHexString";
import { HubSubscriber } from "./hubSubscriber";
import dayjs from "dayjs";
import { Logger } from "pino";

import { parseCastAddMessage } from "./helpers/parsers/parseCastAddMessage";
import { parseCastRemoveMessage } from "./helpers/parsers/parseCastRemoveMessage";
import { parseReactionAddMessage } from "./helpers/parsers/parseReactionAddMessage";
import { parseReactionRemoveMessage } from "./helpers/parsers/parseReactionRemoveMessage";
import { parseLinkAddMessage } from "./helpers/parsers/parseLinkAddMessage";
import { parseLinkRemoveMessage } from "./helpers/parsers/parseLinkRemoveMessage";
import { parseUserDataMessage } from "./helpers/parsers/parseUserDataMessage";
import { parseVerificationRemoveMessage } from "./helpers/parsers/parseVerificationRemoveMessage";
import { parseVerificationAddMessage } from "./helpers/parsers/parseVerificationAddMessage";
import { parseUserDataAddMessage } from "./helpers/parsers/parseUserDataAddMessage";

import { MAX_PAGE_SIZE, MAX_JOB_CONCURRENCY, MAX_BATCH_SIZE, BATCH_INTERVAL } from "./constants";
import prisma from "./prisma/client";
import { PrismaPromise } from "@prisma/client";

export class PrismaHubReplicator {
  private client: HubRpcClient;
  private subscriber: HubSubscriber;

  constructor(private hub_address: string, private ssl: boolean, private log: Logger) {
    this.client = this.ssl ? getSSLHubRpcClient(hub_address) : getInsecureHubRpcClient(hub_address);
    this.subscriber = new HubSubscriber(this.client, log);

    let batchBuffer: any[] = [];
    let batchTimer: any = null;

    const queue: queueAsPromised = fastq.promise(async (batchMessages: any[]) => {
      this.log.info(`[Sync] Processing ${batchMessages.length} events from stream`);
      await this.onMergeMessages(batchMessages.map((m) => m.message));

      // Update the last event ID we processed
      const lastEventId = batchMessages[batchMessages.length - 1].id;

      await prisma.hubSubscription.upsert({
        where: { url: this.hub_address },
        create: { url: this.hub_address, last_event_id: lastEventId },
        update: { last_event_id: lastEventId },
      });
    }, MAX_JOB_CONCURRENCY);

    const processBatch = () => {
      if (batchBuffer.length > 0) {
        queue.push(batchBuffer);
        batchBuffer = [];
      }
      batchTimer = null;
    };

    this.subscriber.on("event", async (hubEvent) => {
      let message;
      if (isMergeMessageHubEvent(hubEvent)) {
        // this.log.info(`[Sync] Processing merge event ${hubEvent.id}`);
        message = hubEvent.mergeMessageBody.message;
      } else if (isPruneMessageHubEvent(hubEvent)) {
        // this.log.info(`[Sync] Processing prune event ${hubEvent.id}`);
        message = hubEvent.pruneMessageBody.message;
      } else if (isRevokeMessageHubEvent(hubEvent)) {
        // this.log.info(`[Sync] Processing revoke event ${hubEvent.id}`);
        message = hubEvent.revokeMessageBody.message;
      } else {
        // this.log.warn(`[Sync] Unknown type ${hubEvent.type} of event ${hubEvent.id}. Ignoring`);
        return;
      }

      // Add message to the batch buffer
      batchBuffer.push({ message, id: hubEvent.id });

      if (batchBuffer.length >= MAX_BATCH_SIZE) {
        processBatch();
      } else if (batchTimer === null) {
        batchTimer = setTimeout(processBatch, BATCH_INTERVAL);
      }
    });

    queue.drain();
  }

  public stop() {
    this.subscriber.stop();
  }

  public destroy() {
    this.subscriber.destroy();
  }

  public async start() {
    const infoResult = await this.client.getInfo({ dbStats: true });

    if (infoResult.isErr() || infoResult.value.dbStats === undefined) {
      throw new Error(`Unable to get information about hub ${this.hub_address}`);
    }

    const { numMessages } = infoResult.value.dbStats;

    // Not technically true, since hubs don't return CastRemove/etc. messages,
    // but at least gives a rough ballpark of order of magnitude.
    console.info(`[Backfill] Fetching messages from hub ${this.hub_address} (~${numMessages} messages)`);

    // Process live events going forward, starting from the last event we
    // processed (if there was one).
    const subscription = await prisma.hubSubscription.findUnique({
      where: { url: this.hub_address },
    });

    this.subscriber.start(Number(subscription?.last_event_id));

    await this.backfill();
  }
  private async backfill() {
    const maxFidResult = await this.client.getFids({ pageSize: 1, reverse: true });
    const backfilled = await prisma.user.findMany({ where: { has_backfilled: true }, select: { fid: true } });
    if (maxFidResult.isErr()) throw new Error("Unable to get max fid for backfill");

    const maxFid = maxFidResult.value.fids[0];
    let totalProcessed = 0;
    const startTime = Date.now();

    const queue: queueAsPromised<{ fid: number }> = fastq.promise(async ({ fid }) => {
      if (backfilled.find((u) => u.fid === fid)) {
        return this.log.info(`[Backfill] Skipping FID ${fid} because it has already been backfilled`);
      }
      await this.processAllMessagesForFid(fid);
      await prisma.user.update({ where: { fid }, data: { has_backfilled: true } });

      totalProcessed += 1;
      const elapsedMs = Date.now() - startTime;
      const millisRemaining = Math.ceil((elapsedMs / totalProcessed) * (maxFid - totalProcessed));
      console.info(
        `[Backfill] Completed FID ${fid}/${maxFid}. Estimated time remaining: ${prettyMilliseconds(millisRemaining)}`
      );
    }, MAX_JOB_CONCURRENCY);

    for (let fid = 1; fid <= maxFid; fid++) {
      queue.push({ fid });
    }

    await queue.drain();
  }
  private async processAllMessagesForFid(fid: number) {
    for (const fn of [
      this.getCastsByFidInBatchesOf,
      this.getReactionsByFidInBatchesOf,
      this.getLinksByFidInBatchesOf,
      this.getSignersByFidInBatchesOf,
      this.getVerificationsByFidInBatchesOf,
      this.getUserDataByFidInBatchesOf,
    ]) {
      for await (const messages of fn.call(this, fid, MAX_PAGE_SIZE)) {
        await this.onMergeMessages(messages);
      }
    }
  }
  private async *getCastsByFidInBatchesOf(fid: number, pageSize: number) {
    let result = await this.client.getCastsByFid({ pageSize, fid });
    for (;;) {
      if (result.isErr()) {
        throw new Error("Unable to backfill");
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.client.getCastsByFid({ pageSize, pageToken, fid });
    }
  }
  private async *getReactionsByFidInBatchesOf(fid: number, pageSize: number) {
    let result = await this.client.getReactionsByFid({ pageSize, fid });
    for (;;) {
      if (result.isErr()) {
        throw new Error("Unable to backfill");
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.client.getReactionsByFid({ pageSize, pageToken, fid });
    }
  }
  private async *getLinksByFidInBatchesOf(fid: number, pageSize: number) {
    let result = await this.client.getLinksByFid({ pageSize, fid });
    for (;;) {
      if (result.isErr()) {
        throw new Error("Unable to backfill");
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.client.getLinksByFid({ pageSize, pageToken, fid });
    }
  }
  private async *getSignersByFidInBatchesOf(fid: number, pageSize: number) {
    let result = await this.client.getSignersByFid({ pageSize, fid });
    for (;;) {
      if (result.isErr()) {
        throw new Error("Unable to backfill");
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.client.getSignersByFid({ pageSize, pageToken, fid });
    }
  }
  private async *getVerificationsByFidInBatchesOf(fid: number, pageSize: number) {
    let result = await this.client.getVerificationsByFid({ pageSize, fid });
    for (;;) {
      if (result.isErr()) {
        throw new Error("Unable to backfill");
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.client.getVerificationsByFid({ pageSize, pageToken, fid });
    }
  }
  private async *getUserDataByFidInBatchesOf(fid: number, pageSize: number) {
    let result = await this.client.getUserDataByFid({ pageSize, fid });
    for (;;) {
      if (result.isErr()) {
        throw new Error("Unable to backfill");
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.client.getUserDataByFid({ pageSize, pageToken, fid });
    }
  }
  private async onMergeMessages(messages: any[]) {
    let txs: PrismaPromise<any>[] = [];

    for await (const message of messages) {
      // @ts-ignore
      let timestamp: Date = dayjs(fromFarcasterTime(message.data?.timestamp).value).format();
      let hash = bytesToHexString(message.hash).value;
      let fid = message.data?.fid;
      let body =
        message?.data?.castAddBody ||
        message?.data?.castRemoveBody ||
        message?.data?.reactionBody ||
        message?.data?.verificationAddEthAddressBody ||
        message?.data?.verificationRemoveBody ||
        message?.data?.signerAddBody ||
        message?.data?.userDataBody ||
        message?.data?.signerRemoveBody ||
        message?.data?.linkBody ||
        message?.data?.usernameProofBody;

      if (!hash) continue;

      let parseProps: [any, string, number, Date] = [body, hash, fid, timestamp];

      switch (message.data.type) {
        case 0:
          break;
        case 1: // cast add
          txs.push(prisma.cast.upsert(parseCastAddMessage(...parseProps)));
          break;
        case 2: // cast remove
          txs.push(prisma.cast.upsert(parseCastRemoveMessage(...parseProps)));
          break;
        case 3: // reaction add
          txs.push(prisma.reaction.upsert(parseReactionAddMessage(...parseProps)));
          break;
        case 4: // reaction remove
          txs.push(prisma.reaction.upsert(parseReactionRemoveMessage(...parseProps)));
          break;
        case 5: // link add
          txs.push(prisma.link.upsert(parseLinkAddMessage(...parseProps)));
          break;
        case 6: // link remove
          txs.push(prisma.link.upsert(parseLinkRemoveMessage(...parseProps)));
          break;
        case 7: // verification add
          txs.push(prisma.verification.upsert(parseVerificationAddMessage(...parseProps)));
          break;
        case 8: // verification remove
          txs.push(prisma.verification.update(parseVerificationRemoveMessage(...parseProps)));
          break;
        case 11: // user data add
          txs.push(prisma.userDataMessage.upsert(parseUserDataAddMessage(...parseProps)));
          txs.push(prisma.user.upsert(parseUserDataMessage(...parseProps)));
          break;
      }
    }

    for (let tx of txs) {
      await tx;
    }
  }
}
