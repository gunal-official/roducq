/** Presentation-only length: a zero bucket is always empty, and a small
 * bucket must not acquire an invented minimum share. Totals/formatting stay
 * in the existing financial data layer. */
export function proportionalWidth(
  value: number,
  total: number,
  track = 100,
): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(total) ||
    !Number.isFinite(track)
  )
    return 0;
  if (value <= 0 || total <= 0 || track <= 0) return 0;
  return Math.min(1, value / total) * track;
}
