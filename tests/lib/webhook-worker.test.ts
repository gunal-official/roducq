import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createRazorpayWebhookWorker,
  drainRazorpayWebhookWork,
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

describe("drainRazorpayWebhookWork", () => {
  it("counts outcomes and stops at the empty queue", async () => {
    const sequence = ["applied", "ignored", "applied", "none"] as const;
    let index = 0;
    const result = await drainRazorpayWebhookWork(async () => ({
      outcome: sequence[index++] ?? "none",
      finalized: true,
    }));
    assert.deepEqual(result, { applied: 2, ignored: 1, failed: 0 });
    assert.equal(index, 4, "must stop as soon as the queue reports empty");
  });

  it("stops on a failure so the lease can expire instead of spinning", async () => {
    let calls = 0;
    const result = await drainRazorpayWebhookWork(async () => {
      calls += 1;
      return { outcome: "failed" as const, finalized: false };
    });
    assert.deepEqual(result, { applied: 0, ignored: 0, failed: 1 });
    assert.equal(calls, 1, "a failure must break the loop, not retry the same row");
  });

  it("survives a thrown worker without losing the earlier counts", async () => {
    let calls = 0;
    const result = await drainRazorpayWebhookWork(async () => {
      calls += 1;
      if (calls === 1) return { outcome: "applied" as const, finalized: true };
      throw new Error("lease lost");
    });
    assert.deepEqual(result, { applied: 1, ignored: 0, failed: 1 });
  });

  it("never exceeds the max iteration budget", async () => {
    let calls = 0;
    await drainRazorpayWebhookWork(async () => {
      calls += 1;
      return { outcome: "applied" as const, finalized: true };
    }, 5);
    assert.equal(calls, 5);
  });
});

describe("webhook ingress drains what it ingests", () => {
  const route = readFileSync(
    new URL("../../app/api/billing/webhook/route.ts", import.meta.url),
    "utf8",
  );

  it("schedules a drain after a successful ingest", () => {
    // The regression this pins: ingestion alone left the queue unprocessed,
    // because the only drain lived behind CRON_SECRET with no scheduler
    // configured. A paid subscription then never activated.
    assert.match(route, /drainRazorpayWebhookWork/);
    assert.match(route, /after\(/);
  });

  it("does not drain when the event was rejected", () => {
    assert.match(route, /response\.status >= 200 && response\.status < 300/);
  });
});
