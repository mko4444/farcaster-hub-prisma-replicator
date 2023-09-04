import { getSSLHubRpcClient } from "@farcaster/hub-nodejs";
import { backfillCastsByFid } from "./backfillCastsByFid";
import { HUB_HOST } from "../../constants";

export async function backfillCasts() {
  const client = await getSSLHubRpcClient(HUB_HOST);
  const info = await client.getInfo({ dbStats: true });
  // number of users to iterate over
  // @ts-ignore
  const numFidEvents = info.value.dbStats?.numFidEvents;
  // construct an array of numbers from 0 to numFidEvents
  const fids = [...Array(numFidEvents).keys()];
  let fid_count = 0;
  for await (const fid of fids) {
    const backfill = await backfillCastsByFid(fid);
    console.log(`backfilled ${backfill.cast_count} casts for fid ${fid}`);
    fid_count++;
    continue;
  }

  return { fids_found: numFidEvents, fids_backfilled: fid_count, status: "ok" };
}
