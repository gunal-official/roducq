import "server-only";

import {
  claimWebhookWork,
  processWebhookLease,
  type WebhookLease,
} from "./stage1b-adapters.ts";

export type RazorpayWebhookWorkOutcome = "none" | "applied" | "ignored" | "failed";

export interface ProcessWebhookWorkResult {
  outcome: RazorpayWebhookWorkOutcome;
  finalized: boolean;
  workHash?: string;
  resolution?: string;
}

/**
 * Claims one due event using the Stage 1B SKIP LOCKED/lease RPC, verifies the
 * provider subscription in Test Mode, then delegates the ordered atomic apply
 * and lease finalization to the Stage 1B adapter. A failed worker leaves the
 * lease to expire so the queue can safely retry it.
 */
export interface WebhookWorkerDependencies {
  claim(): Promise<{ ok: true; value: WebhookLease[] } | { ok: false; code: string }>;
  process(lease: WebhookLease): Promise<{ ok: true; value: { outcome: string } } | { ok: false; code: string }>;
}

export function createRazorpayWebhookWorker(deps: WebhookWorkerDependencies) {
  return async function processNextRazorpayWebhookWorkItem(): Promise<ProcessWebhookWorkResult> {
    try {
      const claimed = await deps.claim();
      if (!claimed.ok) return { outcome: "failed", finalized: false, resolution: claimed.code };
      const lease: WebhookLease | undefined = claimed.value[0];
      if (!lease) return { outcome: "none", finalized: false };

      const processed = await deps.process(lease);
      if (!processed.ok) {
        return {
          outcome: "failed",
          finalized: false,
          workHash: lease.body_sha256,
          resolution: processed.code,
        };
      }

      const resolution = processed.value.outcome;
      if (resolution === "applied") {
        return { outcome: "applied", finalized: true, workHash: lease.body_sha256, resolution };
      }
      if (["ignored", "stale", "superseded", "rejected"].includes(resolution)) {
        return { outcome: "ignored", finalized: true, workHash: lease.body_sha256, resolution };
      }
      return { outcome: "failed", finalized: true, workHash: lease.body_sha256, resolution };
    } catch {
      return { outcome: "failed", finalized: false, resolution: "worker_error" };
    }
  };
}

const defaultWorker = createRazorpayWebhookWorker({
  claim: () => claimWebhookWork({ limit: 1 }),
  process: (lease) => processWebhookLease(lease),
});

export const processNextRazorpayWebhookWorkItem = defaultWorker;

export interface DrainRazorpayWebhooksResult {
  applied: number;
  ignored: number;
  failed: number;
}

/**
 * Drain due Razorpay webhook work items.
 *
 * `/api/billing/webhook` only *ingests*: it verifies the HMAC, writes a row to
 * razorpay_webhook_work and returns 200. Nothing applies the event until a
 * worker claims and finalizes that row. That drain used to live only in
 * `/api/cron/webhooks`, which requires CRON_SECRET and a scheduler — and with
 * no `crons` entry in vercel.json there was no scheduler, so in production the
 * queue was ingested and never processed. Subscriptions were created at
 * Razorpay while the workspace's plan stayed on free.
 *
 * Draining straight after ingest closes that gap for the common case: a
 * payment that confirms within the request. The cron route remains as the
 * safety net for events that arrive while no request is in flight.
 */
export async function drainRazorpayWebhookWork(
  processNext: () => Promise<ProcessWebhookWorkResult> = processNextRazorpayWebhookWorkItem,
  max = 20,
): Promise<DrainRazorpayWebhooksResult> {
  const result: DrainRazorpayWebhooksResult = { applied: 0, ignored: 0, failed: 0 };
  for (let index = 0; index < max; index += 1) {
    let outcome: ProcessWebhookWorkResult;
    try {
      outcome = await processNext();
    } catch {
      result.failed += 1;
      break;
    }
    if (outcome.outcome === "none") break;
    result[outcome.outcome] += 1;
    // A failure leaves the lease to expire; retrying immediately would spin on
    // the same row and burn the attempt budget.
    if (outcome.outcome === "failed") break;
  }
  return result;
}
