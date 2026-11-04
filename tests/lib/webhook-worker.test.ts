import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createRazorpayWebhookWorker,
  type WebhookWorkerDependencies,
} from "../../lib/billing/webhook-worker.ts";
import type { WebhookLease } from "../../lib/billing/stage1b-adapters.ts";

const lease: WebhookLease = {
  body_sha256: "a".repeat(64),
  event_id_header: "evt_test",
  event_type: "subscription.charged",
  event_created_at: "2026-11-04T00:00:00.000Z",
  provider_subscription_id: "sub_test",
  claimed_plan_id: "plan_test",
  claimed_status: "active",
  claimed_current_end: "2026-12-04T00:00:00.000Z",
  candidate_intent_id: null,
  candidate_workspace_hint_id: null,
  attempt_count: 1,
  lease_token: "lease-test",
  lease_expires_at: "2026-11-04T00:02:00.000Z",
};

function worker(processResult: { ok: true; value: { outcome: string } } | { ok: false; code: string }, leases: WebhookLease[] = [lease]) {
  const calls: string[] = [];
  const deps: WebhookWorkerDependencies = {
    claim: async () => { calls.push("claim"); return { ok: true, value: leases }; },
    process: async (claimed) => { calls.push(`process:${claimed.lease_token}`); return processResult; },
  };
  return { run: createRazorpayWebhookWorker(deps), calls };
}

describe("processNextRazorpayWebhookWorkItem", () => {
  it("claims one leased item and reports applied after finalization", async () => {
    const { run, calls } = worker({ ok: true, value: { outcome: "applied" } });
    assert.deepEqual(await run(), {
      outcome: "applied", finalized: true, workHash: lease.body_sha256, resolution: "applied",
    });
    assert.deepEqual(calls, ["claim", "process:lease-test"]);
  });

  it("reports ignored terminal outcomes separately from failures", async () => {
    const ignored = worker({ ok: true, value: { outcome: "stale" } });
    assert.equal((await ignored.run()).outcome, "ignored");
    assert.equal((await ignored.run()).finalized, true);

    const failed = worker({ ok: true, value: { outcome: "retryable" } });
    assert.equal((await failed.run()).outcome, "failed");
    assert.equal((await failed.run()).finalized, true);
  });

  it("reports an empty queue and claim/process errors without inventing applied state", async () => {
    const empty = worker({ ok: true, value: { outcome: "applied" } }, []);
    assert.deepEqual(await empty.run(), { outcome: "none", finalized: false });

    const claimFailure = createRazorpayWebhookWorker({
      claim: async () => ({ ok: false, code: "webhook_claim_unavailable" }),
      process: async () => ({ ok: true, value: { outcome: "applied" } }),
    });
    assert.equal((await claimFailure()).outcome, "failed");

    const processFailure = worker({ ok: false, code: "webhook_finalize_failed" });
    assert.equal((await processFailure.run()).finalized, false);
  });
});
