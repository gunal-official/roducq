"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

export function FooterAccountCta({
  href,
  homepageLabel,
}: {
  href: string;
  homepageLabel: string;
}) {
  const pathname = usePathname();
  const label = pathname === "/" ? homepageLabel : "Get started";

  return (
    <Link
      href={href}
      className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-accent px-4 text-lm-14 font-lm-regular text-lm-on-accent shadow-lm-sm transition-colors duration-200 hover:bg-lm-accent-strong"
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
