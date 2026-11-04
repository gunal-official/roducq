export interface WebhookIngestResult {
  ok: true;
  value: { inserted: boolean; bodySha256: string; state: string };
}
export interface WebhookIngestFailure {
  ok: false;
  code: string;
  retryable?: boolean;
}

const json = (body: Record<string, unknown>, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const MAX_WEBHOOK_BYTES = 512 * 1024;

/** Read the exact request body as text before signature verification/parsing. */
export async function handleBillingWebhook(
  request: Request,
  ingest: (input: {
    rawBody: string;
    signature: string | null;
    eventIdHeader: string | null;
  }) => Promise<WebhookIngestResult | WebhookIngestFailure>,
): Promise<Response> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ error: "Invalid webhook body." }, 400);
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
    return json({ error: "Webhook body is too large." }, 413);
  }

  try {
    const result = await ingest({
      rawBody,
      signature: request.headers.get("x-razorpay-signature"),
      eventIdHeader: request.headers.get("x-razorpay-event-id"),
    });
    if (!result.ok) {
      if (result.code === "invalid_webhook_signature") {
        return json({ error: "Invalid signature." }, 401);
      }
      if (result.code === "invalid_webhook_payload" || result.code === "missing_event_timestamp") {
        return json({ error: "Invalid webhook payload." }, 400);
      }
      return json({ error: "Webhook ingestion failed." }, 500);
    }
    return json({ received: true }, 200);
  } catch {
    return json({ error: "Webhook ingestion failed." }, 500);
  }
}
