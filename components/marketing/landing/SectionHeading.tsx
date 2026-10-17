import { clsx as cn } from "clsx";

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
  /** Optional right-aligned slot when `align="start"`. */
  aside?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  before,
  after,
  intro,
  align = "center",
  as: Tag = "h2",
  aside,
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  const headBlock = (
    <div
      className={cn(
        aside ? "max-w-[44rem]" : "max-w-full",
        centered ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      <p className="text-lm-14 font-lm-semibold text-lm-ink-accent">
        {eyebrow}
      </p>
      <Tag className="mt-3 font-lm-bold tracking-[-0.025em] text-lm-29 text-lm-ink md:text-lm-54">
        {before} <span className="text-lm-ink-accent">{after}</span>
      </Tag>
      {intro ? (
        <p
          className={cn(
            "mt-4 max-w-[36rem] text-lm-16 text-lm-ink-soft md:text-lm-18",
            centered && "mx-auto"
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );

  if (!aside) return headBlock;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      {headBlock}
      <div className="shrink-0">{aside}</div>
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
        "text-lm-12 font-lm-semibold uppercase tracking-[0.16em] text-lm-ink-accent",
        className
      )}
    >
      {children}
    </p>
  );
}
