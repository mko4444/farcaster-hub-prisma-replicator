import { VerificationAddEthAddressBody } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import { connectUser } from "../constructs";

export function parseVerificationAddMessage(
  body: VerificationAddEthAddressBody,
  hash: string,
  fid: number,
  timestamp: Date
) {
  const prisma_obj = {
    timestamp,
    hash,
    address: bytesToHexString(body?.address).value,
    eth_signature: bytesToHexString(body?.ethSignature).value,
    block_hash: bytesToHexString(body?.blockHash).value,
    author: connectUser(fid) as any,
  };

  return {
    where: { hash },
    create: prisma_obj,
    update: { ...prisma_obj, hash: undefined },
  };
}
