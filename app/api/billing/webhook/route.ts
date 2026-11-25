import { after } from "next/server";

import { handleBillingWebhook } from "@/lib/billing/webhook-handler";
import { ingestWebhook } from "@/lib/billing/stage1b-adapters";
import { drainRazorpayWebhookWork } from "@/lib/billing/webhook-worker";

/**
 * Razorpay webhook ingress.
 *
 * Ingestion is intentionally thin: verify the signature, persist the raw event
 * into razorpay_webhook_work (idempotent on body hash) and acknowledge. The
 * apply step is separate because it must run ordered, once, and under a lease.
 *
 * That apply step previously ran only from `/api/cron/webhooks`, which requires
 * CRON_SECRET and an external scheduler. No scheduler was configured, so in
 * production events were queued and never processed — a paid subscription
 * existed at Razorpay while the workspace's plan never activated and the
 * billing page kept answering intent_already_open.
 *
 * `after()` keeps the acknowledgement honest (Razorpay still gets its 200 as
 * soon as the row is durable) while guaranteeing the drain runs in the same
 * invocation. The drain deliberately logs nothing here: the canonical ingress
 * is held to a no-logging invariant so no signature material can ever reach a
 * log line. The cron route stays deployed as the catch-up path for events
 * that arrive when no request is in flight, and because a failed drain leaves
 * the lease to expire for a later sweep.
 */
export async function POST(request: Request) {
  const response = await handleBillingWebhook(request, ingestWebhook);

  // Only drain when the event was accepted (2xx). A rejected signature or a
  // malformed body has nothing durably queued to process.
  if (response.status >= 200 && response.status < 300) {
    try {
      after(async () => {
        try {
          await drainRazorpayWebhookWork();
        } catch {
          // Best effort: the lease expires and the cron sweep retries.
        }
      });
    } catch {
      // `after()` can throw outside a request scope (e.g. direct invocation in
      // tests). Ingestion already succeeded, so never fail the response here.
    }
  }

  return response;
}
