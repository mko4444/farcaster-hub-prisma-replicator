import { VerificationRemoveBody } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import { connectUser } from "../constructs";

export function parseVerificationRemoveMessage(
  body: VerificationRemoveBody,
  hash: string,
  fid: number,
  timestamp: Date
) {
  const prisma_obj = {
    timestamp,
    hash,
    deleted_at: timestamp,
    address: bytesToHexString(body?.address).value,
    author: connectUser(fid),
  };

  return {
    where: { hash },
    data: prisma_obj,
  };
}
