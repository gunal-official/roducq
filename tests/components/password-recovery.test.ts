/**
 * Source contracts for the password-recovery routes: Forma auth
 * components, neutral messaging, recovery gating, and the "never expose
 * credentials/tokens" rules. Behavioural helpers live in
 * tests/lib/password-recovery.test.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const FORGOT = "app/(auth)/forgot-password/page.tsx";
const RESET = "app/(auth)/reset-password/page.tsx";
const ACTION = "app/(auth)/reset-password/actions.ts";
const CALLBACK = "app/auth/callback/route.ts";

describe("password recovery routes", () => {
  it("creates /forgot-password and /reset-password in the (auth) group", () => {
    assert.ok(existsSync(join(ROOT, FORGOT)));
    assert.ok(existsSync(join(ROOT, RESET)));
    assert.ok(existsSync(join(ROOT, ACTION)));
    assert.ok(existsSync(join(ROOT, "app/auth/recovery/status/route.ts")));
    assert.ok(existsSync(join(ROOT, "app/auth/recovery/claim/route.ts")));
  });

  it("reuses the Forma AuthCard/AuthField shell with 44px+ controls", () => {
    for (const page of [FORGOT, RESET]) {
      const src = read(page);
      assert.match(src, /AuthCard/);
      assert.match(src, /AuthField/);
      assert.match(src, /h-12 w-full/);
      assert.match(src, /min-h-11/);
    }
    // Show/hide toggles come from AuthField's password reveal.
    assert.match(read(RESET), /type="password"/);
    assert.match(read(RESET), /autoComplete="new-password"/);
    assert.match(read(FORGOT), /autoComplete="email"/);
    assert.match(read(RESET), /PASSWORD_REQUIREMENTS/);
  });

  it("links Forgot password? from /login and back to sign-in everywhere", () => {
    const login = read("app/(auth)/login/page.tsx");
    assert.match(login, /href="\/forgot-password"/);
    assert.match(login, /Forgot password\?/);
    assert.match(read(FORGOT), /Back to sign in/);
    assert.match(read(RESET), /Back to sign in/);
    assert.match(read(RESET), /Request another reset link/);
  });

  it("shows the neutral confirmation and never enumerates accounts", () => {
    const forgot = read(FORGOT);
    assert.match(forgot, /NEUTRAL_CONFIRMATION/);
    assert.match(forgot, /requestPasswordReset/);
    assert.match(forgot, /window\.location\.origin/);
    assert.doesNotMatch(forgot, /no account (exists|found)|user not found|isn't registered/i);
  });

  it("only updates the password behind recovery proof (server action)", () => {
    const action = read(ACTION);
    assert.match(action, /"use server"/);
    assert.match(action, /hasRecoveryGrant/);
    assert.match(action, /getUser\(\)/);
    assert.match(action, /updateUser\(\{\s*password/);
    // Grant is consumed on success.
    assert.match(action, /delete\(RECOVERY_COOKIE\)/);
    // The reset page delegates the update to the action.
    assert.match(read(RESET), /updatePasswordAction/);
  });

  it("declares `configured` before the phase initializer that reads it", () => {
    const reset = read(RESET);
    assert.ok(reset.indexOf("const configured") < reset.indexOf("useState<Phase>"));
  });

  it("handles expired links, PASSWORD_RECOVERY, and code exchange", () => {
    const reset = read(RESET);
    assert.match(reset, /parseRecoveryLinkError/);
    assert.match(reset, /PASSWORD_RECOVERY/);
    assert.match(reset, /exchangeCodeForSession/);
    assert.match(reset, /\/auth\/recovery\/status/);
    assert.match(reset, /\/auth\/recovery\/claim/);
    // Recovery material is scrubbed from the address bar.
    assert.match(reset, /history\.replaceState/);
    // Success ends the recovery session and sends the user to sign in.
    assert.match(reset, /signOut\(\)/);
    assert.match(reset, /Password updated/);
  });

  it("callback mints the grant only for recovery exchanges", () => {
    const cb = read(CALLBACK);
    assert.match(cb, /recovery.*===.*"1"|"recovery"\) === "1"/);
    assert.match(cb, /createRecoveryGrantValue/);
    assert.match(cb, /\/reset-password\?error=/);
    assert.match(cb, /exchangeCodeForSession/);
  });

  it("middleware never bounces a recovery session off /reset-password", () => {
    const mw = read("lib/supabase/middleware.ts");
    const authPages = mw.slice(mw.indexOf("AUTH_PAGES"), mw.indexOf("];", mw.indexOf("AUTH_PAGES")));
    assert.match(authPages, /\/forgot-password/);
    assert.doesNotMatch(authPages, /reset-password/);
  });

  it("never exposes service-role keys, passwords, or tokens to logs/browser", () => {
    const files = [
      FORGOT,
      RESET,
      ACTION,
      CALLBACK,
      "app/auth/recovery/status/route.ts",
      "app/auth/recovery/claim/route.ts",
      "lib/auth/password-recovery.ts",
      "lib/auth/recovery-grant.ts",
    ];
    for (const f of files) {
      const src = read(f);
      assert.doesNotMatch(src, /SERVICE_ROLE/, f);
      assert.doesNotMatch(src, /console\.(log|info|warn|error)/, f);
    }
  });
});
