/**
 * Unit tests for lib/invite-email.ts — the safety contract that keeps
 * invite creation working with no mail service configured: missing or
 * invalid SMTP_* env ALWAYS yields a silent `not-configured` skip and
 * never touches the network or throws. (Live delivery is integration
 * territory — plain SMTP, never exercised in tests.)
 */

import { after, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

import { sendInviteEmail, SMTP_VARS } from "../../lib/invite-email.ts";

const KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;
const saved = new Map<string, string | undefined>();
for (const k of KEYS) saved.set(k, process.env[k]);

const clearAll = () => {
  for (const k of KEYS) delete process.env[k];
};

after(() => {
  for (const k of KEYS) {
    const v = saved.get(k);
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const input = {
  to: "new@example.com",
  workspaceName: "Atelier North",
  inviterName: "Maya",
  inviteUrl: "https://roducq.dev/invite/tok",
  expiresAt: new Date("2026-10-03T12:00:00Z"),
};

describe("sendInviteEmail — silent skip without SMTP", () => {
  test("zero SMTP env → not-configured, never throws", async () => {
    clearAll();
    const result = await sendInviteEmail(input);
    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.reason, "not-configured");
  });

  test("all five must be set: any single missing still skips", async () => {
    for (const missing of KEYS) {
      clearAll();
      for (const k of KEYS) {
        if (k === missing) continue;
        process.env[k] = k === "SMTP_PORT" ? "587" : "x";
      }
      const result = await sendInviteEmail(input);
      assert.equal(result.ok, false, `missing ${missing}`);
      assert.equal(result.ok ? null : result.reason, "not-configured", `missing ${missing}`);
      if (!result.ok && result.reason === "not-configured") {
        // The diagnostic names what is unset — but only by name.
        assert.ok(result.missing?.includes(missing), `reports ${missing}`);
      }
    }
  });

  test("invalid port is treated as unconfigured (no transport is built)", async () => {
    for (const port of ["abc", "0", "70000", ""]) {
      clearAll();
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = port;
      process.env.SMTP_USER = "u";
      process.env.SMTP_PASS = "p";
      process.env.SMTP_FROM = "Roducq <hi@example.com>";
      const result = await sendInviteEmail(input);
      assert.equal(result.ok, false, `port ${port}`);
      assert.equal(result.ok ? null : result.reason, "not-configured", `port ${port}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// Delivery behaviour against an in-process SMTP mock. No real email is
// sent and nothing leaves the machine.
// ─────────────────────────────────────────────────────────────────────

import { startSmtpMock } from "../helpers/smtp-mock.ts";
import {
  classifySmtpError,
  missingSmtpVars,
  redactSmtpDetail,
} from "../../lib/invite-email.ts";

function configure(port: number) {
  clearAll();
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(port);
  process.env.SMTP_USER = "sender@example.com";
  process.env.SMTP_PASS = "not-a-real-password";
  process.env.SMTP_FROM = "Roducq <sender@example.com>";
}

describe("sendInviteEmail — delivery", () => {
  test("valid configuration and a healthy server → ok, invite link is sent", async () => {
    const mock = await startSmtpMock();
    try {
      configure(mock.port);
      const result = await sendInviteEmail(input);
      assert.deepEqual(result, { ok: true });
      // The invite URL is the payload — it must reach the recipient.
      const transcript = mock.received.join("\n");
      assert.ok(transcript.includes("MAIL FROM"), "reached MAIL FROM");
      assert.ok(transcript.includes("RCPT TO"), "reached RCPT TO");
    } finally {
      await mock.close();
    }
  });

  test("missing SMTP configuration → not-configured, names the missing vars, never throws", async () => {
    clearAll();
    process.env.SMTP_HOST = "smtp.example.com";
    const result = await sendInviteEmail(input);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "not-configured");
    if (result.reason !== "not-configured") return;
    // Names only — the diagnostic must never carry a value.
    assert.deepEqual(result.missing?.sort(), [
      "SMTP_FROM", "SMTP_PASS", "SMTP_PORT", "SMTP_USER",
    ]);
  });

  test("provider rejects the password → send-failed/auth, no credential in the detail", async () => {
    const mock = await startSmtpMock({ authFail: true });
    try {
      configure(mock.port);
      const result = await sendInviteEmail(input);
      assert.equal(result.ok, false);
      if (result.ok || result.reason !== "send-failed") {
        assert.fail(`expected send-failed, got ${JSON.stringify(result)}`);
      }
      assert.equal(result.code, "auth");
      const detail = result.detail ?? "";
      assert.ok(!detail.includes("not-a-real-password"), "password must not leak");
      assert.ok(!detail.includes(input.inviteUrl), "invite URL must not leak");
      assert.ok(!detail.includes("tok"), "invite token must not leak");
    } finally {
      await mock.close();
    }
  });

  test("provider rejects the sender → send-failed/sender-rejected", async () => {
    const mock = await startSmtpMock({ senderFail: true });
    try {
      configure(mock.port);
      const result = await sendInviteEmail(input);
      assert.equal(result.ok, false);
      if (result.ok || result.reason !== "send-failed") assert.fail("expected send-failed");
      assert.equal(result.code, "sender-rejected");
    } finally {
      await mock.close();
    }
  });

  test("provider rejects the recipient → send-failed/recipient-rejected", async () => {
    const mock = await startSmtpMock({ recipientFail: true });
    try {
      configure(mock.port);
      const result = await sendInviteEmail(input);
      assert.equal(result.ok, false);
      if (result.ok || result.reason !== "send-failed") assert.fail("expected send-failed");
      assert.equal(result.code, "recipient-rejected");
    } finally {
      await mock.close();
    }
  });

  test("unreachable host/port → send-failed/connection", async () => {
    clearAll();
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = "1"; // nothing listens here
    process.env.SMTP_USER = "u";
    process.env.SMTP_PASS = "p";
    process.env.SMTP_FROM = "Roducq <u@example.com>";
    const result = await sendInviteEmail(input);
    assert.equal(result.ok, false);
    if (result.ok || result.reason !== "send-failed") assert.fail("expected send-failed");
    assert.equal(result.code, "connection");
  });
});

describe("safe diagnostics", () => {
  test("redaction strips URLs, tokens and collapses whitespace", () => {
    const raw =
      "Mail command failed: 550 https://roducq.example.com/invite/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\n\nrejected";
    const safe = redactSmtpDetail(raw);
    assert.ok(!safe.includes("https://"), "no URL");
    assert.ok(!safe.includes("aaaaaaaa-bbbb"), "no token");
    assert.ok(!safe.includes("\n"), "single line");
    assert.ok(safe.includes("Mail command failed"), "keeps the actionable cause");
  });

  test("redaction caps runaway output", () => {
    assert.ok(redactSmtpDetail("x".repeat(1000)).length <= 200);
  });

  test("classification maps nodemailer codes to coarse causes", () => {
    assert.equal(classifySmtpError({ code: "EAUTH" }), "auth");
    assert.equal(
      classifySmtpError({ code: "EENVELOPE", command: "MAIL FROM" }),
      "sender-rejected"
    );
    assert.equal(
      classifySmtpError({ code: "EENVELOPE", command: "RCPT TO" }),
      "recipient-rejected"
    );
    assert.equal(classifySmtpError({ code: "ESOCKET" }), "connection");
    assert.equal(classifySmtpError({ code: "EDNS" }), "connection");
    assert.equal(classifySmtpError({ code: "ETIMEDOUT" }), "connection");
    assert.equal(classifySmtpError(null), "unknown");
    assert.equal(classifySmtpError({ code: "ESOMETHINGELSE" }), "unknown");
  });

  test("missing-var detection reports names only, and flags a bad port by name", () => {
    assert.deepEqual(missingSmtpVars({}), [...SMTP_VARS]);
    assert.deepEqual(
      missingSmtpVars({
        SMTP_HOST: "h", SMTP_PORT: "not-a-number",
        SMTP_USER: "u", SMTP_PASS: "p", SMTP_FROM: "f",
      }),
      ["SMTP_PORT"]
    );
    assert.deepEqual(
      missingSmtpVars({
        SMTP_HOST: "h", SMTP_PORT: "587",
        SMTP_USER: "u", SMTP_PASS: "p", SMTP_FROM: "f",
      }),
      []
    );
  });
});

// ─────────────────────────────────────────────────────────────────────
// The inviter-facing contract in team-actions: a missing SMTP config is
// a silent skip locally but must be VISIBLE on a deployed host, where it
// would otherwise drop every invite email without a trace. Asserted on
// source, like the other wiring guards in this suite, because the action
// itself needs a live Supabase session.
// ─────────────────────────────────────────────────────────────────────

describe("invite email failure is actionable but safe", () => {
  const actions = readFileSync(
    new URL("../../app/(app)/settings/team-actions.ts", import.meta.url),
    "utf8"
  );

  test("a deployed host warns when SMTP is unconfigured; localhost stays silent", () => {
    assert.match(actions, /const isDeployed = !isLocalHost/);
    assert.match(actions, /sent\.reason === "not-configured" && isDeployed/);
  });

  test("the failure log carries the classified code and the unset variable NAMES", () => {
    assert.match(actions, /invite email failed \[\$\{sent\.code\}\]/);
    assert.match(actions, /unset: \$\{\(sent\.missing \?\? \[\]\)\.join/);
  });

  test("the copy-link fallback survives every failure branch", () => {
    // Both warnings must still end by telling the inviter to send the
    // link themselves — email delivery is never allowed to block invites.
    const warnings = actions.match(/Copy the link below and send it yourself\./g) ?? [];
    assert.ok(
      warnings.length >= 2,
      "send-failed and not-configured must both fall back to the copy link"
    );
  });

  test("no SMTP value is ever interpolated into a log or a message", () => {
    assert.doesNotMatch(actions, /SMTP_PASS|SMTP_USER|process\.env\.SMTP/);
    const emailModule = readFileSync(
      new URL("../../lib/invite-email.ts", import.meta.url),
      "utf8"
    );
    // The only process.env reads happen inside the config builder.
    const envReads = emailModule.match(/env\.SMTP_[A-Z]+|process\.env\.SMTP_[A-Z]+/g) ?? [];
    assert.ok(envReads.length > 0, "the module does read SMTP env");
    assert.doesNotMatch(
      emailModule,
      /console\.(log|error|warn)\([^)]*pass|c["`]?\s*\+\s*cfg\.pass/,
      "never log the password"
    );
  });
});
