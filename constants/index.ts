export const HUB_HOST = process.env["HUB_HOST"] || "nemes.farcaster.xyz:2283";
export const HUB_SSL = (process.env["HUB_SSL"] || "true") === "true";
export const POSTGRES_URL = process.env["POSTGRES_URL"] || "postgres://app:password@localhost:6541/hub";
