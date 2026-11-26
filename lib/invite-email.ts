/**
 * Invite email delivery (Step 23, revised — plain SMTP via nodemailer;
 * the original Resend version was replaced at the user's direction: no
 * third-party email API, just the project owner's own mail account).
 *
 * The Team card's invites are emailed when SMTP is configured; copy-link
 * stays as the fallback:
 *
 *   - any of the SMTP_* env vars unset → the send is skipped. Local
 *     development is copy-link only and stays quiet; the caller makes
 *     this VISIBLE on a deployed host, where otherwise every invite
 *     would silently lose its email;
 *   - send fails → the invite row still exists (it was created first);
 *     the caller surfaces a warning with a copy link.
 *
 * Failures are classified into a coarse, secret-free `code` and a
 * redacted `detail`, so an operator can tell a wrong password from a
 * blocked port without a credential, invite URL or token ever reaching
 * a log. See docs/invite-email-setup.md.
 *
 * Delivery can never block or undo invite creation — email is a best
 * effort on top of a durable row.
 *
 * Env (all five must be set for any email to go out):
 *   SMTP_HOST  — SMTP server hostname (e.g. smtp.gmail.com);
 *   SMTP_PORT  — 465 (implicit TLS) or 587 (STARTTLS); the TLS mode is
 *                derived from the port, no separate flag;
 *   SMTP_USER  — auth username (the full address, e.g. you@gmail.com);
 *   SMTP_PASS  — auth password (Gmail: an APP PASSWORD — regular
 *                passwords are rejected by Google for SMTP);
 *   SMTP_FROM  — sender shown to recipients (e.g.
 *                "Roducq <invites@yourdomain.com>").
 *
 * This module imports NO next/ stuff — the caller (server action)
 * resolves the site URL from request headers and passes it in, which is
 * also what keeps it testable against a local SMTP server.
 */

import nodemailer from "nodemailer";

import { FONT_STACKS, RADIUS_CONTROL, TOKENS } from "./design-tokens.ts";

/** Email clients have no reliable dark-mode contract, so they use the exact
 * light palette and type stacks shared with the app and PDF exports. */
const EMAIL = {
  ink: TOKENS.text,
  accent: TOKENS.purple,
  onAccent: "#ffffff",
  secondary: TOKENS.secondaryText,
  footer: TOKENS.neutral,
} as const;

export type InviteEmailResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not-configured";
      /** Variable NAMES that are set-but-unusable. Never values. */
      missing?: string[];
    }
  | {
      ok: false;
      reason: "send-failed";
      /** Coarse, secret-free cause. Safe to log and to branch on. */
      code: SmtpFailureCode;
      /** Redacted one-line summary — no credentials, URLs or tokens. */
      detail?: string;
    };

/**
 * Coarse SMTP failure classes. These exist so an operator reading the
 * server log can tell "wrong password" from "port blocked" without ever
 * seeing a credential: the raw server banner is never propagated.
 */
export type SmtpFailureCode =
  | "auth"              // 535 — username/password rejected (Gmail: needs an App Password)
  | "sender-rejected"   // 553 — SMTP_FROM not allowed to send for this account
  | "recipient-rejected"// 550 — the invitee's address was refused
  | "connection"        // DNS, refused, TLS, timeout — the host/port never worked
  | "unknown";

const DEFAULT_FROM_NAME = "Roducq";

/** All five are required before any email is attempted. */
export const SMTP_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;

/**
 * Bounded, deliberately short. nodemailer's own defaults are a 2 minute
 * connect timeout and a 10 minute socket timeout — longer than a
 * serverless function is allowed to live, so a blocked port turns into a
 * hung request instead of a logged failure. Razorpay and webhook calls in
 * this repo are bounded the same way.
 */
const TIMEOUTS = {
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
} as const;

type SmtpConfig = { host: string; port: number; user: string; pass: string; from: string };

/** Names only — never values. Used for diagnostics and the setup docs. */
export function missingSmtpVars(env: Record<string, string | undefined> = process.env): string[] {
  const missing = SMTP_VARS.filter((k) => !env[k]);
  const portRaw = env.SMTP_PORT;
  // Present but not a usable port: report the name, not the value.
  if (portRaw) {
    const port = Number(portRaw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push("SMTP_PORT");
  }
  return missing;
}

function readConfig(env: Record<string, string | undefined> = process.env): SmtpConfig | null {
  if (missingSmtpVars(env).length > 0) return null;
  return {
    host: env.SMTP_HOST as string,
    port: Number(env.SMTP_PORT),
    user: env.SMTP_USER as string,
    pass: env.SMTP_PASS as string,
    from: env.SMTP_FROM as string,
  };
}

/**
 * Strip anything that must never reach a log: URLs (an invite URL is a
 * bearer credential), UUIDs (invite tokens), and long opaque strings.
 */
export function redactSmtpDetail(message: string): string {
  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Map a nodemailer error to a coarse cause. Never returns the banner. */
export function classifySmtpError(error: unknown): SmtpFailureCode {
  const e = error as { code?: string; command?: string } | null;
  const code = typeof e?.code === "string" ? e.code : "";
  if (code === "EAUTH") return "auth";
  if (code === "EENVELOPE") {
    return e?.command === "MAIL FROM" ? "sender-rejected" : "recipient-rejected";
  }
  if (
    code === "ESOCKET" ||
    code === "EDNS" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH"
  ) {
    return "connection";
  }
  return "unknown";
}

export async function sendInviteEmail(input: {
  to: string;
  workspaceName: string;
  inviterName: string | null;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<InviteEmailResult> {
  const cfg = readConfig();
  if (!cfg) return { ok: false, reason: "not-configured", missing: missingSmtpVars() };

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    // 465 = implicit TLS; 587 (and anything else) = STARTTLS.
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    ...TIMEOUTS,
  });

  const who = input.inviterName ? `${input.inviterName} ` : "";
  const subject = `You're invited to ${input.workspaceName} on Roducq`;
  const expires = input.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const text = [
    `${who}invited you to join ${input.workspaceName} on Roducq as a member.`,
    "",
    `Open the invite (it expires ${expires}):`,
    input.inviteUrl,
    "",
    "Already have an account? Sign in first, then open the link.",
    "",
    `— ${DEFAULT_FROM_NAME}`,
  ].join("\n");

  const html = `
    <div style="font-family:${FONT_STACKS.body};max-width:480px;margin:0 auto;padding:24px 16px;color:${EMAIL.ink};">
      <p style="font-size:15px;line-height:1.6;">${who}invited you to join
        <strong>${input.workspaceName}</strong> on Roducq as a member.</p>
      <p style="padding:16px 0;">
        <a href="${input.inviteUrl}"
           style="display:inline-block;background:${EMAIL.accent};color:${EMAIL.onAccent};text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:${RADIUS_CONTROL};">
          Open the invite
        </a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:${EMAIL.secondary};">
        The link expires ${expires}. Already have an account? Sign in
        first, then open the link.
      </p>
      <p style="font-size:12px;color:${EMAIL.footer};margin-top:24px;">${DEFAULT_FROM_NAME}</p>
    </div>
  `.trim();

  try {
    await transporter.sendMail({
      from: cfg.from,
      to: input.to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (e) {
    // Classified and redacted at the boundary: callers get a cause they
    // can act on, and no credential, invite URL or token can reach a log.
    return {
      ok: false,
      reason: "send-failed",
      code: classifySmtpError(e),
      detail: redactSmtpDetail(e instanceof Error ? e.message : String(e)),
    };
  } finally {
    await transporter.close();
  }
}
