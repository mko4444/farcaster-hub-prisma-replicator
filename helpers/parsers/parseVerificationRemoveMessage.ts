import { VerificationRemoveBody } from "@farcaster/hub-nodejs";
import prisma from "../../prisma/client";
import { bytesToHexString } from "../bytesToHexString";

export function parseVerificationRemoveMessage(
  body: VerificationRemoveBody,
  hash: string,
  fid: number,
  timestamp: Date
) {
  const txs: any[] = [];

  const prisma_obj = {
    timestamp,
    hash,
    deleted_at: timestamp,
    address: bytesToHexString(body?.address).value,
    author: { connect: { fid } },
  };

  txs.push(prisma.user.upsert({ where: { fid }, create: { fid }, update: {} }));
  txs.push(prisma.verification.update({ where: { hash }, data: prisma_obj }));

  return txs;
}
