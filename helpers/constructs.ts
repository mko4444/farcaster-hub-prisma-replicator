import { bytesToHexString } from "@farcaster/hub-nodejs";
import { ReactionType } from "@prisma/client";

export function constructParent(hash?: string, fid?: number) {
  if (!hash || !fid) return undefined;
  return {
    connectOrCreate: {
      where: { hash },
      create: {
        hash,
        author: {
          connectOrCreate: {
            where: { fid },
            create: { fid },
          },
        },
      },
    },
  };
}
export function constructEmbeddedCasts(embeds: any) {
  const parsed_embeds = embeds.map((c) => c.castId)?.filter((f) => !!f);

  if (!parsed_embeds?.[0]) return undefined;
  // @ts-ignore
  const convert_hashes = parsed_embeds.map((e) => ({ ...e, hash: bytesToHexString(e.hash).value }));

  return {
    connectOrCreate: convert_hashes.map(({ hash, fid }) => ({
      where: { hash },
      create: {
        hash,
        author: {
          connectOrCreate: {
            where: { fid },
            create: { fid },
          },
        },
      },
    })),
  };
}
export function constructMentions(fids: number[]) {
  if (!fids?.[0]) return undefined;
  return {
    connectOrCreate: fids.map((fid) => ({
      where: { fid },
      create: { fid },
    })),
  };
}
export function constructConnectUser(fid: number) {
  return {
    connectOrCreate: {
      where: { fid },
      create: { fid },
    },
  };
}
export function constructCast(cast?: { hash: Uint8Array; fid: number }) {
  // @ts-ignore
  const hash = cast?.hash ? bytesToHexString(cast?.hash).value : undefined;
  const fid = cast?.fid;

  if (!hash || !fid) return undefined;

  return {
    connectOrCreate: {
      where: { hash },
      create: {
        hash,
        author: {
          connectOrCreate: {
            where: { fid },
            create: { fid },
          },
        },
      },
    },
  };
}
export function constructReactionType(type: number): ReactionType {
  if (type === 1) return "REACTION_TYPE_LIKE";
  if (type === 2) return "REACTION_TYPE_RECAST";
  return "REACTION_TYPE_NONE";
}
