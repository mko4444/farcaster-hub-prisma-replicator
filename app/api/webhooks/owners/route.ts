import { indexAllContracts } from "@/apiClient/indexAllContracts";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = `https://api.simplehash.com/webhook_api/v0/webhook`;
const headers = {
  "X-API-KEY": process.env.SIMPLEHASH_KEY,
};

/**
 * This function re-indexes the owner list of every contract in the database.
 */
export async function PUT() {
  try {
    const result = await indexAllContracts();
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * Handles a webhook event from simplehash
 */
export async function POST({ headers, body }: NextRequest) {
  // need to first verify that the request is valid
  console.log({ headers });
  const webhook_id = headers.get("webhook-id");
  const webhook_timestamp = headers.get("webhook-timestamp");
  const webhook_signature = headers.get("webhook-signature");
  // simplehash webhooks are signed in the format below
  const signed_content = `${webhook_id}.${webhook_timestamp}.${body}`;
  // base64 encode the secret from our env file
  const secret_bytes = Buffer.from(process.env.SIMPLEHASH_SECRET, "base64");
  const computed_signature = createHmac("sha256", secret_bytes).update(signed_content).digest("base64");

  console.log("computed_signature", computed_signature);
  console.log("webhook_signature", webhook_signature);

  if (computed_signature !== webhook_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // if the signature is valid, we can process the webhook
  console.log("signature is valid!");

  return NextResponse.json({ status: "ok" });
}

export async function DELETE() {
  const all_webhooks = await fetch(ENDPOINT, { headers, method: "GET" }).then((r) => r.json());
  let count = 0;

  console.log({ all_webhooks });

  for await (const webhook of all_webhooks) {
    try {
      await fetch(ENDPOINT + "?webhook_id=" + webhook.webhook_id, { method: "DELETE", headers });
      count++;
    } catch (e) {
      console.error(e);
    }
  }

  return NextResponse.json({ status: "ok", count });
}
