"use server";

/**
 * Server actions for /settings (templates). Owner-only — the UI hides
 * these controls from members, and these actions re-check the role
 * themselves as defense in depth; RLS (is_workspace_owner) is the final
 * gate either way.
 *
 * TESTING (local, after the templates migration + seed):
 *   1. Log in as the seeded demo user (owner) → create/edit/delete work.
 *   2. Sign up a second account, re-run seed.sql (it adds other users as
 *      'member') → as that user the controls are hidden; calling these
 *      actions anyway returns "Only workspace owners…".
 */

import { canStartNewRazorpaySubscription } from "@/lib/billing/entitlements";
import { revalidatePath } from "next/cache";

import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { LogoImageError, decodeLogoDataUrl } from "@/lib/pdf/images";
import { recordEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import {
  cancelRazorpaySubscription as cancelRzp,
  createRazorpaySubscription,
  findPlan,
  formatPrice,
  getRazorpayClientConfig,
  getRazorpayPlansConfig,
  getRazorpayServerConfig,
} from "@/lib/razorpay";

export type ActionResult = { error?: string } | undefined;

/** Session + ACTIVE workspace membership (+role) via the Step-16
 *  resolver. Null = not authenticated or no workspace yet. */
async function getMembership() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();

  return {
    supabase,
    membership: context
      ? { workspace_id: context.id, role: context.role }
      : null,
  };
}

const NOT_OWNER = "Only workspace owners can manage templates.";
const RENAME_NOT_OWNER = "Only workspace owners can rename the workspace.";
const DELETE_NOT_OWNER = "Only workspace owners can delete the workspace.";

/**
 * Rename the caller's workspace (post-roadmap item). Owner-only — re-checked
 * here as defense in depth, with the workspaces UPDATE policy
 * (is_workspace_owner) as the final gate. Revalidates the full layout so
 * the sidebar name updates everywhere immediately.
 */
export async function updateWorkspaceName(input: {
  name: string;
}): Promise<ActionResult> {
  const name = input.name?.trim() ?? "";
  if (!name) return { error: "Workspace name can't be empty." };
  if (name.length > 80) return { error: "Keep the name under 80 characters." };

  const { supabase, membership } = await getMembership();
  if (!membership) {
    return { error: "Your session has expired. Please log in again." };
  }
  if (membership.role !== "owner") return { error: RENAME_NOT_OWNER };

  const { error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", membership.workspace_id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout"); // sidebar shows the name on every app page
  return { error: undefined };
}

/**
 * Persist/remove the workspace letterhead image. PNG and JPEG data is
 * bounded and decoded before storage; workspaces' owner-only UPDATE policy
 * remains the database-level authorization gate.
 */
export async function updateWorkspaceLogo(input: {
  logoDataUrl: string | null;
}): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) {
    return { error: "Your session has expired. Please log in again." };
  }
  if (membership.role !== "owner") {
    return { error: "Only workspace owners can manage the workspace logo." };
  }
  if (!input || (input.logoDataUrl !== null && typeof input.logoDataUrl !== "string")) {
    return { error: "Choose a valid PNG or JPEG image." };
  }

  if (input.logoDataUrl !== null) {
    try {
      decodeLogoDataUrl(input.logoDataUrl);
    } catch (error) {
      return {
        error:
          error instanceof LogoImageError
            ? error.message
            : "The logo image could not be decoded.",
      };
    }
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ logo_data_url: input.logoDataUrl })
    .eq("id", membership.workspace_id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { error: undefined };
}

/**
 * Delete the ACTIVE workspace (Step 27 — the escape hatch the Step-26
 * leave arc exposed: a sole owner can neither leave nor, until now,
 * destroy). Owner-only — re-checked here as defense in depth, with the
 * workspaces DELETE policy (is_workspace_owner) as the final gate.
 * EVERYTHING cascades (all workspace_id FKs are on delete cascade; the
 * active pointer is on delete set null) — briefs, proposals, invoices,
 * templates, team access. Irreversible; the UI says so twice.
 */
export async function deleteWorkspaceAction(): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) {
    return { error: "Your session has expired. Please log in again." };
  }
  if (membership.role !== "owner") return { error: DELETE_NOT_OWNER };

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", membership.workspace_id);

  if (error) return { error: error.message };

  // The whole shell changes — next workspace (or /onboarding when none
  // remain) resolves on the revalidated layout render.
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { error: undefined };
}

