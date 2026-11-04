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
