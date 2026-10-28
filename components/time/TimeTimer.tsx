"use client";

/**
 * The floating time timer (Step 18, D1 + D4) — mounted in the (app)
 * layout so it is visible on EVERY app page.
 *
 * The timer is EPHEMERAL CLIENT STATE (localStorage, survives refresh
 * and browser restart): while running it is just {startedAt, label} —
 * elapsed time is computed from the timestamp, so nothing drifts and
 * there is no stuck-timer cleanup. No server row exists while it runs;
 * Stop opens the stop form with the elapsed minutes prefilled, and Save
 * (logTimeAction) is the only write. Discard throws the session away.
 *
 * KNOWN LIMITATION (v1): one timer per browser — a second tab that
 * starts a new timer overwrites the stored one.
 */

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Square, Timer, X } from "lucide-react";

import { logTimeAction } from "@/app/(app)/time/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localToday } from "@/lib/utils";
import type { BriefOption } from "@/lib/types/time";

const STORAGE_KEY = "roducq.timer.v1";
const GENERAL = "general";
const NARROW_TIMER_QUERY = "(max-width: 1023.98px)";

// The stop form is modal only on phone/tablet. Subscribe to breakpoint
// changes so resizing an open form never leaves a hidden focus trap behind.
function subscribeToNarrowTimer(onChange: () => void) {
  const media = window.matchMedia(NARROW_TIMER_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function isNarrowTimer() {
  return window.matchMedia(NARROW_TIMER_QUERY).matches;
}
function serverIsNarrowTimer() {
  return false;
}

interface StoredTimer {
  startedAt: number;
  label: string;
}

type Phase = "idle" | "running" | "stop";

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export function TimeTimer({ briefs }: { briefs: BriefOption[] }) {
  const router = useRouter();
  const narrow = useSyncExternalStore(subscribeToNarrowTimer, isNarrowTimer, serverIsNarrowTimer);
  const stopTriggerRef = useRef<HTMLButtonElement>(null);
  const startTriggerRef = useRef<HTMLButtonElement>(null);
  const stopInputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [stored, setStored] = useState<StoredTimer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [draftDescription, setDraftDescription] = useState("");
  const [minutes, setMinutes] = useState("");
  const [workedOn, setWorkedOn] = useState("");
  const [briefId, setBriefId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate once after mount. The stored startedAt is the source of
  // truth (elapsed = now - startedAt), so a refresh mid-run resumes
  // exactly where it left off.
  useEffect(() => {
    // Deferred one tick (timer callback, not effect body): keeps the
    // hydration path free of synchronous setState while preserving the
    // startedAt-as-source-of-truth resume semantics.
    const t = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as StoredTimer;
        if (
          typeof parsed.startedAt === "number" &&
          parsed.startedAt <= Date.now()
        ) {
          setStored(parsed);
          setPhase("running");
        }
      } catch {
        // Corrupted storage → start fresh; nothing to clean up server-side.
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Tick once per second, only while running.
  useEffect(() => {
    if (phase !== "running") return;
    // now() is lazily seeded at mount (elapsed renders correctly at once);
    // only the interval callback mutates state after that.
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  function persist(next: StoredTimer | null) {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  function start() {
    const s: StoredTimer = { startedAt: Date.now(), label: "" };
    persist(s);
    setStored(s);
    setNow(Date.now());
    setPhase("running");
  }

  function setLabel(label: string) {
    setStored((prev) => {
      if (!prev) return prev;
      const next = { ...prev, label };
      persist(next);
      return next;
    });
  }

  function elapsedSeconds(): number {
    if (!stored) return 0;
    return Math.max(0, Math.floor((now - stored.startedAt) / 1000));
  }

  function openStopForm() {
    if (!stored) return;
    // The running label stays untouched until this form is saved.
    setDraftDescription(stored.label);
    setMinutes(String(Math.max(1, Math.round(elapsedSeconds() / 60))));
    setWorkedOn(localToday());
    setBriefId("");
    setError(null);
    setPhase("stop");
  }

  function dismissStopForm() {
    setDraftDescription(stored?.label ?? "");
    setPhase("running");
  }

  function discard() {
    persist(null);
    setStored(null);
    setPhase("idle");
  }

  async function save() {
    if (!stored) return;
    setPending(true);
    setError(null);
    const result = await logTimeAction({
      brief_id: briefId || null,
      description: draftDescription,
      worked_on: workedOn,
      duration_minutes: Number(minutes),
    });
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    persist(null);
    setStored(null);
    setPhase("idle");
    router.refresh();
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        ref={startTriggerRef}
        onClick={start}
        className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom,0px))] right-5 z-50 tab:bottom-5 flex min-h-11 min-w-11 max-w-[calc(100vw-2.5rem)] items-center gap-2 rounded-control border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-md transition-colors hover:bg-muted print:hidden"
      >
        <Timer className="h-4 w-4 text-accent" />
        Start timer
      </button>
    );
  }

  const runningTray = (
    <div className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom,0px))] right-5 z-50 tab:bottom-5 flex max-w-[calc(100vw-2.5rem)] items-center gap-2 rounded-surface border border-border bg-card p-1.5 pr-2.5 shadow-md print:hidden">
      <span className="shrink-0 pl-2 text-sm font-semibold tabular-nums text-text">
        {formatElapsed(elapsedSeconds())}
      </span>
      <input
        value={stored?.label ?? ""}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="What are you working on?"
        aria-label="What are you working on?"
        className="h-11 w-28 min-w-0 rounded-control bg-transparent text-sm text-text placeholder:text-muted-foreground focus:outline-none sm:w-48"
      />
      <Button size="sm" className="h-11 shrink-0 gap-1.5" ref={stopTriggerRef}
        onClick={openStopForm} aria-haspopup={narrow ? "dialog" : undefined}
        aria-expanded={narrow ? phase === "stop" : undefined}>
        <Square className="h-4 w-4" />
        Stop
      </Button>
      <button
        type="button"
        onClick={discard}
        title="Discard this session"
        aria-label="Discard this session"
        className="min-h-11 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-text"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  // The action also returns general server errors; those remain an alert.
  // Its three field-validation messages can additionally name the field.
  const descriptionInvalid = error === "Description is required.";
  const minutesInvalid = error === "Duration must be a whole number of minutes (at least 1).";
  const dateInvalid = error === "Pick a valid date.";
  const stopFields = (
    <>
      <Input
        ref={stopInputRef}
        value={draftDescription}
        onChange={(e) => setDraftDescription(e.target.value)}
        placeholder="What did you work on?"
        aria-label="What did you work on?"
        aria-invalid={descriptionInvalid || undefined}
        aria-describedby={descriptionInvalid ? errorId : undefined}
        className="h-11"
        autoFocus
      />
      <div className="mt-3 flex items-center gap-2">
        <Input
          type="number"
          min={1}
          step={1}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="h-11 w-24 max-[359px]:w-20"
          aria-label="Minutes"
          aria-invalid={minutesInvalid || undefined}
          aria-describedby={minutesInvalid ? errorId : undefined}
        />
        <Input
          type="date"
          value={workedOn}
          onChange={(e) => setWorkedOn(e.target.value)}
          aria-label="Worked on"
          aria-invalid={dateInvalid || undefined}
          aria-describedby={dateInvalid ? errorId : undefined}
          className="h-11 min-w-0 flex-1"
        />
      </div>
      <div className="mt-2">
        <Select
          value={briefId || GENERAL}
          onValueChange={(value) =>
            setBriefId(value === GENERAL ? "" : value)
          }
        >
          <SelectTrigger className="" aria-label="Brief">
            <SelectValue />
          </SelectTrigger>
          {/* The nested picker must appear above the modal scrim. */}
          <SelectContent className={narrow ? "z-[90]" : undefined}>
            <SelectItem value={GENERAL}>General (no brief)</SelectItem>
            {briefs.map((brief) => (
              <SelectItem key={brief.id} value={brief.id}>
                {brief.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={dismissStopForm}
          disabled={pending}
        >
          Keep running
        </Button>
        <Button size="sm" onClick={() => void save()} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );

  if (!narrow) {
    // Desktop retains its existing non-modal floating stop form.
    if (phase === "running") return runningTray;
    return (
      <div className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom,0px))] right-5 z-50 tab:bottom-5 w-[min(20rem,calc(100vw-2.5rem))] rounded-surface border border-border bg-card p-4 shadow-lg print:hidden">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Timer className="h-4 w-4 text-accent" />
          Log this session
        </p>
        {stopFields}
      </div>
    );
  }

  return (
    <Dialog.Root
      open={phase === "stop"}
      onOpenChange={(open) => {
        // Escape, the close button, and the scrim all mean Keep running.
        // Do not dismiss while a save is already in flight.
        if (!open && !pending) dismissStopForm();
      }}
    >
      {/* Keep the original Stop trigger mounted underneath the modal so
          closing can return keyboard focus to the actual invoking control. */}
      {runningTray}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] forma-scrim backdrop-blur-[3px] print:hidden" />
        <Dialog.Content
          aria-modal="true"
          className="fixed left-1/2 top-1/2 z-[80] max-h-[calc(100dvh_-_2rem_-_env(safe-area-inset-top,0px)_-_env(safe-area-inset-bottom,0px))] w-[min(20rem,calc(100vw-2.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-surface border border-border bg-card p-4 shadow-lg print:hidden"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            stopInputRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const focusTarget = () => stopTriggerRef.current ?? startTriggerRef.current ?? stopInputRef.current;
            const target = focusTarget();
            if (target?.isConnected) target.focus();
            else requestAnimationFrame(() => focusTarget()?.focus());
          }}
          onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (pending) event.preventDefault(); }}
        >
          <Dialog.Title className="mb-3 flex min-h-11 items-center gap-2 pr-10 text-sm font-semibold">
            <Timer className="h-4 w-4 text-accent" />
            Log this session
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            The timer keeps running until you save or discard it. Close this form to keep running.
          </Dialog.Description>
          <Dialog.Close asChild>
            <button type="button" aria-label="Close timer form" disabled={pending}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-control text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </Dialog.Close>
          {stopFields}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
