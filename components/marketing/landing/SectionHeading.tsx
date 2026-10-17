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
  /**
   * The reference sets two different heading treatments: a 54px/400
   * section heading and a 48px/600 FAQ heading. Both are measured on the
   * live site, so they are two real variants rather than one size guessed
   * twice. See docs/FORMA_FINAL_FIDELITY_AUDIT.md §4.
   */
  variant?: "section" | "faq";
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
  variant = "section",
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
      <p className="text-lm-14 font-lm-semibold leading-lm-label text-lm-ink-accent">
        {eyebrow}
      </p>
      <Tag
        className={cn(
          "mt-3 tracking-[-0.03em] text-lm-ink",
          variant === "faq"
            ? "font-lm-semibold text-lm-32 lg:text-lm-28 xl:text-lm-48"
            : "font-lm-regular text-lm-32 lg:text-lm-34 xl:text-lm-54",
        )}
      >
        {before} <span className="text-lm-ink-accent">{after}</span>
      </Tag>
      {intro ? (
        <p
          className={cn(
            "mt-4 max-w-lm-measure-intro text-lm-16 text-lm-ink-soft md:text-lm-18",
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
        "text-lm-11 font-lm-regular tracking-[0.06em] text-lm-muted-slate",
        className
      )}
    >
      {children}
    </p>
  );
}
