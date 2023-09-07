import { ReactionBody } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import { reaction_types } from "../../constants";
import prisma from "../../prisma/client";

export function parseReactionRemoveMessage(body: ReactionBody, hash: string, fid: number, timestamp: Date) {
  let txs: any[] = [];

  const target_hash = body.targetCastId && bytesToHexString(body.targetCastId.hash).value;
  const target_fid = body.targetCastId && body.targetCastId.fid;

  const prisma_obj = {
    hash,
    timestamp,
    deleted_at: timestamp,
    target_url: body.targetUrl,
    type: reaction_types[body.type],
    cast: target_hash ? { connect: { hash: target_hash! } } : undefined,
    author: { connect: { fid } },
  };

  txs.push(prisma.user.upsert({ where: { fid }, create: { fid }, update: {} }));

  if (typeof target_fid === "number") {
    txs.push(prisma.user.upsert({ where: { fid: target_fid }, create: { fid: target_fid }, update: {} }));
  }

  if (target_hash) {
    txs.push(
      prisma.cast.upsert({
        where: { hash: target_hash },
        create: { hash: target_hash, author: { connect: { fid: target_fid } } },
        update: {},
      })
    );
  }

  txs.push(
    prisma.reaction.upsert({
      where: { hash },
      create: prisma_obj,
      update: { ...prisma_obj, hash: undefined },
    })
  );

  return txs;
}
