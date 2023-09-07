import { ReactionType } from "@prisma/client";
import os from "node:os";

export const HUB_HOST = process.env["HUB_HOST"] || "nemes.farcaster.xyz:2283";
export const HUB_SSL = (process.env["HUB_SSL"] || "true") === "true";
export const POSTGRES_URL = process.env["DATABASE_URL"] || "postgres://app:password@localhost:6541/hub";
export const MAX_JOB_CONCURRENCY = Number(process.env["MAX_CONCURRENCY"]) || os.cpus().length;
export const MAX_PAGE_SIZE = 20;

export const reaction_types: { [key: number]: ReactionType } = {
  0: "REACTION_TYPE_NONE",
  1: "REACTION_TYPE_LIKE",
  2: "REACTION_TYPE_RECAST",
};
