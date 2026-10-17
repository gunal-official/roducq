import Link from "next/link";
import { Loader2 } from "lucide-react";

import { clsx as cn } from "clsx";

/**
 * Marketing buttons — the reference's two-button vocabulary.
 *
 * WHY THESE ARE NOT components/ui/button.tsx. The shared Button carries the
 * product's 8px control radius, the shadcn variant set and the app's focus
 * ring; every authenticated surface depends on those. The marketing shell
 * needs the reference's proportions instead (5px control radius, a 44px
 * floor, a 48px hero size, brand-hairline borders and the accent-ink press
 * state), so it gets its own pair of primitives rather than a new variant
 * bolted onto a component the whole app shares.
 *
 * BOTH STATES ARE REAL. `disabled` and `loading` are wired through, not
 * decorative: a signup button that cannot show "working…" is the one that
 * gets double-clicked. The focus ring is the shell-wide `:focus-visible`
 * rule in app/(marketing)/landing.css, so every interactive element on the
 * marketing surface focuses identically.
 */

const BASE =
  "inline-flex min-h-11 shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lm-button font-lm-regular text-lm-15 transition-[background-color,border-color,box-shadow,transform,color] duration-200 disabled:pointer-events-none disabled:opacity-50";

const PRIMARY =
  "bg-lm-accent text-lm-on-accent shadow-lm-sm hover:bg-lm-accent-strong active:bg-lm-accent-strong";

const SECONDARY =
  "border border-lm-hairline bg-lm-card text-lm-ink shadow-lm-none hover:border-lm-border hover:shadow-lm-sm active:bg-lm-canvas-alt";

const GHOST =
  "text-lm-ink-accent hover:text-lm-accent-strong hover:underline underline-offset-4";

/** 44px on phones, 48px from the tablet band up — the reference's hero size. */
const SIZE = {
  default: "h-11 px-5 md:h-13 md:px-6.5",
  sm: "h-11 px-4",
} as const;

export type MarketingButtonSize = keyof typeof SIZE;

interface CommonProps {
  size?: MarketingButtonSize;
  className?: string;
}

interface LinkProps extends CommonProps {
  href: string;
  /** Rendered by next/link, so internal navigation stays client-side. */
  children: React.ReactNode;
  ariaLabel?: string;
}

interface ButtonProps extends CommonProps {
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}

/** The filled accent action. One per view, and it is always the way in. */
export function PrimaryLink({
  href,
  children,
  size = "default",
  className,
  ariaLabel,
}: LinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(BASE, PRIMARY, SIZE[size], className)}
    >
      {children}
    </Link>
  );
}

export function PrimaryButton({
  children,
  size = "default",
  className,
  type = "button",
  disabled = false,
  loading = false,
  onClick,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      className={cn(BASE, PRIMARY, SIZE[size], className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}

/** The outlined action. Sits beside a Primary, never replaces one. */
export function SecondaryLink({
  href,
  children,
  size = "default",
  className,
  ariaLabel,
}: LinkProps) {
  const external = href.startsWith("mailto:") || href.startsWith("http");
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(BASE, SECONDARY, SIZE[size], className)}
    >
      {children}
      {external ? <span className="sr-only">(opens your email client)</span> : null}
    </Link>
  );
}

export function SecondaryButton({
  children,
  size = "default",
  className,
  type = "button",
  disabled = false,
  loading = false,
  onClick,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      className={cn(BASE, SECONDARY, SIZE[size], className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}

/**
 * The bare text action ("See all features"). Kept at a 44px tap target even
 * though it reads as inline text, because it is the only way out of some
 * sections on a phone.
 */
export function GhostLink({
  href,
  children,
  className,
  ariaLabel,
}: LinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        GHOST,
        "inline-flex min-h-11 items-center gap-2 font-lm-medium text-lm-15",
        className
      )}
    >
      {children}
    </Link>
  );
}
