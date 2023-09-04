import { bytesToHexString, getSSLHubRpcClient, hexStringToBytes } from "@farcaster/hub-nodejs";
import { fromFarcasterTime } from "@farcaster/hub-nodejs";
import { PrismaClient } from "@prisma/client";
import { HUB_HOST } from "../../constants";
import dayjs from "dayjs";

const prisma = new PrismaClient();

export async function backfillCastsByFid(fid: number) {
  const client = await getSSLHubRpcClient(HUB_HOST);
  let cast_count = 0;

  prisma.$connect();

  let nextPageToken: string | null = "";

  while (nextPageToken !== null) {
    const result: any = await client.getCastsByFid({
      fid,
      pageToken: hexStringToBytes(nextPageToken)?.value,
    });
    for await (const cast of result?.value?.messages || []) {
      // construct fields
      const hash = bytesToHexString(cast.hash).value;
      const raw_parent_hash = cast.data.castAddBody.parentCastId?.hash;
      const parent_hash = raw_parent_hash ? bytesToHexString(raw_parent_hash).value : undefined;
      const timestamp = fromFarcasterTime(cast.data.timestamp).value;
      const mentions_positions = cast.data.castAddBody.mentionsPositions;
      const mention_fids = cast.data.castAddBody.mentions;
      const embedded_urls = cast.data.castAddBody.embeds.map((c) => c.url)?.filter((f) => !!f);
      const embedded_cast_hashes = cast.data.castAddBody.embeds.map((c) => c.castId)?.filter((f) => !!f);
      // construct relations
      const parent = parent_hash
        ? {
            connectOrCreate: {
              where: { hash: parent_hash },
              create: {
                hash: parent_hash,
                created_at: timestamp,
                updated_at: timestamp,
                author: {
                  connectOrCreate: {
                    where: { fid: cast.data.castAddBody.parentCastId.fid },
                    create: {
                      fid: cast.data.castAddBody.parentCastId.fid,
                      created_at: timestamp,
                      updated_at: timestamp,
                    },
                  },
                },
              },
            },
          }
        : undefined;
      const embedded_casts =
        embedded_cast_hashes?.length > 0
          ? {
              connectOrCreate: embedded_cast_hashes.map(({ fid, hash }) => ({
                where: { hash },
                create: {
                  hash: bytesToHexString(hash).value,
                  created_at: timestamp,
                  updated_at: timestamp,
                  author: {
                    connectOrCreate: {
                      where: { fid },
                      create: {
                        fid,
                        created_at: timestamp,
                        updated_at: timestamp,
                      },
                    },
                  },
                },
              })),
            }
          : undefined;
      const mentions =
        mention_fids?.length > 0
          ? {
              connectOrCreate: mention_fids.map((fid) => ({
                where: { fid },
                create: {
                  fid,
                  created_at: timestamp,
                  updated_at: timestamp,
                },
              })),
            }
          : undefined;
      const author = {
        connectOrCreate: {
          where: { fid: cast.data.fid },
          create: {
            fid: cast.data.fid,
            created_at: dayjs().valueOf(),
            updated_at: dayjs().valueOf(),
          },
        },
      };
      // construct prisma object
      const object = {
        updated_at: timestamp,
        timestamp,
        hash,
        parent_url: cast.data.castAddBody.parentUrl,
        text: cast.data.castAddBody.text,
        parent,
        embedded_urls,
        embedded_casts,
        mentions,
        mentions_positions,
        author,
      };
      try {
        await prisma.cast.upsert({
          where: { hash },
          update: object,
          create: { ...object, created_at: dayjs().valueOf() },
        });
      } catch (err) {
        console.log(err);
      }
      cast_count++;
    }
    const token = bytesToHexString(result?.value?.nextPageToken ?? "")?.value || null;
    nextPageToken = token === "0x" || !token ? null : token;
  }

  prisma.$disconnect();

  console.log(`backfilled ${cast_count} casts for fid ${fid}`);

  return {
    status: "ok",
    fid,
    cast_count,
  };
}
