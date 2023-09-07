import { bytesToHexString } from "./bytesToHexString";
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
  const convert_hashes = parsed_embeds.map((e) => ({ ...e, hash: bytesToHexString(e.hash).value }));
  const arr = convert_hashes.filter((f) => !!f?.hash && !!f?.fid);

  if (arr.length === 0) return undefined;

  return {
    connectOrCreate: arr.map(({ hash, fid }) => ({
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
  if (!!fids?.find((f) => !f)) return undefined;

  return {
    connectOrCreate: fids.map((fid) => ({
      where: { fid },
      create: { fid },
    })),
  };
}
export function constructConnectUser(fid: number) {
  if (!fid) return undefined;
  return {
    connectOrCreate: {
      where: { fid },
      create: { fid },
    },
  };
}
export function constructCast(cast?: { hash: Uint8Array; fid: number }) {
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
