import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

/**
 * Marketing shell: shared header/footer around /, /about, /pricing and
 * /vs/[slug]. Auth-ed state is intentionally not detected here — the
 * marketing surface is identical for everyone; Log in / Sign up remain
 * the funnel into the appside.
 *
 * Marketing and authenticated routes share the Forma palette and
 * self-hosted Manrope stack; the marketing class keeps the brand accent
 * explicit at this boundary for compatibility with the existing site styles.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing flex min-h-dvh flex-col bg-bg font-manrope">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
