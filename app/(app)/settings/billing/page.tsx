import { redirect } from "next/navigation";
import { CalendarClock, CreditCard, Users } from "lucide-react";

import { ChangePlanDialog } from "@/components/billing/change-plan-dialog";
import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canInviteMember, effectiveSeatPlan, type SeatBillingRecord } from "@/lib/billing/seat-limits";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function paymentLabel(status: string | null | undefined): string {
  if (!status) return "Not started";
  const labels: Record<string, string> = {
    active: "Active",
    created: "Payment pending",
    authenticated: "Payment pending",
    pending: "Payment pending",
    past_due: "Payment past due",
    halted: "Payment halted",
    paused: "Paused",
    canceled: "Canceled",
    completed: "Completed",
    expired: "Expired",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function planLabel(plan: string): string {
  return plan === "team" ? "Team"
    : plan === "studio" ? "Studio"
      : plan === "starter" ? "Starter"
        : "Free";
}

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const [{ data: { user } }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getWorkspaceContext(),
  ]);
  if (!user) redirect("/login");
  if (!workspace) redirect("/onboarding");

  const [{ data: billingData }, seats] = await Promise.all([
    supabase
      .from("billing_subscriptions")
      .select("plan_name, status, paid_through, currency, amount")
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    canInviteMember(workspace.id),
  ]);

  const billing = billingData as (SeatBillingRecord & {
    status?: string | null;
    paid_through?: string | null;
    currency?: string | null;
    amount?: number | null;
  }) | null;
  const effective = effectiveSeatPlan(billing);
  const seatRatio = effective.limit > 0 ? Math.min(100, (seats.currentCount / effective.limit) * 100) : 0;
  const isOverLimit = seats.currentCount > seats.limit;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <RoduMark solid size={42} title="roducq" />
          <div>
            <div className="flex items-center gap-2">
              <Wordmark />
              <span aria-hidden="true" className="text-muted-foreground">/</span>
              <span className="text-sm font-medium text-muted-foreground">Billing</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Manage billing for {workspace.name}</p>
          </div>
        </div>
        {workspace.role === "owner" && (
          <ChangePlanDialog workspaceName={workspace.name} userEmail={user.email ?? ""} />
        )}
      </header>

      <section aria-labelledby="current-plan-title" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Current plan</p>
              <CardTitle id="current-plan-title" className="text-2xl">{planLabel(effective.plan)}</CardTitle>
            </div>
            <Badge variant={billing?.status === "active" ? "success" : billing?.status ? "warning" : "secondary"}>
              {paymentLabel(billing?.status)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 size-4 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment status</p>
                  <p className="mt-1 text-sm font-semibold text-text">{paymentLabel(billing?.status)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 size-4 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid through</p>
                  <p className="mt-1 text-sm font-semibold text-text">{formatDate(billing?.paid_through)}</p>
                </div>
              </div>
            </div>
            {billing?.currency && billing.amount != null && (
              <p className="text-xs text-muted-foreground">
                Current billing record: {billing.currency} {Number(billing.amount).toFixed(2)} per billing period.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-accent" aria-hidden="true" /> Workspace seats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-2xl font-bold tracking-tight text-text">
                {seats.currentCount}<span className="px-1 text-base font-medium text-muted-foreground">/</span>{seats.limit}
              </p>
              <p className="text-sm text-muted-foreground">occupied</p>
            </div>
            <div
              role="progressbar"
              aria-label="Occupied seats"
              aria-valuemin={0}
              aria-valuemax={seats.limit}
              aria-valuenow={Math.min(seats.currentCount, seats.limit)}
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={`h-full rounded-full transition-all ${isOverLimit ? "bg-destructive" : "bg-accent"}`}
                style={{ width: `${seatRatio}%` }}
              />
            </div>
            <p className={`mt-3 text-sm ${isOverLimit ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              {isOverLimit
                ? "This workspace is over its current seat limit. Existing members remain; new invitations are paused."
                : "Active members and live pending invitations both reserve a seat."}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-accent/20 bg-accent-soft/30">
        <CardContent className="flex flex-col gap-3 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Plan changes take effect after Razorpay confirms the payment. Live Mode is currently disabled.</p>
          {workspace.role !== "owner" && <span className="font-medium">Only workspace owners can change billing.</span>}
        </CardContent>
      </Card>
    </div>
  );
}
