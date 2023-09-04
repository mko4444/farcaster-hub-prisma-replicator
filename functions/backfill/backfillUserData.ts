import { backfillUserDataByFid } from "./backfillUserDataByFid";
import { getSSLHubRpcClient } from "@farcaster/hub-nodejs";
import { HUB_HOST } from "../../constants";

export async function backfillUserData() {
  const client = await getSSLHubRpcClient(HUB_HOST);
  const info = await client.getInfo({ dbStats: true });
  // number of users to iterate over
  // @ts-ignore
  const numFidEvents = info.value.dbStats?.numFidEvents;
  // construct an array of numbers from 0 to numFidEvents
  const fids = [...Array(numFidEvents).keys()];
  let fid_count = 0;
  for await (const fid of fids) {
    try {
      await backfillUserDataByFid(fid);
      fid_count++;
      continue;
    } catch (err) {
      console.log(err);
      continue;
    }
  }

  return { fids_found: numFidEvents, fids_backfilled: fid_count, status: "ok" };
}
