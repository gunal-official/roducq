import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page";

/** The existing global 404, in the same language as document-unavailable states. */
export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-bg px-4 py-12 text-text"
    >
      <Link
        href="/"
        aria-label="RoduCQ home"
        className="inline-flex min-h-11 items-center gap-2 rounded-control px-2"
      >
        <RoduMark size={28} />
        <Wordmark />
      </Link>
      <EmptyState
        headingAs="h1"
        icon={FileQuestion}
        title="This page isn’t here"
        description="The link may have changed, or the page may no longer be available. Your workspace is still where you left it."
        className="w-full max-w-lg bg-card"
        action={
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        }
      />
    </main>
  );
}
