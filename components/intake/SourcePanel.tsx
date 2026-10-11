"use client";

/**
 * Left panel of /intake (Phase 3). Renders either:
 *  - "input": textarea + Generate button (the "Paste client text" area), or
 *  - "thread": the pasted source as a read-only message thread (after Generate).
 *
 * Built on the shared SectionCard so the head, the body rhythm and the
 * footer action row match the brief-draft panel opposite it and every
 * other Phase 3 page.
 *
 * How to test: see the comment at the top of app/(app)/intake/page.tsx.
 */

import { ClipboardPaste, Loader2, MessageSquare, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import type { BriefSource } from "@/lib/types/brief";
import { SourceBubbles } from "@/components/intake/SourceBubbles";
import { SourceFilePicker } from "@/components/intake/SourceFilePicker";

export const MIN_SOURCE_CHARS = 20;

export function SourcePanel({
  mode,
  rawText,
  onChange,
  onGenerate,
  generating,
  error,
  aiConfigured,
  source,
  onReset,
}: {
  mode: "input" | "thread";
  rawText: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  generating: boolean;
  error: string | null;
  aiConfigured: boolean;
  source: BriefSource | null;
  onReset: () => void;
}) {
  const canGenerate =
    rawText.trim().length >= MIN_SOURCE_CHARS && !generating;

  if (mode === "thread") {
    return (
      <SectionCard
        icon={MessageSquare}
        title="Source"
        description="Stored verbatim — the original text is never edited."
        tone="muted"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-text"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            New source
          </Button>
        }
        bodyClassName="space-y-3 bg-muted/40 p-5"
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{source?.source_type ?? "manual"}</Badge>
            <span className="text-xs text-muted-foreground">
              {rawText.length.toLocaleString()} chars
            </span>
          </div>
        }
        proof="intake-source-thread"
      >
        <SourceBubbles text={rawText} />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={ClipboardPaste}
      title="Paste client text"
      description="An email, a chat log, or call notes — paste them, or add a .docx / .pdf / .txt / .md file. roducq drafts the brief."
      bodyClassName="flex-1 p-5"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-xs text-muted-foreground",
              rawText.trim().length > 0 &&
                rawText.trim().length < MIN_SOURCE_CHARS &&
                "text-error"
            )}
          >
            {rawText.trim().length.toLocaleString()} chars
          </span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {!aiConfigured && (
              <span className="hidden text-xs text-muted-foreground tab:inline">
                No OPENAI_API_KEY — local parser will draft
              </span>
            )}
            <Button onClick={onGenerate} disabled={!canGenerate}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      }
      proof="intake-source-input"
    >
      <Textarea
        value={rawText}
        onChange={(e) => onChange(e.target.value)}
        disabled={generating}
        placeholder={
          "Paste the client's message here…\n\ne.g. “Hi Maya, great chatting yesterday. We'd love to kick off the rebrand…”"
        }
        className="min-h-[220px] resize-y bg-muted/40 leading-relaxed tab:min-h-[340px]"
      />
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
      <SourceFilePicker
        rawText={rawText}
        onChange={onChange}
        disabled={generating}
      />
    </SectionCard>
  );
}
