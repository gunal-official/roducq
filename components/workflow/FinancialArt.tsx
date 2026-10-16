/**
 * Phase E artwork — original, token-coloured SVG for the financial surfaces
 * (Invoices, Contracts, Time, Reports, Search).
 *
 * Same vocabulary and same rules as ClientWorkArt (Phase D): a lavender
 * plane, a white sheet, a single accent rule; nothing copies the reference
 * site's assets; every path is drawn for RoduCQ's own workflow.
 *
 * The rule for motion is unchanged: **the drawing is complete without any
 * animation**. Each animated element's CSS base state is its final, visible
 * state; keyframes only describe how it arrives. There is no
 * `animation-fill-mode`, so an animation that cannot run (reduced motion, a
 * hidden subtree) costs the movement and nothing else — the drawing stays
 * drawn. Movement is transform/opacity/stroke-dash-offset only.
 *
 * Accessibility:
 *   • decorative drawings are `aria-hidden` and carry no text;
 *   • `ReportSplitArt` is the one *meaningful* Phase E drawing — it renders
 *     the real money split of the workspace's invoices, so it is
 *     `role="img"` with a label generated from the same cents it draws.
 *     No value is invented and no growth is implied: the label lists
 *     exactly what was collected, what is outstanding and what is drafted.
 */

import { cn } from "@/lib/utils";
import { proportionalWidth } from "./chart-geometry";

const ART = "work-art";

/** Draft → sent → paid: an invoice sheet, a connector, a paid seal. */
export function InvoiceFlowArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      aria-hidden="true"
      focusable="false"
      className={cn(ART, "art-invoice", className)}
    >
      {/* The invoice: a sheet with a letterhead band and line items. */}
      <g className="art-sheet">
        <rect
          x="16"
          y="10"
          width="110"
          height="100"
          rx="18"
          className="art-surface"
        />
        <rect
          x="16"
          y="10"
          width="110"
          height="24"
          rx="18"
          className="art-band"
        />
        <rect
          x="16"
          y="28"
          width="110"
          height="6"
          className="art-band-square"
        />
        {/* line items: description rule + amount chip, three rows */}
        <path d="M34 48h46" className="art-rule art-rule-1" />
        <path d="M34 66h58" className="art-rule art-rule-2" />
        <path d="M34 84h38" className="art-rule art-rule-3" />
        <rect x="90" y="42" width="20" height="8" rx="4" className="art-chip" />
        <rect x="98" y="60" width="12" height="8" rx="4" className="art-chip" />
        <rect x="86" y="78" width="24" height="8" rx="4" className="art-chip" />
      </g>

      {/* The connector: one continuous stroke, drawn on arrival. */}
      <path d="M134 60h56" pathLength={1} className="art-connector" />
      <circle cx="156" cy="60" r="8" className="art-node art-node-1" />
      <circle cx="178" cy="60" r="8" className="art-node art-node-2" />

      {/* Payment: a coin with a tick — the terminal state. */}
      <g className="art-paid">
        <circle cx="248" cy="56" r="34" className="art-seal" />
        <path d="M232 56l11 11 21-23" className="art-seal-check" />
      </g>
      {/* A second, quieter coin behind it — money in motion. */}
      <circle cx="284" cy="88" r="18" className="art-dot" />
    </svg>
  );
}

/**
 * The engagement letter: a document sheet, its signature rule, a pen stroke
 * landing as the seal. Decorative — the signing flow beside it carries the
 * real Draft → Sent → Signed stamps.
 */
export function ContractStagesArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      aria-hidden="true"
      focusable="false"
      className={cn(ART, "art-contract", className)}
    >
      {/* Stacked earlier draft, lifted off the plane. */}
      <rect
        x="18"
        y="22"
        width="96"
        height="86"
        rx="16"
        className="art-surface art-lift"
      />
      <path d="M36 44h56M36 62h56M36 80h34" className="art-rule" />

      <path d="M122 60h26" pathLength={1} className="art-connector" />

      {/* The letter: title rule, body rules, then the signature line. */}
      <g className="art-sheet">
        <rect
          x="152"
          y="8"
          width="120"
          height="104"
          rx="18"
          className="art-surface"
        />
        <path d="M170 32h60" className="art-rule art-rule-strong" />
        <path d="M170 52h84" className="art-rule art-rule-1" />
        <path d="M170 68h84" className="art-rule art-rule-2" />
        <path d="M170 84h52" className="art-rule art-rule-3" />
        {/* the signature line, dashed like the sheet it prints on */}
        <path d="M170 98h56" className="art-rule" strokeDasharray="6 6" />
      </g>

      {/* The pen: a nib drawing the signature (the tick). */}
      <g className="art-pen">
        <path d="M258 44l30 -22" className="art-hand" />
        <path d="M288 22l6 10-10 2z" className="art-tail" />
      </g>
      <circle cx="286" cy="70" r="14" className="art-seal" />
      <path d="M279 70l5 5 9-11" className="art-seal-check" />
    </svg>
  );
}

/**
 * Elapsed time: a clock face whose accent arc arrives around the track, the
 * hands settling into place. Decorative — the real today/month totals are
 * rendered as text beside it, computed from the actual entries.
 */