export async function createTemplate(input: {
  title: string;
  body: string;
}): Promise<ActionResult> {
  if (!input.title?.trim()) return { error: "Title is required." };

  const { supabase, membership } = await getMembership();
  if (!membership) {
    return { error: "Your session has expired. Please log in again." };
  }
  if (membership.role !== "owner") return { error: NOT_OWNER };

  const { data: created, error } = await supabase
    .from("templates")
    .insert({
      workspace_id: membership.workspace_id,
      title: input.title.trim(),
      body: input.body ?? "",
    })
    .select("id, title")
    .single();

  if (error) return { error: error.message };
  if (!created) return { error: "Could not create the template." };

  // The template-created event (suggestions pass 9/10) — recordEvent
  // never throws; a missed row never blocks template creation.
  await recordEvent(supabase, {
    workspace_id: membership.workspace_id,
    event_type: "template.created",
    payload: { template_id: created.id, title: created.title },
  });

  revalidatePath("/settings");
  return { error: undefined };
}

export async function updateTemplate(input: {
  templateId: string;
  title: string;
  body: string;
}): Promise<ActionResult> {
  if (!input.title?.trim()) return { error: "Title is required." };

  const { supabase, membership } = await getMembership();
  if (!membership) {
    return { error: "Your session has expired. Please log in again." };
  }
  if (membership.role !== "owner") return { error: NOT_OWNER };

  const { error } = await supabase
    .from("templates")
    .update({ title: input.title.trim(), body: input.body ?? "" })
    .eq("id", input.templateId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: undefined };
}

export async function deleteTemplate(input: {
  templateId: string;
}): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) {
    return { error: "Your session has expired. Please log in again." };
  }
  if (membership.role !== "owner") return { error: NOT_OWNER };

  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", input.templateId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: undefined };
}

/** Razorpay checkout: owner-only; plan resolved server-side from
 * RAZORPAY_PLANS (browser names only a currency). Returns the subscription
 * id + PUBLIC key id for Checkout.js; entitlement is granted only by
 * /api/razorpay/verify after signature + server-side subscription check.
 * Refuses to run at all unless billing is configured AND in Test Mode
 * (getRazorpayServerConfig's production safety gate). */
export type RazorpayCheckoutResult =
  | { error: string }
  | { subscriptionId: string; keyId: string; currency: string; amount: number };
export async function createRazorpayCheckout(currency: string): Promise<RazorpayCheckoutResult> {
  const { membership } = await getMembership();
  if (!membership) return { error: "Your session has expired. Please log in again." };
  if (membership.role !== "owner") return { error: "Only workspace owners can manage billing." };
  const cfg = getRazorpayServerConfig();
  if (!cfg.ok) return { error: cfg.error };
  // Resolve the PUBLIC checkout key first: a NEXT_PUBLIC_RAZORPAY_KEY_ID that
  // disagrees with the server key would open Checkout against a different
  // Razorpay account. Checked BEFORE anything is created so a misconfigured
  // deploy can't leave an orphaned subscription behind.
  const clientCfg = getRazorpayClientConfig();
  if (!clientCfg.ok) return { error: clientCfg.error };
  const plansConfig = getRazorpayPlansConfig();
  if (!plansConfig.ok) return { error: plansConfig.error };
  const plan = findPlan(plansConfig.plans, currency);
  if (!plan) {
    const available = plansConfig.plans.map((p) => `${formatPrice(p.amount, p.currency)} ${p.currency}`).join(" · ");
    return { error: `Pro is not available in ${currency.toUpperCase()} yet — configured: ${available}.` };
  }
  // Refuse before creating anything at Razorpay if the workspace already has a
  // subscription the database would not replace (prevents orphaned, paid-for
  // subscriptions and double billing with a live legacy Stripe plan).
  const { supabase } = await getMembership();
  const { data: billingRow } = await supabase
    .from("billing_subscriptions")
    .select("provider, status, paid_through")
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();
  const blocked = canStartNewRazorpaySubscription(billingRow, new Date());
  if (blocked) return { error: blocked };
  const created = await createRazorpaySubscription({ keyId: cfg.keyId, keySecret: cfg.keySecret, planId: plan.planId, workspaceId: membership.workspace_id });
  if (!created.ok) return { error: created.error };
  return { subscriptionId: created.subscription.id, keyId: cfg.keyId, currency: plan.currency, amount: plan.amount };
}

/** Cancel the workspace's Razorpay subscription at cycle end (owner-only).
 * Local status flips via the subscription.cancelled webhook. */
export async function cancelRazorpaySubscription(): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) return { error: "Your session has expired. Please log in again." };
  if (membership.role !== "owner") return { error: "Only workspace owners can manage billing." };
  const cfg = getRazorpayServerConfig();
  if (!cfg.ok) return { error: cfg.error };
  const { data: billing } = await supabase.from("billing_subscriptions").select("razorpay_subscription_id").eq("workspace_id", membership.workspace_id).maybeSingle();
  if (!billing?.razorpay_subscription_id) return { error: "No Razorpay subscription to cancel yet — complete checkout first." };
  const result = await cancelRzp({ keyId: cfg.keyId, keySecret: cfg.keySecret, subscriptionId: billing.razorpay_subscription_id, cancelAtCycleEnd: true });
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings");
  return { error: undefined };
}
