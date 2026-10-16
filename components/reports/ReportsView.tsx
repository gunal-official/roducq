/**
 * Presentation for /reports (Step 20). Pure — no client state, no
 * handlers, no island: the whole page renders server-side from the
 * computed Report (D4: fixed windows, no picker). "Charts" are pure-CSS
 * bar widths (no chart dependency).
 *
 * PHASE E: the report is a Forma financial surface — it opens with the
 * money-split band (the one meaningful Phase E drawing: three rails
 * scaled to the real collected/outstanding/draft cents, labelled from
 * the same numbers), then one SectionCard per area. The by-brief chart
 * animates its fill in on arrival (transform-only, reduced-motion safe)
 * and keeps every value as visible text, so nothing depends on colour
 * or animation to be read.
 */

import {
  ChartNoAxesColumn,
  CircleDollarSign,
  FileSignature,
  Timer,
} from "lucide-react";

import { SectionCard } from "@/components/ui/page";
import { ReportSplitArt } from "@/components/workflow/FinancialArt";
import { WorkBand } from "@/components/workflow/WorkCard";
import { formatDuration, formatMoney } from "@/lib/utils";
import type { Report } from "@/lib/reports";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="report-stat">
      <span className="report-stat-label">
        {label}
        {hint && <span className="report-stat-hint">{hint}</span>}
      </span>
      <span className="report-stat-value">{value}</span>
    </div>
  );
}

function MoneySection({ report }: { report: Report }) {
  const { money } = report;
  const anyInvoices =
    money.draft_count + money.sent_count + money.paid_count + money.void_count;
  return (
    <SectionCard
      icon={CircleDollarSign}
      title="Money"
      tone="accent"
      description="Collected, outstanding and drafted — computed live from the invoices."
    >
      <div className="space-y-3">
        {anyInvoices === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <>
            <Stat
              label="Collected"
              value={formatMoney(money.collected_cents)}
              hint={`${money.paid_count} paid`}
            />
            <Stat
              label="Outstanding"
              value={formatMoney(money.outstanding_cents)}
              hint={`${money.sent_count} sent`}
            />
            <Stat
              label="Draft"
              value={formatMoney(money.draft_cents)}
              hint={`${money.draft_count} draft`}
            />
            {money.void_count > 0 && (
              <p className="text-xs text-muted-foreground">
                {money.void_count} voided invoice{money.void_count > 1 ? "s" : ""}{" "}
                excluded from all totals.
              </p>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}

function TimeSection({ report }: { report: Report }) {
  const { time } = report;
  const maxMinutes = time.by_brief.reduce(
    (max, bar) => Math.max(max, bar.minutes),
    0
  );
  return (
    <SectionCard
      icon={Timer}
      title="Time"
      description="Today, this month and all time — plus this month by brief."
    >
      <div className="space-y-3">
        <Stat label="Today" value={formatDuration(time.today_minutes)} />
        <Stat
          label="This month"
          value={formatDuration(time.month_minutes)}
        />
        <Stat
          label="All time"
          value={formatDuration(time.all_minutes)}
        />

        {time.by_brief.length > 0 && (
          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              This month, by brief
            </h3>
            {/* Every bar carries its label and value as text; the rail is
                decoration for those numbers, so it carries no role. */}
            <div className="report-chart">
              {time.by_brief.map((bar) => (
                <div key={bar.brief_id ?? "general"} className="report-chart-row">
                  <div className="report-chart-head">
                    <span className="report-chart-title">{bar.title}</span>
                    <span className="report-chart-value">
                      {formatDuration(bar.minutes)}
                    </span>
                  </div>
                  <div
                    className="report-chart-rail"
                    aria-hidden="true"
                  >
                    <span
                      className="report-chart-fill"
                      style={{
                        width: `${
                          maxMinutes > 0
                            ? Math.max(2, Math.round((bar.minutes / maxMinutes) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ContractsSection({ report }: { report: Report }) {
  const { contracts } = report;
  const total =
    contracts.draft_count +
    contracts.sent_count +
    contracts.signed_count +
    contracts.void_count;
  return (
    <SectionCard
      icon={FileSignature}
      title="Contracts"
      description="The engagement lifecycle, plus the expiry watch."
    >
      <div className="space-y-3">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No contracts yet.</p>
        ) : (
          <>
            <Stat
              label="Signed"
              value={String(contracts.signed_count)}
            />
            <Stat
              label="Sent"
              value={String(contracts.sent_count)}
            />
            <Stat
              label="Draft"
              value={String(contracts.draft_count)}
            />
            {contracts.void_count > 0 && (
              <Stat label="Void" value={String(contracts.void_count)} />
            )}
            <div className="space-y-3 border-t border-border pt-3">
              <Stat
                label="Expiring within 30 days"
                value={String(contracts.expiring_soon_count)}
              />
              <Stat
                label="Expired"
                value={String(contracts.expired_count)}
              />
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}

export function ReportsView({ report }: { report: Report }) {
  const { money, time, contracts } = report;
  const signedTotal =
    contracts.draft_count +
    contracts.sent_count +
    contracts.signed_count +
    contracts.void_count;

  return (
    <div>
      <WorkBand
        kicker="Reports"
        title="The workspace rollup, computed live"
        description="Money, hours and agreements — every number below is computed from your rows at render time, nothing is stored that can drift, and no window is adjustable: these are the standing windows (today, this month, all time)."
        art={
          <ReportSplitArt
            collectedCents={money.collected_cents}
            outstandingCents={money.outstanding_cents}
            draftCents={money.draft_cents}
            format={formatMoney}
          />
        }
        stats={[
          { value: formatMoney(money.collected_cents), label: "collected" },
          { value: formatDuration(time.month_minutes), label: "hours this month" },
          { value: signedTotal, label: "contracts" },
        ]}
      />

      <div className="grid items-start gap-6 tab:grid-cols-2 desk:grid-cols-3">
        <MoneySection report={report} />
        <TimeSection report={report} />
        <ContractsSection report={report} />
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <ChartNoAxesColumn className="h-4 w-4" aria-hidden="true" />
        Fixed windows by design (D4) — there is no date picker to widen or
        narrow, so two people in the workspace always see the same report.
      </p>
    </div>
  );
}
