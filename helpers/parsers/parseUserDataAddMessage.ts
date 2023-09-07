import { UserDataBody } from "@farcaster/hub-nodejs";
import prisma from "../../prisma/client";

export function parseUserDataAddMessage({ type, value }: UserDataBody, hash: string, fid: number, timestamp: Date) {
  const txs: any[] = [];

  const prisma_obj = {
    hash,
    timestamp,
    type,
    value,
    author: { connect: { fid } },
  };

  txs.push(prisma.user.upsert({ where: { fid }, create: { fid }, update: {} }));
  txs.push(prisma.userDataMessage.upsert({ where: { hash }, create: prisma_obj, update: prisma_obj }));

  return txs;
}
