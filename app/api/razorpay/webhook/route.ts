/**
 * DEPRECATED — retired in favour of the canonical Stage 1B endpoint.
 *
 * This route used to process Razorpay webhooks synchronously through
 * lib/billing/webhook-processor.ts. That was the pre-Stage-1B design: a
 * webhook handler that had to fetch from Razorpay and apply the state
 * change inside the request, with no durable queue in front of it.
 *
 * The canonical path is now POST /api/billing/webhook, which:
 *   - verifies the raw-body HMAC (lib/billing/stage1b-adapters.ingestWebhook),
 *   - durably enqueues the event in ONE atomic RPC
 *     (ingest_razorpay_webhook_work, SECURITY DEFINER, pinned search_path),
 *   - and lets the leased worker drain it (/api/cron/webhooks →
 *     lib/billing/webhook-worker) so a slow Razorpay API call can never
 *     stall or fail the acknowledgement Razorpay needs within its timeout.
 *
 * WHY 410 GONE AND NOT A REDIRECT. Razorpay does not follow 3xx for webhook
 * deliveries, so a redirect would look like a delivery failure and burn the
 * retry budget. 410 is terminal, which is what an operator needs to see in
 * the Razorpay dashboard: it tells them the URL is wrong and they must
 * update it. The body names the replacement explicitly.
 *
 * IMPORTANT: this is a RETIREMENT of a duplicate ingress, not a change to
 * the async pipeline. ingest_razorpay_webhook_work is only ever called from
 * /api/billing/webhook, and its worker is only ever called from
 * /api/cron/webhooks — so no queue producer or consumer is lost here.
 *
 * Both POST and GET answer 410 (Razorpay only POSTs; GET is answered so a
 * human pasting the URL in a browser gets the same explanation instead of
 * a 405).
 */

export const dynamic = "force-dynamic";

const GONE_BODY = { error: "Deprecated. Use /api/billing/webhook" } as const;

/**
 * A plain `Response` is used rather than `NextResponse.json` on purpose: this
 * handler touches nothing from `next/*`, which keeps it importable by the
 * plain `node --test` runner (tests/api/razorpay-webhook-retired.test.ts).
 * Next's route handlers accept a standard Response.
 */
function gone() {
  return new Response(JSON.stringify(GONE_BODY), {
    status: 410,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Never cache a tombstone: if the route is ever revived, no CDN or
      // browser should keep serving 410 from a stale entry.
      "cache-control": "no-store",
    },
  });
}

export async function POST() {
  return gone();
}

export async function GET() {
  return gone();
}
