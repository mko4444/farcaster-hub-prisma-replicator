import { connectCast, connectUser } from "../constructs";
import { ReactionBody } from "@farcaster/hub-nodejs";
import { reaction_types } from "../../constants";

export function parseReactionAddMessage(body: ReactionBody, hash: string, fid: number, timestamp: Date) {
  const prisma_obj = {
    hash,
    timestamp,
    target_url: body.targetUrl,
    type: reaction_types[body.type],
    cast: connectCast(body.targetCastId),
    author: connectUser(fid),
  };

  return {
    where: { hash },
    create: prisma_obj,
    update: { ...prisma_obj, hash: undefined },
  };
}
