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
    author: connectUser(fid),
    address_info: {
      connectOrCreate: {
        where: { address: `0x${bytesToHexString(body?.address).value}` },
        create: { address: `0x${bytesToHexString(body?.address).value}` },
      },
    },
  };

  return {
    where: { hash },
    data: prisma_obj,
  };
}
