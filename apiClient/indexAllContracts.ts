import prisma from "@/lib/prisma";

export const revalidate = 0;

const ENDPOINT = (id: string) => `https://api.simplehash.com/webhook_api/v0/webhook?webhook_id=${id}`;
const CREATE_ENDPOINT = "https://api.simplehash.com/webhook_api/v0/webhook";
const webhook_url = process.env.SIMPLEHASH_WEBHOOK_URL;
const event_types = ["contract.transfer"];
const headers = { "X-API-KEY": process.env.SIMPLEHASH_KEY };

/**
 * This function indexes the owner list of every contract in the database.
 * Separately, a webhook listens for any contract transfers and updates the database.
 * Note: this function should be called after each change to the contracts table.
 * Note: this function should also be called when the indexer starts up, and possibly on a schedule.
 */
export async function indexAllContracts() {
  // make sure the webhook is updated
  await updateWebhook();

  // get all contracts from the database
  const contracts = await prisma.contract.findMany({});

  // iterate over all contracts and index them
  for await (const { address, chain } of contracts) {
    console.log("indexing contract", address);
    // grab all owners for the contract
    const all_owners = await indexContract({ address, chain });
    // save all owners to the database
    console.log("Found", all_owners.length, "owners for contract", address);
    try {
      const contract = await prisma.contract.update({
        where: { address_chain: { address, chain } },
        data: {
          owners: {
            set: [],
            connectOrCreate: all_owners.map((address) => ({ where: { address }, create: { address } })),
          },
        },
        include: { _count: { select: { owners: true } } },
      });
      console.log("Contract updated:", contract);
    } catch (e) {
      console.error(e);
    }
  }

  return { status: "ok" };
}

async function indexContract({ address, chain }: { address: string; chain: string }) {
  let next = "";
  let all_owners = [];

  while (next !== null) {
    const url = `https://api.simplehash.com/api/v0/nfts/owners/${chain}/${address}${next ? `?cursor=${next}` : ""}`;
    const { owners, next_cursor } = await fetch(url, { headers }).then((r) => r.json());
    all_owners.push(...owners.map(({ owner_address }) => owner_address.toLowerCase()));
    next = next_cursor;
  }

  return all_owners;
}

async function updateWebhook() {
  // grab all webhooks for my simplehash account
  const db_webhooks = await prisma.webhook.findMany({});
  // then get all the contracts from the database
  const contracts = await prisma.contract.findMany({});
  // create a list of contract addresses
  const contract_addresses = contracts.map((c) => `${c.chain}.${c.address.toLowerCase()}`);
  // if there's no webhook in the db, we create one. Otherwise update the existing one.

  if (!db_webhooks.length) {
    try {
      console.log("creating webhook");
      const simplehash_webhook = await fetch(CREATE_ENDPOINT, {
        headers: { ...headers, accept: "application/json", "content-type": "application/json" },
        method: "POST",
        body: JSON.stringify({ webhook_url, event_types, contract_addresses }),
      }).then((r) => r.json());
      // if there's no webhook ID, we throw an error
      if (!simplehash_webhook.webhook_id) throw new Error("No webhook ID returned from SimpleHash");
      // next we save that webhook to our database
      const { webhook_id, webhook_secret } = simplehash_webhook;
      const db_webhook = await prisma.webhook.create({ data: { webhook_id, webhook_secret, webhook_url } });
      return db_webhook;
    } catch (e) {
      console.error(e);
      throw new Error("Error creating webhook");
    }
  } else {
    // use the first db entry to get the webhook from simplehash
    const found_webhook = await fetch(ENDPOINT(db_webhooks[0].webhook_id), { headers, method: "GET" }).then((r) =>
      r.json()
    );

    // if there's no webhook ID, we throw an error
    if (!found_webhook?.webhook_id) throw new Error("No webhook ID returned from SimpleHash");
    const found_addresses = found_webhook.contract_addresses.map((addr) => addr.toLowerCase());

    // check if the two contract address lists are the same
    const contract_bool =
      found_addresses.every((addr) => contract_addresses.includes(addr)) &&
      found_addresses.length === contract_addresses.length;
    const url_bool = found_webhook.webhook_url === db_webhooks[0].webhook_url;

    // if they aren't, we need to update the webhook
    if (!contract_bool || !url_bool) {
      const remove_contract_addresses = found_addresses.filter((addr) => !contract_addresses.includes(addr));
      const add_contract_addresses = contract_addresses.filter((addr) => !found_addresses.includes(addr));

      const new_webhook = await fetch(ENDPOINT(db_webhooks[0].webhook_id), {
        headers: { ...headers, accept: "application/json", "content-type": "application/json" },
        method: "PATCH",
        body: JSON.stringify({
          webhook_url: db_webhooks[0].webhook_url,
          webhook_id: found_webhook.webhook_id,
          add_contract_addresses,
          remove_contract_addresses,
        }),
      })
        .then((r) => r.json())
        .then((r) => {
          console.log("__output:", r);
          return r;
        });

      console.log(`Webhook updated:`, new_webhook);

      return new_webhook;
    } else {
      console.log(`Webhook is up to date`, found_webhook);

      return found_webhook;
    }
  }
}
