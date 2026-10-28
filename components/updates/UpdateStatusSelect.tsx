"use client";

import { useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { updateUpdateStatus } from "@/app/(app)/updates/[id]/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UpdateStatus } from "@/lib/types/update";

const STATUS_OPTIONS: { value: UpdateStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Marked sent" },
];

/** Draft → Sent. Same optimistic-with-rollback pattern as the plan
 *  StatusSelect. */
export function UpdateStatusSelect({
  updateId,
  status,
}: {
  updateId: string;
  status: UpdateStatus;
}) {
  const hintId = useId();
  const [value, setValue] = useState<UpdateStatus>(status);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guard synchronously as well as through render state: two events can
  // arrive before React has painted the pending state.
  const pendingRef = useRef(false);

  async function handleChange(next: string) {
    const nextStatus = next as UpdateStatus;
    if (pendingRef.current || nextStatus === value) return;

    const previous = value;
    pendingRef.current = true;
    setValue(nextStatus); // optimistic
    setPending(true);
    setError(null);

    try {
      const result = await updateUpdateStatus({
        updateId,
        status: nextStatus,
      });

      if (result?.error) {
        setValue(previous); // roll back
        setError(result.error);
      }
    } catch {
      setValue(previous);
      setError("Could not update the status. Please try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {/* A native disabled button loses focus. Keep it focusable and block
            opening/changing it while saving instead of restoring focus later
            (which could steal focus from someone who deliberately moved on). */}
        <Select
          value={value}
          onValueChange={handleChange}
          open={open}
          onOpenChange={(next) => {
            if (!next || !pendingRef.current) setOpen(next);
          }}
        >
          <SelectTrigger aria-label="Update status" aria-describedby={hintId}
            aria-disabled={pending}
            className="h-11 w-[150px] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            onPointerDown={(event) => {
              if (pendingRef.current) event.preventDefault();
            }}
            onKeyDown={(event) => {
              // Still allow Tab/Shift+Tab to leave the control.
              if (pendingRef.current && event.key !== "Tab") event.preventDefault();
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"  aria-hidden="true" />
        )}
      </div>
      <p id={hintId} className="max-w-48 text-xs text-muted-foreground">
        Changing the status does not send this update.
      </p>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </div>
  );
}
