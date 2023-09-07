import { VerificationAddEthAddressBody } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import prisma from "../../prisma/client";

export function parseVerificationAddMessage(
  body: VerificationAddEthAddressBody,
  hash: string,
  fid: number,
  timestamp: Date
) {
  const txs: any[] = [];

  const prisma_obj = {
    timestamp,
    hash,
    address: bytesToHexString(body?.address).value,
    eth_signature: bytesToHexString(body?.ethSignature).value,
    block_hash: bytesToHexString(body?.blockHash).value,
    author: { connect: { fid: fid! } },
  };

  txs.push(prisma.user.upsert({ where: { fid: fid! }, create: { fid: fid! }, update: {} }));
  txs.push(prisma.verification.upsert({ where: { hash: hash! }, create: prisma_obj, update: prisma_obj }));

  return txs;
}
