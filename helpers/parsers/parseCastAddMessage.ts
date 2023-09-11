import { connectCast, connectCasts, connectUser, connectUsers } from "../constructs";
import { CastAddBody } from "@farcaster/hub-nodejs";

export function parseCastAddMessage(body: CastAddBody, hash: string, fid: number, timestamp: Date) {
  const prisma_obj = {
    hash,
    timestamp,
    parent_url: body.parentUrl,
    text: body.text,
    mentions_positions: body.mentionsPositions,
    embedded_urls: body.embeds.map((embed) => embed.url).filter((f) => !!f) as string[],
    parent: connectCast(body.parentCastId),
    embedded_casts: connectCasts(body.embeds.map(({ castId }) => castId) as any[]),
    mentions: connectUsers(body.mentions),
    mention_fids: body.mentions,
    author: connectUser(fid),
  };

  return {
    where: { hash },
    create: prisma_obj,
    update: { ...prisma_obj, hash: undefined },
  };
}
