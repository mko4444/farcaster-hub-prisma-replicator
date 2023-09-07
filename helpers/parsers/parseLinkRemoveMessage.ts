import { LinkBody } from "@farcaster/hub-nodejs";
import prisma from "../../prisma/client";

export function parseLinkRemoveMessage({ type, targetFid }: LinkBody, hash: string, fid: number, timestamp: Date) {
  const txs: any[] = [];

  const fids_to_save = [fid, targetFid];

  const prisma_obj = {
    hash,
    timestamp,
    deleted_at: timestamp,
    type,
    author: { connect: { fid: fid! } },
    target_user: targetFid ? { connect: { fid: targetFid! } } : undefined,
  };

  txs.push(
    ...fids_to_save.map((fid) => prisma.user.upsert({ where: { fid: fid! }, create: { fid: fid! }, update: {} }))
  );

  txs.push(prisma.link.upsert({ where: { hash: hash! }, create: prisma_obj, update: prisma_obj }));

  return txs;
}
