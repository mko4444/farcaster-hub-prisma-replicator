import fastq, { queueAsPromised } from "fastq";
import prettyMilliseconds from "pretty-ms";
import { upsertWithRetry } from "./helpers/upsertWithRetry";
import {
  CastAddBody,
  CastRemoveBody,
  HubRpcClient,
  LinkBody,
  ReactionBody,
  UserDataBody,
  VerificationAddEthAddressBody,
  VerificationRemoveBody,
  fromFarcasterTime,
  getInsecureHubRpcClient,
  getSSLHubRpcClient,
  isMergeMessageHubEvent,
  isPruneMessageHubEvent,
  isRevokeMessageHubEvent,
} from "@farcaster/hub-nodejs";
import { bytesToHexString } from "./helpers/bytesToHexString";
import { PrismaClient } from "@prisma/client";
import { HubSubscriber } from "./hubSubscriber";
import {
  constructParent,
  constructEmbeddedCasts,
  constructMentions,
  constructConnectUser,
  constructCast,
  constructReactionType,
} from "./helpers/constructs";
import dayjs from "dayjs";
import { Logger } from "pino";

import { MAX_PAGE_SIZE, MAX_JOB_CONCURRENCY } from "./constants";

export class PrismaHubReplicator {
  private client: HubRpcClient;
  private subscriber: HubSubscriber;
  private prisma: PrismaClient;

  constructor(private hub_address: string, private ssl: boolean, private log: Logger, prisma: PrismaClient) {
    this.client = this.ssl ? getSSLHubRpcClient(hub_address) : getInsecureHubRpcClient(hub_address);
    this.subscriber = new HubSubscriber(this.client, log);
    this.prisma = prisma;

    this.subscriber.on("event", async (hubEvent) => {
      if (isMergeMessageHubEvent(hubEvent)) {
        this.log.info(`[Sync] Processing merge event ${hubEvent.id} from stream`);
        await this.onMergeMessages([hubEvent.mergeMessageBody.message]);
      } else if (isPruneMessageHubEvent(hubEvent)) {
        this.log.info(`[Sync] Processing prune event ${hubEvent.id}`);
        await this.onMergeMessages([hubEvent.pruneMessageBody.message]);
      } else if (isRevokeMessageHubEvent(hubEvent)) {
        this.log.info(`[Sync] Processing revoke event ${hubEvent.id}`);
        await this.onMergeMessages([hubEvent.revokeMessageBody.message]);
      } else {
        // TODO: handle other types of events
      }
      // Keep track of how many events we've processed.
      await this.prisma.hubSubscription.upsert({
        where: { url: this.hub_address },
        create: { url: this.hub_address, last_event_id: hubEvent.id },
        update: { last_event_id: hubEvent.id },
      });
    });
  }

  public stop() {
    this.prisma.$disconnect();
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
    const subscription = await this.prisma.hubSubscription.findUnique({
      where: { url: this.hub_address },
    });

    this.subscriber.start(Number(subscription?.last_event_id));

    await this.backfill();
  }

