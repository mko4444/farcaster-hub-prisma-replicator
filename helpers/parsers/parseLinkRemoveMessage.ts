import { LinkBody } from "@farcaster/hub-nodejs";
import prisma from "../../prisma/client";

export function parseLinkRemoveMessage({ type, targetFid }: LinkBody, hash: string, fid: number, timestamp: Date) {
  const txs: any[] = [];

  const prisma_obj = {
    hash,
    timestamp,
    deleted_at: timestamp,
    type,
    author: { connect: { fid } },
    target_user: { connect: { fid: targetFid } },
  };

  txs.push(prisma.user.upsert({ where: { fid }, create: { fid }, update: {} }));

  if (targetFid) {
    txs.push(prisma.user.upsert({ where: { fid: targetFid }, create: { fid: targetFid }, update: {} }));
  }

  txs.push(prisma.link.upsert({ where: { hash }, create: prisma_obj, update: { ...prisma_obj, hash: undefined } }));

  return txs;
}
