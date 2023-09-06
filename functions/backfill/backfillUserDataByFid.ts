import fastq, { queueAsPromised } from "fastq";
import prettyMilliseconds from "pretty-ms";
import os from "node:os";
import { HubRpcClient, Message, getInsecureHubRpcClient, getSSLHubRpcClient } from "@farcaster/hub-nodejs";

const MAX_JOB_CONCURRENCY = Number(process.env["MAX_CONCURRENCY"]) || os.cpus().length;
const MAX_PAGE_SIZE = 3_000;

export class PrismaHubReplicator {
  private client: HubRpcClient;

  constructor(private hubAddress: string, private ssl: boolean) {
    this.client = this.ssl ? getSSLHubRpcClient(hubAddress) : getInsecureHubRpcClient(hubAddress);
  }

  public async backfill() {
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
    console.info(`[Backfill] Completed in ${prettyMilliseconds(Date.now() - startTime)}`);
  }

  private async processAllMessagesForFid(fid: number) {
    /**
     * Which hub events to process?
     * - user data messages
     * - casts
     * - verifications
     * - reactions
     * - signers
     * - links
     */

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
        throw new Error("Unable to backfill", { cause: result.error });
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
        throw new Error("Unable to backfill", { cause: result.error });
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
        throw new Error("Unable to backfill", { cause: result.error });
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
        throw new Error("Unable to backfill", { cause: result.error });
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
        throw new Error("Unable to backfill", { cause: result.error });
      }

      const { messages, nextPageToken: pageToken } = result.value;

      yield messages;

      if (!pageToken?.length) break;
      result = await this.client.getUserDataByFid({ pageSize, pageToken, fid });
    }
  }

  private async onMergeMessages(messages: Message[]) {
    // TODO

    console.log(messages[0]);
  }
}

// import { bytesToHexString, getSSLHubRpcClient, hexStringToBytes } from "@farcaster/hub-nodejs";
// import { fromFarcasterTime } from "@farcaster/hub-nodejs";
// import { PrismaClient } from "@prisma/client";
// import { HUB_HOST } from "../../constants";
// import dayjs from "dayjs";

// const prisma = new PrismaClient();

// export async function backfillUserDataByFid(fid: number) {
//   const client = await getSSLHubRpcClient(HUB_HOST);
//   let message_count = 0;

//   prisma.$connect();

//   let nextPageToken: string | null = "";

//   let messages: any[] = [];

//   while (nextPageToken !== null) {
//     if (fid === 0) break;

//     const result: any =
//       (await client.getUserDataByFid({
//         fid,
//         pageToken: hexStringToBytes(nextPageToken)?.value,
//       })) ?? {};

//     messages.push(...(result?.value?.messages ?? []));

//     const token = bytesToHexString(result?.value?.nextPageToken ?? "")?.value || null;
//     nextPageToken = token === "0x" || !token ? null : token;
//   }

//   const user_data = messages
//     .map((c) => ({
//       fid: c.data.fid,
//       timestamp: fromFarcasterTime(c.data.timestamp).value,
//       type: c.data.userDataBody.type,
//       value: c.data.userDataBody.value,
//     }))
//     .sort((a, b) => b.timestamp - a.timestamp);

//   const obj = {
//     fid,
//     fname: user_data.find((c) => c.type === 6)?.value,
//     bio: user_data.find((c) => c.type === 3)?.value,
//     pfp_url: user_data.find((c) => c.type === 1)?.value,
//     display_name: user_data.find((c) => c.type === 2)?.value,
//     url: user_data.find((c) => c.type === 5)?.value,
//     updated_at: dayjs().valueOf(),
//   };

//   try {
//     await prisma.user.upsert({
//       where: { fid },
//       create: { ...obj, created_at: dayjs().valueOf() },
//       update: obj,
//     });
//     message_count += user_data?.length;
//   } catch (err) {
//     console.log(err);
//   }

//   prisma.$disconnect();

//   console.log(`backfilled ${message_count} user data messages for fid ${fid}`);

//   return {
//     status: "ok",
//     fid,
//     message_count,
//   };
// }
