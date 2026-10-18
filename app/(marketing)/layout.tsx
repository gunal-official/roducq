import "./landing.css";

import { AnnouncementBar } from "@/components/marketing/landing/AnnouncementBar";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MotionProvider } from "@/components/marketing/motion/MotionProvider";

/**
 * Marketing shell: announcement band, shared header and footer around /,
 * /about, /pricing and /vs/[slug]. Auth-ed state is intentionally not
 * detected here — the marketing surface is identical for everyone; Log in /
 * Start free remain the funnel into the app side.
 *
 * `.rdq-marketing` IS THE DESIGN BOUNDARY. It switches on the Forma-referenced
 * token set declared in ./landing.css (see that file for why the tokens are
 * scoped rather than global) and sets the Manrope stack with its Arimo /
 * DM Sans fallbacks. Everything inside — header, footer and every landing
 * band — resolves its colours, radii, type and shadows from those tokens, so
 * the shell and the page cannot drift apart.
 *
 * Dark mode is remapped in the same file: the reference is light-only, but
 * the theme switch is a real feature on this shell, so the token names are
 * re-pointed at the product's plum palette instead of letting a dark app
 * bleed into a lilac design.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `marketing` is retained from the pre-redesign shell: globals.css uses it
  // to bind the legacy accent/ring aliases and the work-sheet variables that
  // /about, /pricing and /vs still read. `rdq-marketing` layers the landing
  // token system on top without replacing them.
  return (
    <MotionProvider>
    <div id="top" className="marketing rdq-marketing flex min-h-dvh flex-col bg-lm-canvas text-lm-ink">
      {/* Progressive enhancement for the scroll reveal: the `.lm-js` marker
          is what enables the hidden-initial state in landing.css, so a
          visitor without JavaScript gets every section fully visible
          instead of a page of opacity-0 bands. Kept inline and tiny so it
          runs before first paint and cannot flash. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('lm-js')",
        }}
      />
      <a
        href="#main"
        className="sr-only min-h-11 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lm-control focus:bg-lm-card focus:px-3 focus:py-2 focus:text-lm-14 focus:font-lm-semibold focus:shadow-lm-md"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
    </MotionProvider>
  );
}
