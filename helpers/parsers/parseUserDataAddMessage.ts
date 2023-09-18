import { UserDataBody } from "@farcaster/hub-nodejs";
import { connectUser } from "../constructs";

export function parseUserDataAddMessage({ type, value }: UserDataBody, hash: string, fid: number, timestamp: Date) {
  const prisma_obj = {
    hash,
    timestamp,
    type,
    value,
    author: connectUser(fid),
  };

  return {
    where: { hash },
    create: prisma_obj,
    update: prisma_obj,
  };
}
