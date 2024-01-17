import { UserDataBody } from "@farcaster/hub-nodejs";
import { updateEmbedding } from "../chroma";
import prisma from "../../prisma/client";

export async function parseUserDataMessage(
  { type, value }: UserDataBody,
  _: string,
  fid: number,
  __: Date
) {
  const prisma_obj = {
    fid,
    fname: type === 6 ? value : undefined,
    pfp_url: type === 1 ? value : undefined,
    bio: type === 3 ? value : undefined,
    display_name: type === 2 ? value : undefined,
    url: type === 5 ? value : undefined,
  };
  const defined_prisma_obj = Object.fromEntries(
    Object.entries(prisma_obj).filter(([key, value]) => value !== undefined)
  );

  const user = await prisma.user.findUnique({ where: { fid } });

  const new_embedding_metadata = {
    fname: defined_prisma_obj.fname ?? user?.fname,
    profile_pic: defined_prisma_obj.pfp_url ?? user?.pfp_url,
    fid,
  };

  if (user) {
    const casts = await prisma.cast.findMany({ where: { author: { fid } } });
    const cast_ids = casts.map((cast) => cast.hash);
    cast_ids.forEach(async (cast_id) => {
      const update = await updateEmbedding(cast_id, new_embedding_metadata);
      console.log("Updated embedding for cast", cast_id);
      if (!update) console.log("Error updating embedding for cast", cast_id);
    });
  }

  return {
    where: { fid: fid! },
    create: prisma_obj,
    update: { ...prisma_obj, fid: undefined },
  };
}
