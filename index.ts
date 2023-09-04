import { backfillCasts } from "./functions/backfill/backfillCasts";
import { backfillUserData } from "./functions/backfill/backfillUserData";

(async () => {
  //   await backfillCasts();
  await backfillUserData();

  process.exit(0);
})();

process.on("exit", (code) => {
  console.log(`Exiting process with status code ${code}`);
});
