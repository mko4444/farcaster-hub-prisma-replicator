import { LinkBody } from "@farcaster/hub-nodejs";
import { connectUser } from "../constructs";

export function parseLinkAddMessage({ type, targetFid }: LinkBody, hash: string, fid: number, timestamp: Date) {
  if (!type || !targetFid) throw new Error("Invalid link add message");

  const prisma_obj = {
    hash,
    timestamp,
    type,
    author: connectUser(fid),
    target_user: connectUser(targetFid),
  };

  return {
    where: { hash },
    create: prisma_obj,
    update: prisma_obj,
  };
}
