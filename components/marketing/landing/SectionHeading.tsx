import { cn } from "@/lib/utils";

/**
 * Section heading — eyebrow + a two-part headline.
 *
 * The reference splits every section headline around one accented phrase
 * ("Four jobs Forma takes / off your plate"). `before`/`after` make that
 * split explicit in the content module instead of relying on where the
 * browser happens to wrap, so the accent lands on the same words at every
 * width and the H2 still reads as one sentence to a screen reader.
 */
interface SectionHeadingProps {
  eyebrow: string;
  /** Rendered in ink. */
  before: string;
  /** Rendered in accent ink. */
  after: string;
  intro?: string;
  /** Centred for the reference's full-width bands, left for split bands. */
  align?: "center" | "start";
  /** h2 everywhere except the hero, which owns the page's h1. */
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  before,
  after,
  intro,
  align = "center",
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "max-w-lm-measure",
        centered ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      <p className="text-lm-12 font-lm-semibold uppercase tracking-[0.16em] text-lm-muted-label">
        {eyebrow}
      </p>
      <Tag className="mt-4 font-lm-bold tracking-[-0.02em] text-lm-29 text-lm-ink md:text-lm-54">
        {before} <span className="text-lm-ink-accent">{after}</span>
      </Tag>
      {intro ? (
        <p className="mt-5 text-lm-16 text-lm-ink-soft md:text-lm-18">{intro}</p>
      ) : null}
    </div>
  );
}

/**
 * The uppercase micro-label the reference puts above a card heading
 * ("AUTOMATIONS", "PROJECTS"). Kept separate from SectionHeading because it
 * pairs with a card, not a band.
 */
export function CardLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted-label",
        className
      )}
    >
      {children}
    </p>
  );
}