export function TimeElapsedArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      aria-hidden="true"
      focusable="false"
      className={cn(ART, "art-time", className)}
    >
      {/* The track: a full quiet circle. */}
      <circle cx="150" cy="60" r="46" className="art-clock-track" />
      {/* A stylized clock motif, not a live elapsed/progress percentage. */}
      <path
        d="M150 14 a46 46 0 1 1 -32.5 78.6"
        pathLength={1}
        className="art-clock-fill"
      />
      {/* Hands: minute (dark) and hour (accent), settling into place. */}
      <path d="M150 60 L150 26" className="art-hand-minute" />
      <path d="M150 60 L172 72" className="art-hand" />
      <circle cx="150" cy="60" r="6" className="art-node" />

      {/* Ticks: four quiet marks around the face. */}
      <path d="M150 8v6 M202 60h-6 M150 112v-6 M98 60h6" className="art-rule" />

      {/* A logged block beside the clock: a muted sheet with duration rules. */}
      <g className="art-entry">
        <rect
          x="222"
          y="24"
          width="82"
          height="72"
          rx="16"
          className="art-surface"
        />
        <path d="M240 46h46" className="art-rule art-rule-1" />
        <path d="M240 64h46" className="art-rule art-rule-2" />
        <path d="M240 82h28" className="art-rule art-rule-3" />
        <rect
          x="252"
          y="12"
          width="22"
          height="8"
          rx="4"
          className="art-chip"
        />
      </g>
    </svg>
  );
}

/**
 * The real money split — the one meaningful Phase E drawing. Three rails,
 * one per invoice status bucket (collected / outstanding / draft), each
 * rail's fill scaled to that bucket's actual share of the billed total.
 * The label is generated from the same cents, so the drawing cannot drift
 * from the data; with no invoices it degrades to empty rails and says so.
 */
export function ReportSplitArt({
  collectedCents,
  outstandingCents,
  draftCents,
  format,
  className,
}: {
  collectedCents: number;
  outstandingCents: number;
  draftCents: number;
  /** The page's money formatter, so the label matches the visible numbers. */
  format: (cents: number) => string;
  className?: string;
}) {
  const billed =
    Math.max(0, collectedCents) +
    Math.max(0, outstandingCents) +
    Math.max(0, draftCents);
  const rails = [
    { key: "collected", cents: collectedCents, cls: "art-split-success" },
    { key: "outstanding", cents: outstandingCents, cls: "art-split-accent" },
    { key: "draft", cents: draftCents, cls: "art-split-muted" },
  ];
  const label =
    billed === 0
      ? "Invoice money split: no invoices yet — nothing collected, outstanding or drafted."
      : `Invoice money split: ${format(collectedCents)} collected, ${format(
          outstandingCents,
        )} outstanding, ${format(draftCents)} in draft.`;

  return (
    <figure>
      <svg
        viewBox="0 0 320 120"
        role="img"
        focusable="false"
        aria-label={label}
        className={cn(ART, "art-report", className)}
      >
        {rails.map((rail, i) => (
          <g key={rail.key}>
            {/* The quiet track every fill sits in. */}
            <rect
              x="22"
              y={18 + i * 36}
              width="276"
              height="16"
              rx="8"
              className="art-split-track"
            />
            {/* The fill — real share of the billed total, arriving by scale. */}
            <rect
              x="22"
              y={18 + i * 36}
              width={proportionalWidth(rail.cents, billed, 276)}
              height="16"
              rx="8"
              className={rail.cls}
            />
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Collected · {format(collectedCents)}</span>
        <span>Outstanding · {format(outstandingCents)}</span>
        <span>Draft · {format(draftCents)}</span>
      </figcaption>
    </figure>
  );
}

/**
 * The search surface: a magnifier held over stacked sheets, one hit marked.
 * Decorative — the results beside it are the real content.
 */
export function SearchArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      aria-hidden="true"
      focusable="false"
      className={cn(ART, "art-search", className)}
    >
      {/* Two result sheets, the back one lifted. */}
      <rect
        x="34"
        y="20"
        width="104"
        height="82"
        rx="16"
        className="art-surface art-lift"
      />
      <path d="M52 42h60M52 60h60M52 78h38" className="art-rule" />

      <g className="art-sheet">
        <rect
          x="86"
          y="12"
          width="118"
          height="96"
          rx="18"
          className="art-surface"
        />
        <path d="M104 36h70" className="art-rule art-rule-strong" />
        <path d="M104 56h70" className="art-rule art-rule-1" />
        <path d="M104 72h46" className="art-rule art-rule-2" />
        {/* the one hit the query matched */}
        <rect
          x="98"
          y="50"
          width="34"
          height="10"
          rx="5"
          className="art-chip"
        />
      </g>

      {/* The connector from the hit to the lens. */}
      <path d="M204 60h26" pathLength={1} className="art-connector" />
      <circle cx="216" cy="60" r="7" className="art-node art-node-1" />

      {/* The magnifier: lens ring, accent handle. */}
      <circle cx="252" cy="54" r="26" className="art-node" />
      <path d="M271 73 L292 94" className="art-hand" />
    </svg>
  );
}
