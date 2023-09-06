import fastq, { queueAsPromised } from "fastq";
import prettyMilliseconds from "pretty-ms";
import os from "node:os";
import { HubRpcClient, fromFarcasterTime, getInsecureHubRpcClient, getSSLHubRpcClient } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "./helpers/bytesToHexString";
import { Cast, Link, Prisma, PrismaClient, Reaction, User, UserDataMessage, Verification } from "@prisma/client";
import {
  constructParent,
  constructEmbeddedCasts,
  constructMentions,
  constructConnectUser,
  constructCast,
  constructReactionType,
} from "./helpers/constructs";
import dayjs from "dayjs";

const MAX_JOB_CONCURRENCY = Number(process.env["MAX_CONCURRENCY"]) || os.cpus().length;
const MAX_PAGE_SIZE = 3_000;

export class PrismaHubReplicator {
  private client: HubRpcClient;
  private prisma: PrismaClient;

  constructor(private hubAddress: string, private ssl: boolean) {
    this.client = this.ssl ? getSSLHubRpcClient(hubAddress) : getInsecureHubRpcClient(hubAddress);
    this.prisma = new PrismaClient();
  }

  public async start() {
    const infoResult = await this.client.getInfo({ dbStats: true });

    if (infoResult.isErr() || infoResult.value.dbStats === undefined) {
      throw new Error(`Unable to get information about hub ${this.hubAddress}`);
    }

    const { numMessages } = infoResult.value.dbStats;

    // Not technically true, since hubs don't return CastRemove/etc. messages,
    // but at least gives a rough ballpark of order of magnitude.
    console.info(`[Backfill] Fetching messages from hub ${this.hubAddress} (~${numMessages} messages)`);

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
  private parseCastAddMessage(body: any, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      parent_url: body.parentUrl,
      text: body.text,
      mentions_positions: body.mentionsPositions,
      embedded_urls: body.embeds.map((c) => c.url)?.filter((f) => !!f),
      parent: constructParent(
        bytesToHexString(body?.parentCastId?.hash).value ?? undefined,
        body?.parentCastId?.fid ?? undefined
      ),
      embedded_casts: constructEmbeddedCasts(body.embeds),
      mentions: constructMentions(body.mentions),
      author: constructConnectUser(fid),
    };
  }
  private parseCastRemoveMessage({ target_hash }: any, hash: string, fid: number, timestamp: Date) {
    return {
      hash: target_hash,
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
  private parseReactionAddMessage(body: any, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      target_url: body.targetUrl,
      type: constructReactionType(body.type),
      cast: constructCast(body.targetCastId),
      author: constructConnectUser(fid),
    };
  }
  private parseReactionRemoveMessage(body: any, hash: string, fid: number, timestamp: Date) {
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
  private parseLinkAddMessage(body: any, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      type: body.type,
      author: constructConnectUser(fid),
      target_user: constructConnectUser(body.targetFid),
    };
  }
  private parseLinkRemoveMessage(body: any, hash: string, fid: number, timestamp: Date) {
    return {
      hash,
      timestamp,
      deleted_at: timestamp,
      type: body.type,
      author: constructConnectUser(fid),
      target_user: constructConnectUser(body.targetFid),
    };
  }
  private parseVerificationAddMessage(body: any, hash: string, fid: number, timestamp: Date) {
    return {
      timestamp,
      hash,
      address: bytesToHexString(body?.address).value,
      eth_signature: bytesToHexString(body?.ethSignature).value,
      block_hash: bytesToHexString(body?.blockHash).value,
      author: constructConnectUser(fid),
    };
  }
  private parseVerificationRemoveMessage(body: any, hash: string, fid: number, timestamp: Date) {
    return {
      timestamp,
      hash,
      deleted_at: timestamp,
      address: bytesToHexString(body?.address).value,
      eth_signature: bytesToHexString(body?.ethSignature).value,
      block_hash: bytesToHexString(body?.blockHash).value,
      author: constructConnectUser(fid),
    };
  }
  private parseUserDataAddMessage(
    {
      type,
      value,
    }: {
      type: number;
      value: string;
    },
    _: string,
    fid: number,
    __: Date
  ) {
    return {
      fid,
      fname: type === 6 ? value : undefined,
      pfp_url: type === 1 ? value : undefined,
      bio: type === 3 ? value : undefined,
      display_name: type === 2 ? value : undefined,
      url: type === 5 ? value : undefined,
    };
  }
  private parseUserDataMessage(
    {
      type,
      value,
    }: {
      type: number;
      value: string;
    },
    hash: string,
    fid: number,
    timestamp: Date
  ) {
    return {
      hash,
      timestamp,
      type,
      value,
      author: constructConnectUser(fid),
    };
  }
  async prismaSaveCast(o: Partial<Cast>) {
    if (!o.hash) return undefined;
    return this.prisma.cast.upsert({ where: { hash: o.hash }, create: o as Cast, update: o });
  }
  private async prismaSaveReaction(o: Partial<Reaction>) {
    if (!o.hash) return undefined;
    return this.prisma.reaction.upsert({ where: { hash: o.hash }, create: o as Reaction, update: o });
  }
  private prismaSaveLink(o: Partial<Link>) {
    if (!o.hash) return undefined;
    return this.prisma.link.upsert({ where: { hash: o.hash }, create: o as Link, update: o });
  }
  private prismaSaveVerification(o: Partial<Verification>) {
    if (!o.hash) return undefined;
    return this.prisma.verification.upsert({
      where: { hash: o.hash },
      create: o as Verification,
      update: o,
    });
  }
  private prismaSaveUserData(o: Partial<User>) {
    if (!o.fid) return undefined;
    return this.prisma.user.upsert({ where: { fid: o.fid }, create: o as User, update: o });
  }
  private prismaSaveUserDataMessage(o: Partial<UserDataMessage>) {
    if (!o.hash) return undefined;
    return this.prisma.userDataMessage.upsert({ where: { hash: o.hash }, create: o as UserDataMessage, update: o });
  }
  private async onMergeMessages(messages: any[]) {
    try {
      for await (const message of messages) {
        // @ts-ignore
        let timestamp = dayjs(fromFarcasterTime(message.data?.timestamp).value).format();
        // @ts-ignore
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

        let parseProps: [any, string, number, any] = [body, hash, fid, timestamp];

        switch (message.data.type) {
          case 0:
            break;
          case 1: // cast add
            await this.prismaSaveCast(this.parseCastAddMessage(...parseProps));
            break;
          case 2: // cast remove
            await this.prismaSaveCast(this.parseCastRemoveMessage(...parseProps));
            break;
          case 3: // reaction add
            await this.prismaSaveReaction(this.parseReactionAddMessage(...parseProps));
            break;
          case 4: // reaction remove
            await this.prismaSaveReaction(this.parseReactionRemoveMessage(...parseProps));
            break;
          case 5: // link add
            await this.prismaSaveLink(this.parseLinkAddMessage(...parseProps));
            break;
          case 6: // link remove
            await this.prismaSaveLink(this.parseLinkRemoveMessage(...parseProps));
            break;
          case 7: // verification add
            await this.prismaSaveVerification(this.parseVerificationAddMessage(...parseProps));
            break;
          case 8: // verification remove
            await this.prismaSaveVerification(this.parseVerificationRemoveMessage(...parseProps));
            break;
          case 9:
            // console.log(9, ...parseProps);
            // parsedMessage = this.parseSignerAddMessage(...parseProps);
            break;
          case 10:
            // console.log(10, ...parseProps);
            // parsedMessage = this.parseSignerRemoveMessage(...parseProps);
            break;
          case 11: // user data add
            await this.prismaSaveUserData(this.parseUserDataAddMessage(...parseProps));
            await this.prismaSaveUserDataMessage(this.parseUserDataMessage(...parseProps));
            break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}
