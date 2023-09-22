import { connectCast, connectCasts, connectChannel, connectUser, connectUsers } from "../constructs";
import { CastAddBody } from "@farcaster/hub-nodejs";

export function parseCastAddMessage(body: CastAddBody, hash: string, fid: number, timestamp: Date) {
  const prisma_obj = {
    hash,
    timestamp,
    text: body.text,
    mentions_positions: body.mentionsPositions,
    embedded_urls: body.embeds.map((embed) => embed.url).filter((f) => !!f),
    parent: connectCast(body.parentCastId),
    embedded_casts: connectCasts(body.embeds.map(({ castId }) => castId) as any[]),
    mentions: connectUsers(body.mentions),
    mention_fids: body.mentions,
    author: connectUser(fid),
    channel: connectChannel(body.parentUrl),
  };

  return {
    where: { hash },
    create: prisma_obj,
    update: prisma_obj,
  };
}
