import Link from "next/link";
// href="/vs"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/about", label: "About" },
      { href: "/pricing", label: "Pricing" },
      { href: "/vs", label: "Compare" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Sign up" },
    ],
  },
];

/**
 * Shared marketing footer: brand column, route columns, and a one-line
 * tagline. Expanded to match the redesigned marketing surface.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center font-display text-lg font-bold tracking-tight"
            >
              rodu<span className="text-accent">cq</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              A client-work writing studio: intake → briefs → proposals → plans → updates.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {col.title}
              </p>
              <ul className="mt-3 space-y-1">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Limits
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              No e-signature, no payment collection. roducq writes the work; you and your tools handle the rest.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 roducq — client-work writing studio.</p>
          <p>Built on Next.js and Supabase, with row-level security per workspace.</p>
        </div>
      </div>
    </footer>
  );
}
