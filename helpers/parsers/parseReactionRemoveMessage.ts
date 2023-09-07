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
    author: { connect: { fid: fid! } },
  };

  const fids_to_save = [fid, target_fid].filter((f) => !!f);
  const hashes_to_save = [target_hash].filter((f) => !!f);

  txs.push(
    ...fids_to_save.map((fid) => prisma.user.upsert({ where: { fid: fid! }, create: { fid: fid! }, update: {} }))
  );

  txs.push(
    ...hashes_to_save.map((hash) =>
      prisma.cast.upsert({
        where: { hash: hash! },
        create: { hash: hash!, author: { connect: { fid: fid! } } },
        update: { hash: hash!, author: { connect: { fid: fid! } } },
      })
    )
  );

  txs.push(
    prisma.reaction.upsert({
      where: { hash: prisma_obj.hash },
      create: prisma_obj,
      update: prisma_obj,
    })
  );

  return txs;
}
