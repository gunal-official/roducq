export type BillableSeatPlan = "free" | "starter" | "team" | "studio";

export interface SeatBillingRecord {
  plan_name?: string | null;
  status?: string | null;
  paid_through?: string | null;
}

export interface EffectiveSeatPlan {
  plan: BillableSeatPlan;
  limit: number;
}

export interface CanInviteMemberResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
}

const PLAN_LIMITS: Record<BillableSeatPlan, number> = {
  free: 1,
  starter: 1,
  team: 5,
  studio: 15,
};

/** Fixed limits are intentionally independent of browser-supplied values. */
export function seatLimitForPlan(plan: string | null | undefined): number {
  return plan === "team" ? PLAN_LIMITS.team
    : plan === "studio" ? PLAN_LIMITS.studio
      : PLAN_LIMITS.free;
}

/**
 * A paid seat tier is effective only while its billing record is active, or
 * canceled with verified paid time remaining. Missing/stale payment dates and
 * all other states fail closed to the Free seat cap.
 */
export function effectiveSeatPlan(
  billing: SeatBillingRecord | null | undefined,
  now: Date = new Date(),
): EffectiveSeatPlan {
  const plan = billing?.plan_name;
  const status = billing?.status;
  const paidThrough = billing?.paid_through ? new Date(billing.paid_through) : null;
  const hasPaidTime = paidThrough !== null
    && !Number.isNaN(paidThrough.getTime())
    && paidThrough.getTime() > now.getTime();

  if (hasPaidTime && (status === "active" || status === "canceled")) {
    if (plan === "team" || plan === "studio" || plan === "starter") {
      return { plan, limit: PLAN_LIMITS[plan] };
    }
  }
  return { plan: "free", limit: PLAN_LIMITS.free };
}

export function calculateSeatAvailability(
  memberCount: number,
  pendingInviteCount: number,
  effectivePlan: EffectiveSeatPlan,
): CanInviteMemberResult {
  const currentCount = Math.max(0, memberCount) + Math.max(0, pendingInviteCount);
  return {
    allowed: currentCount < effectivePlan.limit,
    currentCount,
    limit: effectivePlan.limit,
  };
}
