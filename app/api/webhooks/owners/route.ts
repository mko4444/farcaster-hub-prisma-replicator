import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

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
