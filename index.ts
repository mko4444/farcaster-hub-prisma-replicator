import { HUB_HOST, HUB_SSL } from "./constants";
import { PrismaHubReplicator } from "./hubReplicator";
import { log } from "./log";

let replicator: PrismaHubReplicator | undefined;

(async () => {
  replicator = new PrismaHubReplicator(HUB_HOST, HUB_SSL, log);
  replicator.start();
})();

process.on("exit", (code) => {
  console.log(`Exiting process with status code ${code}`);
});
