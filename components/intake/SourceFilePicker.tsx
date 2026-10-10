"use client";

/**
 * File intake (Queue item #6) — attach/drop island inside /intake's
 * SourcePanel.
 *
 * Flow: pick or drop a .docx / .pdf / .txt / .md → POST
 * /api/intake/extract → the extracted text APPENDS into the existing
 * paste textarea (never replaces) so the user reviews and edits before
 * Generate. Bytes are parsed in memory and discarded on the server;
 * there is no Storage bucket — the textarea is the only destination.
 *
 * One client pre-flight keeps an obviously-wrong pick off the wire:
 *   - > 5 MB → show the size-cap message, no request.
 * Every other failure (including an encrypted PDF, or a scanned PDF with
 * no text layer) comes back from the endpoint and is shown inline (a
 * toast confirms successes).
 */

import { useRef, useState } from "react";
import { Loader2, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  appendToSource,
  MAX_UPLOAD_BYTES,
  TOO_LARGE_MESSAGE,
  type ExtractSuccessPayload,
} from "@/lib/intake/shared";
import { cn } from "@/lib/utils";

export function SourceFilePicker({
  rawText,
  onChange,
  disabled,
}: {
  /** Current textarea content — appended to, never replaced. */
  rawText: string;
  /** The textarea's own setter from SourcePanel. */
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file || busy || disabled) return;
    setError(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(TOO_LARGE_MESSAGE);
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name || "upload");
      const response = await fetch("/api/intake/extract", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<ExtractSuccessPayload> & { error?: string })
        | null;

      if (!response.ok || !payload || typeof payload.text !== "string") {
        setError(
          payload?.error ??
            `Extraction failed (HTTP ${response.status}). Try pasting the text.`
        );
        return;
      }

      onChange(appendToSource(rawText, payload.text));
      const meta = payload.meta;
      toast(
        meta?.truncated
          ? `Added the first ${meta.chars.toLocaleString()} characters of ${meta.filename} — the file was longer.`
          : `Added ${meta?.chars.toLocaleString() ?? ""} characters from ${meta?.filename ?? "file"}.`
      );
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setBusy(false);
      // Allow picking the same file twice in a row.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-dashed border-border bg-muted/30 px-3.5 py-3",
          dragging && "border-accent bg-accent/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          // Cosmetic filter only — the server sniffs magic bytes, never
          // the extension or declared type.
          accept=".txt,.md,.markdown,.docx,.pdf,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled || busy}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Extracting…
            </>
          ) : (
            <>
              <Paperclip className="h-4 w-4" aria-hidden="true" />
              Add a file
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          or drop one here —{" "}
          <span className="text-text">.docx, .pdf, .txt, .md</span>, up to
          5 MB. The text lands above, appended. Scanned PDFs (no text
          layer) aren&rsquo;t supported — paste the text instead.
        </p>
      </div>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
