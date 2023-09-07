import { ReactionBody } from "@farcaster/hub-nodejs";
import { bytesToHexString } from "../bytesToHexString";
import { reaction_types } from "../../constants";
import prisma from "../../prisma/client";

export function parseReactionAddMessage(body: ReactionBody, hash: string, fid: number, timestamp: Date) {
  let txs: any[] = [];

  const target_hash = body.targetCastId?.hash && bytesToHexString(body.targetCastId.hash).value;
  const target_fid = body.targetCastId?.fid && body.targetCastId.fid;

  const prisma_obj = {
    hash,
    timestamp,
    target_url: body.targetUrl,
    type: reaction_types[body.type],
    cast: target_hash ? { connect: { hash: target_hash! } } : undefined,
    author: { connect: { fid } },
  };

  const fids_to_save = [fid, target_fid].filter((f) => !!f);
  const casts_to_save = [target_hash].filter((f) => !!f);

  txs.push(...fids_to_save.map((fid) => prisma.user.upsert({ where: { fid }, create: { fid }, update: {} })));

  txs.push(
    ...casts_to_save.map((hash) =>
      prisma.cast.upsert({
        where: { hash },
        create: { hash, author: { connect: { fid } } },
        update: { hash, author: { connect: { fid } } },
      })
    )
  );

  txs.push(
    prisma.reaction.upsert({
      where: { hash: prisma_obj.hash },
      create: prisma_obj,
      update: { ...prisma_obj, hash: undefined },
    })
  );

  return txs;
}