  private async backfill() {
    const maxFidResult = await this.client.getFids({ pageSize: 1, reverse: true });
    if (maxFidResult.isErr()) throw new Error("Unable to get max fid for backfill");

    const maxFid = maxFidResult.value.fids[0];
    let totalProcessed = 0;
    const startTime = Date.now();

    const queue: queueAsPromised<{ fid: number }> = fastq.promise(async ({ fid }) => {
      await this.processAllMessagesForFid(fid);
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
  private parseCastAddMessage(
    { parentUrl: parent_url, text, mentions, mentionsPositions: mentions_positions, embeds, parentCastId }: CastAddBody,
    hash: string,
    fid: number,
    timestamp: Date
  ) {
    return {
      hash,
      timestamp,
      parent_url,
      text,
      mentions_positions,
      embedded_urls: embeds.map((embed) => embed.url).filter((f) => !!f) as string[],
      parent: parentCastId ? constructParent(bytesToHexString(parentCastId.hash).value, parentCastId.fid) : undefined,
      embedded_casts: constructEmbeddedCasts(embeds),
      mentions: constructMentions(mentions),
      author: constructConnectUser(fid),
    };
  }
  private parseCastRemoveMessage({ targetHash: hash }: CastRemoveBody, _: string, fid: number, timestamp: Date) {
    return {
      hash: bytesToHexString(hash).value,
      timestamp,
      deleted_at: timestamp,
      author: {
        connectOrCreate: {
          where: { fid },
          create: { fid },
        },
      },
    };
  }
  private parseReactionAddMessage(body: ReactionBody, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      target_url: body.targetUrl,
      type: constructReactionType(body.type),
      cast: constructCast(body.targetCastId),
      author: constructConnectUser(fid),
    };
  }
  private parseReactionRemoveMessage(body: ReactionBody, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      target_url: body.targetUrl,
      deleted_at: timestamp,
      type: constructReactionType(body.type),
      cast: constructCast(body.targetCastId),
      author: constructConnectUser(fid),
    };
  }
  private parseLinkAddMessage({ type, targetFid }: LinkBody, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      type,
      author: constructConnectUser(fid),
      target_user: targetFid ? constructConnectUser(targetFid) : undefined,
    };
  }
  private parseLinkRemoveMessage({ type, targetFid }: LinkBody, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      deleted_at: timestamp,
      type,
      author: constructConnectUser(fid),
      target_user: targetFid ? constructConnectUser(targetFid) : undefined,
    };
  }
  private parseVerificationAddMessage(body: VerificationAddEthAddressBody, hash: string, fid: number, timestamp: Date) {
    return {
      timestamp,
      hash,
      address: bytesToHexString(body?.address).value,
      eth_signature: bytesToHexString(body?.ethSignature).value,
      block_hash: bytesToHexString(body?.blockHash).value,
      author: constructConnectUser(fid),
    };
  }
  private parseVerificationRemoveMessage(body: VerificationRemoveBody, hash: string, fid: number, timestamp: Date) {
    return {
      timestamp,
      hash,
      deleted_at: timestamp,
      address: bytesToHexString(body?.address).value,
      author: constructConnectUser(fid),
    };
  }
  private parseUserDataAddMessage({ type, value }: UserDataBody, _: string, fid: number, __: Date) {
    return {
      fid,
      fname: type === 6 ? value : undefined,
      pfp_url: type === 1 ? value : undefined,
      bio: type === 3 ? value : undefined,
      display_name: type === 2 ? value : undefined,
      url: type === 5 ? value : undefined,
    };
  }
  private parseUserDataMessage({ type, value }: UserDataBody, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      type,
      value,
      author: constructConnectUser(fid),
    };
  }
  private async onMergeMessages(messages: any[]) {
    for (const message of messages) {
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
          const cast = this.parseCastAddMessage(...parseProps);
          await upsertWithRetry(this.prisma.cast, { hash }, cast, cast);
          break;
        case 2: // cast remove
          const castRemove = this.parseCastRemoveMessage(...parseProps);
          await upsertWithRetry(this.prisma.cast, { hash }, castRemove, castRemove);
          break;
        case 3: // reaction add
          const reaction = this.parseReactionAddMessage(...parseProps);
          await upsertWithRetry(this.prisma.reaction, { hash }, reaction, reaction);
          break;
        case 4: // reaction remove
          const reactionRemove = this.parseReactionRemoveMessage(...parseProps);
          await upsertWithRetry(this.prisma.reaction, { hash }, reactionRemove, reactionRemove);
          break;
        case 5: // link add
          const link = this.parseLinkAddMessage(...parseProps);
          await upsertWithRetry(this.prisma.link, { hash }, link, link);
          break;
        case 6: // link remove
          const linkRemove = this.parseLinkRemoveMessage(...parseProps);
          await upsertWithRetry(this.prisma.link, { hash }, linkRemove, linkRemove);
          break;
        case 7: // verification add
          const verification = this.parseVerificationAddMessage(...parseProps);
          await upsertWithRetry(this.prisma.verification, { hash }, verification, verification);
          break;
        case 8: // verification remove
          const verificationRemove = this.parseVerificationRemoveMessage(...parseProps);
          await upsertWithRetry(this.prisma.verification, { hash }, verificationRemove, verificationRemove);
          break;
        case 11: // user data add
          const user_profile = this.parseUserDataAddMessage(...parseProps);
          const user_message = this.parseUserDataMessage(...parseProps);
          await upsertWithRetry(this.prisma.user, { fid: user_profile.fid! }, user_profile, user_profile);
          await upsertWithRetry(this.prisma.userDataMessage, { hash }, user_message, user_message);
          break;
      }
    }
  }
}
