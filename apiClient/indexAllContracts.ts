// import prisma from "@/lib/prisma";

import prisma from "@/lib/prisma";

// add any contracts you want
// call a function that reindexes all contracts

const GET_ENDPOINT = "https://api.simplehash.com/webhook_api/v0/webhook";
const CREATE_ENDPOINT = "https://api.simplehash.com/webhook_api/v0/webhook";
const options = { headers: { "X-API-KEY": process.env.SIMPLEHASH_KEY } };

export async function indexAllContracts() {
  // grab all webhooks for my simplehash account
  const db_webhooks = await prisma.webhook.findMany({});
  const simplehash_webhooks = await fetch(GET_ENDPOINT, options).then((r) => r.json());
  console.log({ db_webhooks, simplehash_webhooks });
  // check for results
  if (!db_webhooks.length) {
    try {
      // if there's no webhook, we need to create one
      // first, we get all the contracts from the database
      const contracts = await prisma.contract.findMany({});
      // then we create a webhook via simplehash's API
      const simplehash_webhook = await fetch(CREATE_ENDPOINT, {
        ...options,
        method: "POST",
        body: JSON.stringify({
          webhook_url: "",
          event_types: ["contract.transfer"],
          contract_addresses: contracts.map((c) => `${c.chain}.${c.address}`),
          webhook_secret: process.env.SIMPLEHASH_SECRET,
        }),
      }).then((r) => r.json());
      console.log(simplehash_webhook);
      // if there's no webhook ID, we throw an error
      if (!simplehash_webhook.webhook_id) throw new Error("No webhook ID returned from SimpleHash");
      // next we save that webhook to our database
      const db_webhook = await prisma.webhook.create({
        data: {
          webhook_id: simplehash_webhook.webhook_id,
          webhook_secret: process.env.SIMPLEHASH_SECRET,
        },
      });
      console.log({ db_webhook });
      return db_webhook;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  return null;

  //   const webhooks = await fetch(endpoint, options).then((r) => r.json());
  //   // if there are no webhooks, we create one
  //   if (!webhooks.length) {
  //   }
}

// /**
//  * How this will work
//  * it accepts a contract address and chain
//  * checks if there is a webhook for the static domain on the repo, creates if not
//  * starts monitoring the contract for transfers in and out
//  * backfills all farcaster data for people in the community
//  *
//  */
// export async function indexContract({ address, chain }: { address: string; chain: string }) {
//   // grab all webhooks for my simplehash account
//   const webhooks = await fetch("/get wallet address...").then((r) => r.json());
//   // if there is no webhook, we need to create it
//   if (!webhooks.length) {
//     // we want to index all the contracts in the database
//     const contracts = await prisma.contract.findMany();
//     // create webhook
//     await fetch("/create webhook...", {
//       method: "POST",
//       body: JSON.stringify({
//         event_types: ["contract.transfer"],
//         contract_addresses: contracts.map((c) => `${c.chain}.${c.address}`),
//       }),
//     });
//   }
//   // check if the contract is present already or not
//   const has_contract = webhooks.some((w) => w.contract_addresses.includes(`${chain}.${address}`));
//   //
// }
