import { connectCast, connectChannel, connectUser } from "../constructs";
import { ReactionBody } from "@farcaster/hub-nodejs";

export function parseRecastRemoveMessage(body: ReactionBody, hash: string, fid: number, timestamp: Date) {
  const prisma_obj = {
    hash,
    timestamp,
    deleted_at: timestamp,
    cast: connectCast(body.targetCastId),
    author: connectUser(fid),
    channel: connectChannel(body.targetUrl),
  };

  return {
    where: { hash },
    create: prisma_obj,
    update: prisma_obj,
  };
}
