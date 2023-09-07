import { CastAddBody } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import prisma from "../../prisma/client";

export function parseCastAddMessage(body: CastAddBody, hash: string, fid: number, timestamp: Date) {
  let txs: any = [];

  const fids_to_save = [
    body?.parentCastId?.fid ?? undefined,
    ...body.mentions,
    ...body.embeds.map((embed) => embed?.castId?.fid),
    fid,
  ].filter((f) => !!f);

  const casts_to_save = [body?.parentCastId?.hash, ...body.embeds?.map((embed) => embed?.castId?.hash)]
    .filter((f) => !!f)
    .map((hash) => bytesToHexString(hash!).value);

  const prisma_obj = {
    hash,
    timestamp,
    parent_url: body.parentUrl,
    text: body.text,
    mentions_positions: body.mentionsPositions,
    embedded_urls: body.embeds.map((embed) => embed.url).filter((f) => !!f) as string[],
    parent: body?.parentCastId?.hash
      ? {
          connect: {
            hash: bytesToHexString(body.parentCastId.hash).value,
          },
        }
      : undefined,
    embedded_casts: {
      connect: body.embeds
        .map(({ castId }) =>
          castId?.hash
            ? {
                hash: bytesToHexString(castId.hash).value,
              }
            : undefined
        )
        .filter((f) => !!f),
    },
    mentions: { connect: body.mentions.map((fid) => ({ fid })) },
    author: { connect: { fid } },
  };

  txs.push(...fids_to_save.map((fid) => prisma.user.upsert({ where: { fid }, create: { fid }, update: {} })));

  txs.push(
    ...casts_to_save.map((hash) =>
      prisma.cast.upsert({
        where: { hash },
        create: { hash, author: { connect: { fid } } },
        update: { hash, author: { connect: { fid } } },
      })
    )
  );

  txs.push(prisma.cast.upsert({ where: { hash }, create: prisma_obj, update: prisma_obj }));

  return txs;
}
