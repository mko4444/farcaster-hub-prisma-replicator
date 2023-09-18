import { CastRemoveBody } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import { connectUser } from "../constructs";

export function parseCastRemoveMessage({ targetHash }: CastRemoveBody, _: string, fid: number, timestamp: Date) {
  const prisma_obj = {
    hash: bytesToHexString(targetHash).value,
    timestamp,
    deleted_at: timestamp,
    author: connectUser(fid),
  };

  return {
    where: { hash: prisma_obj.hash },
    create: prisma_obj,
    update: prisma_obj,
  };
}
