import { bytesToHexString, getSSLHubRpcClient, hexStringToBytes } from "@farcaster/hub-nodejs";
import { fromFarcasterTime } from "@farcaster/hub-nodejs";
import { PrismaClient } from "@prisma/client";
import { HUB_HOST } from "../../constants";
import dayjs from "dayjs";

const prisma = new PrismaClient();

export async function backfillUserDataByFid(fid: number) {
  const client = await getSSLHubRpcClient(HUB_HOST);
  let message_count = 0;

  prisma.$connect();

  let nextPageToken: string | null = "";

  let messages: any[] = [];

  while (nextPageToken !== null) {
    if (fid === 0) break;

    const result: any =
      (await client.getUserDataByFid({
        fid,
        pageToken: hexStringToBytes(nextPageToken)?.value,
      })) ?? {};

    messages.push(...(result?.value?.messages ?? []));

    const token = bytesToHexString(result?.value?.nextPageToken ?? "")?.value || null;
    nextPageToken = token === "0x" || !token ? null : token;
  }

  const user_data = messages
    .map((c) => ({
      fid: c.data.fid,
      timestamp: fromFarcasterTime(c.data.timestamp).value,
      type: c.data.userDataBody.type,
      value: c.data.userDataBody.value,
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  const obj = {
    fid,
    fname: user_data.find((c) => c.type === 6)?.value,
    bio: user_data.find((c) => c.type === 3)?.value,
    pfp_url: user_data.find((c) => c.type === 1)?.value,
    display_name: user_data.find((c) => c.type === 2)?.value,
    url: user_data.find((c) => c.type === 5)?.value,
    updated_at: dayjs().valueOf(),
  };

  try {
    await prisma.user.upsert({
      where: { fid },
      create: { ...obj, created_at: dayjs().valueOf() },
      update: obj,
    });
    message_count += user_data?.length;
  } catch (err) {
    console.log(err);
  }

  prisma.$disconnect();

  console.log(`backfilled ${message_count} user data messages for fid ${fid}`);

  return {
    status: "ok",
    fid,
    message_count,
  };
}
