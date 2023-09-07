import { CastAddBody, Embed } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import prisma from "../../prisma/client";

export function parseCastAddMessage(body: CastAddBody, hash: string, fid: number, timestamp: Date) {
  let txs: any = [];

  const parent_hash = body.parentCastId && bytesToHexString(body.parentCastId.hash).value;
  const parent_fid = body.parentCastId && body.parentCastId.fid;

  // author
  txs.push(prisma.user.upsert({ where: { fid }, create: { fid }, update: {} }));

  // mentions
  txs.push(...body.mentions.map((fid: number) => prisma.user.upsert({ where: { fid }, create: { fid }, update: {} })));

  // embeds
  txs.push([
    ...body.embeds.map(
      ({ castId }: Embed) => castId && prisma.user.upsert({ where: { fid: castId.fid }, create: { fid }, update: {} })
    ),
    ...body.embeds.map(
      ({ castId }: Embed) =>
        castId?.hash &&
        prisma.cast.upsert({
          where: { hash: bytesToHexString(castId.hash).value },
          create: { hash: bytesToHexString(castId.hash).value, author: { connect: { fid: castId.fid } } },
          update: {},
        })
    ),
  ]);

  // parent
  if (parent_hash && parent_fid) {
    txs.push(
      prisma.user.upsert({ where: { fid: parent_fid }, create: { fid: parent_fid }, update: {} }),
      prisma.cast.upsert({
        where: { hash: parent_hash },
        create: { hash: parent_hash, author: { connect: { fid: parent_fid } } },
        update: {},
      })
    );
  }

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
      connect: body.embeds.map(({ castId }) =>
        castId?.hash
          ? {
              hash: bytesToHexString(castId.hash).value,
            }
          : undefined
      ) as any,
    },
    mentions: { connect: body.mentions.map((fid) => ({ fid })) },
    author: { connect: { fid } },
  };

  txs.push(prisma.cast.upsert({ where: { hash }, create: prisma_obj, update: { ...prisma_obj, hash: undefined } }));

  return txs;
}
