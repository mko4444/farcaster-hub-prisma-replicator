import { CastRemoveBody } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import prisma from "../../prisma/client";

export function parseCastRemoveMessage({ targetHash }: CastRemoveBody, _: string, fid: number, timestamp: Date) {
  let txs: any[] = [];

  const prisma_obj = {
    hash: bytesToHexString(targetHash).value,
    timestamp,
    deleted_at: timestamp,
    author: { connect: { fid } },
  };

  txs.push(prisma.user.upsert({ where: { fid }, create: { fid }, update: {} }));

  txs.push(
    prisma.cast.upsert({
      where: { hash: prisma_obj.hash },
      create: prisma_obj,
      update: prisma_obj,
    })
  );

  return txs;
}
