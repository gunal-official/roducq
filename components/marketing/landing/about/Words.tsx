/**
 * Per-word masked spans for the /about section headings — the same
 * markup contract as SectionHeading's `Words` (900ms on
 * cubic-bezier(0.16, 1, 0.3, 1), 50ms apart, driven by the parent
 * Reveal's data-visible state; see landing.css `.lm-word`).
 *
 * Duplicated here rather than imported because SectionHeading's
 * before/after accent model does not fit the reference's all-ink
 * /about headings, and the shared component is left untouched. The
 * words stay real text separated by real spaces, so headings still
 * read as one sentence to a screen reader and wrap like text.
 */
const WORD_STAGGER_MS = 50;

export function Words({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          {index > 0 ? " " : null}
          <span
            className="lm-word"
            style={
              {
                "--lm-word-delay": `${index * WORD_STAGGER_MS}ms`,
              } as React.CSSProperties
            }
          >
            <span>{word}</span>
          </span>
        </span>
      ))}
    </>
  );
}
