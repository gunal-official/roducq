"use client";

/**
 * Slack/Notion connect return notice — one-time toast when the browser
 * returns from the provider consent screen via /api/{slack,notion}/callback
 * (?slack=connected / ?slack=error=…, same for notion). Mirrors EmailNotice:
 * fires once per mount (StrictMode safe) and strips the query param so a
 * refresh doesn't re-toast.
 */

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useToast } from "@/components/ui/toast";

const ERROR_COPY: Record<string, string> = {
  canceled: "Provider sign-in was canceled — nothing was connected.",
  not_configured:
    "Connect failed — the provider's client id/secret must be set on the server. See the Integrations card for the exact env.",
  token_key:
    "Connect failed — AUTH_SECRET (or EMAIL_TOKEN_ENCRYPTION_KEY) is not set on the server.",
  service:
    "Connect failed — SUPABASE_SERVICE_ROLE_KEY is not set on the server (the callback uses it to store the connection).",
  state:
    "Connect failed — the security token didn't validate. Check your clock and try again.",
  exchange:
    "Connect failed — the provider didn't return tokens (the code may have expired). Try again.",
  auth: "You need to be signed in to connect an integration.",
  forbidden: "Only the workspace owner can connect an integration.",
};

function IntegrationsNoticeInner() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const slack = searchParams.get("slack");
    const notion = searchParams.get("notion");
    const pair: ["slack" | "notion", string] | null = slack
      ? ["slack", slack]
      : notion
        ? ["notion", notion]
        : null;
    if (!pair) return;
    fired.current = true;
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    const [provider, value] = pair;
    const name = provider === "slack" ? "Slack" : "Notion";
    if (value === "connected") {
      toast(`${name} connected.`);
      return;
    }
    const detail = value.startsWith("error=") ? value.slice(6) : value;
    toast(ERROR_COPY[detail] ?? `${name} connection did not complete — try again.`);
  }, [searchParams, toast]);

  return null;
}

export function IntegrationsNotice() {
  return (
    <Suspense fallback={null}>
      <IntegrationsNoticeInner />
    </Suspense>
  );
}
