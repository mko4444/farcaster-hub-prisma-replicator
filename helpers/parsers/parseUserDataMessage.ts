import { UserDataBody } from "@farcaster/hub-nodejs";
import prisma from "../../prisma/client";

export function parseUserDataMessage({ type, value }: UserDataBody, _: string, fid: number, __: Date) {
  const prisma_obj = {
    fid,
    fname: type === 6 ? value : undefined,
    pfp_url: type === 1 ? value : undefined,
    bio: type === 3 ? value : undefined,
    display_name: type === 2 ? value : undefined,
    url: type === 5 ? value : undefined,
  };

  return prisma.user.upsert({
    where: { fid: fid! },
    create: prisma_obj,
    update: { ...prisma_obj, fid: undefined },
  });
}
