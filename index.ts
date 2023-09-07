import { PrismaHubReplicator } from "./hubReplicator";
import { HUB_HOST, HUB_SSL } from "./constants";
import { log } from "./log";

let replicator: PrismaHubReplicator | undefined;

const shutdown = async () => {
  if (replicator) {
    await replicator.stop();
    await replicator.destroy();
  }
};

process.on("exit", (code) => {
  console.log(`Exiting process with status code ${code}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, (signalName: string) => {
    log.info(`Process received ${signalName}`);
    process.exitCode =
      {
        SIGINT: 130,
        SIGTERM: 143,
      }[signalName] || 1;
    shutdown();
  });
}

(async () => {
  replicator = new PrismaHubReplicator(HUB_HOST, HUB_SSL, log);
  replicator.start();
})();
