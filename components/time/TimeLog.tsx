"use client";

/**
 * /time log (Step 18). Pure presentation over the server-fetched rows:
 * day groups (worked_on, desc), per-day totals, today/month summary
 * (computed here — nothing stored), the brief filter, and the
 * create/edit form. Delete is two-step (click → confirm) — the only
 * destructive control in the product.
 *
 * PHASE E LAYOUT CONTRACT (the Forma time workspace):
 *   every width   lavender band (elapsed-time drawing, the real today/
 *                 month totals, the real entry count), then the tinted
 *                 toolbar (brief filter + Log time), then the day groups:
 *                 one muted panel per day, white entry rows inside it.
 *   tablet+       the entry form's fields sit on one row; entry rows put
 *                 the duration and actions on the right.
 * All state, actions and calculations are exactly what they were — only
 * the presentation changed.
 */

import { useMemo, useState } from "react";

import { deleteTimeAction, logTimeAction, updateTimeAction } from "@/app/(app)/time/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, SectionCard } from "@/components/ui/page";
import { WorkBand } from "@/components/workflow/WorkCard";
import { TimeElapsedArt } from "@/components/workflow/FinancialArt";
import { Clock, Pencil, Trash2, Timer } from "lucide-react";
import { cn, formatDuration, localToday } from "@/lib/utils";
import type { BriefOption, TimeEntry } from "@/lib/types/time";

const ALL_BRIEFS = "all";

function dayLabel(dateStr: string): string {
  if (dateStr === localToday()) return "Today";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (dateStr === yesterday) return "Yesterday";
  // "T00:00:00" → local midnight, so the label is timezone-honest.
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateStr}T00:00:00`));
}

interface FormState {
  description: string;
  minutes: string;
  worked_on: string;
  brief_id: string; // "" = general
}

const EMPTY_FORM: FormState = {
  description: "",
  minutes: "",
  worked_on: "",
  brief_id: "",
};

export function TimeLog({
  entries,
  briefs,
}: {
  entries: TimeEntry[];
  briefs: BriefOption[];
}) {
  const [briefFilter, setBriefFilter] = useState(ALL_BRIEFS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const briefTitle = (briefId: string | null) =>
    briefs.find((b) => b.id === briefId)?.title ?? null;

  // entries arrive pre-sorted (worked_on desc, created_at desc) — a
  // single pass builds the groups.
  const groups = useMemo(() => {
    const visible =
      briefFilter === ALL_BRIEFS
        ? entries
        : entries.filter((e) => e.brief_id === briefFilter);
    const out: Array<{ date: string; items: TimeEntry[]; total: number }> =
      [];
    for (const entry of visible) {
      const last = out[out.length - 1];
      if (last && last.date === entry.worked_on) {
        last.items.push(entry);
        last.total += entry.duration_minutes;
      } else {
        out.push({
          date: entry.worked_on,
          items: [entry],
          total: entry.duration_minutes,
        });
      }
    }
    return out;
  }, [entries, briefFilter]);

  const todayTotal = useMemo(
    () =>
      entries
        .filter((e) => e.worked_on === localToday())
        .reduce((sum, e) => sum + e.duration_minutes, 0),
    [entries]
  );
  const monthTotal = useMemo(() => {
    const prefix = localToday().slice(0, 7);
    return entries
      .filter((e) => e.worked_on.startsWith(prefix))
      .reduce((sum, e) => sum + e.duration_minutes, 0);
    }, [entries]
  );

  function openCreate() {
    setEditingId(null);
    setForm({
      description: "",
      minutes: "",
      worked_on: localToday(),
      brief_id: "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(entry: TimeEntry) {
    setEditingId(entry.id);
    setForm({
      description: entry.description,
      minutes: String(entry.duration_minutes),
      worked_on: entry.worked_on,
      brief_id: entry.brief_id ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    const minutes = Number(form.minutes);
    const input = {
      brief_id: form.brief_id || null,
      description: form.description,
      worked_on: form.worked_on,
      duration_minutes: minutes,
    };
    const result = editingId
      ? await updateTimeAction({ id: editingId, ...input })
      : await logTimeAction(input);
    setSaving(false);
    if (result?.error) {
      setFormError(result.error);
      return;
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      // First click arms the confirm; any other interaction disarms it.
      setConfirmDeleteId(id);
      setDeleteError(null);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteTimeAction({ id });
    setDeleting(false);
    if (result?.error) {
      setDeleteError(result.error);
      setConfirmDeleteId(null);
      return;
    }
    setConfirmDeleteId(null);
  }

  return (
    <div>
      <WorkBand
        kicker="Time"
        title="Hours, grouped by the day they happened"
        description="Entries are logged against the day the work was done — never the day they were typed. Start the floating timer from any page, or log an entry by hand here; both write the same rows."
        art={<TimeElapsedArt />}
        stats={[
          { value: formatDuration(todayTotal), label: "today" },
          { value: formatDuration(monthTotal), label: "this month" },
          { value: entries.length, label: "entries" },
        ]}
      />

      <div className="work-toolbar flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={briefFilter}
            onValueChange={(value) => {
              setBriefFilter(value);
              setConfirmDeleteId(null);
            }}
          >
            <SelectTrigger className="w-52" aria-label="Filter by brief">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BRIEFS}>All time</SelectItem>
              {briefs.map((brief) => (
                <SelectItem key={brief.id} value={brief.id}>
                  {brief.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {groups.length === 1
              ? "1 day shown"
              : `${groups.length} days shown`}
          </span>
        </div>
        {!formOpen && (
          <Button onClick={openCreate}>
            <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
            Log time
          </Button>
        )}
      </div>

      {deleteError && (
        <p className="composer-error mb-3" role="alert">
          {deleteError}
        </p>
      )}

      {formOpen && (
        <SectionCard
          icon={Timer}
          title={editingId ? "Edit entry" : "Log time"}
          description={
            editingId
              ? "Every field is editable — the entry moves to the day you pick."
              : "Backdate freely — the entry lands in the day the work happened."
          }
          tone="accent"
          className="mb-6"
        >
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <div className="composer-field">
              <label htmlFor="time-description" className="composer-hint">
                What did you work on?
              </label>
              <Input
                id="time-description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                autoFocus
              />
            </div>
            <div className="grid gap-4 tab:grid-cols-3">
              <div className="composer-field">
                <label htmlFor="time-minutes" className="composer-hint">
                  Minutes
                </label>
                <Input
                  id="time-minutes"
                  type="number"
                  min={1}
                  step={1}
                  value={form.minutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minutes: e.target.value }))
                  }
                />
              </div>
              <div className="composer-field">
                <label htmlFor="time-worked-on" className="composer-hint">
                  Worked on
                </label>
                <Input
                  id="time-worked-on"
                  type="date"
                  value={form.worked_on}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, worked_on: e.target.value }))
                  }
                />
              </div>
              <div className="composer-field">
                <label htmlFor="time-brief" className="composer-hint">
                  Brief (optional)
                </label>
                <Select
                  value={form.brief_id || "general"}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      brief_id: value === "general" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="time-brief">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (no brief)</SelectItem>
                    {briefs.map((brief) => (
                      <SelectItem key={brief.id} value={brief.id}>
                        {brief.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && (
              <p className="composer-error" role="alert">
                {formError}
              </p>
            )}
            <div className="composer-actions">
              <p className="composer-hint">
                Durations are whole minutes; the day totals above update when
                you save.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      {groups.length === 0 ? (
        entries.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="No time logged yet"
            description="Start the timer from the pill at the bottom right of any page, or log an entry by hand — both write the same rows."
            action={
              <Button onClick={openCreate}>
                <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
                Log time
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Timer}
            title="No entries for this brief"
            description="Switch the filter back to “All time” to see every entry."
          />
        )
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.date}
              className="time-day"
              aria-label={`${dayLabel(group.date)} — ${formatDuration(group.total)}`}
            >
              <div className="time-day-head">
                <h2 className="time-day-title">{dayLabel(group.date)}</h2>
                <span className="time-day-total">
                  {formatDuration(group.total)} logged
                </span>
              </div>
              <ul className="time-list">
                {group.items.map((entry) => (
                  <li key={entry.id} className="time-row animate-rise-in">
                    <div className="time-row-body">
                      <p className="time-row-desc">{entry.description}</p>
                      {briefTitle(entry.brief_id) && (
                        <p className="time-row-brief">
                          {briefTitle(entry.brief_id)}
                        </p>
                      )}
                    </div>
                    <span className="time-row-duration">
                      {formatDuration(entry.duration_minutes)}
                    </span>
                    <div className="time-row-actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 min-w-11 gap-1.5 px-2.5 text-muted-foreground"
                        onClick={() => openEdit(entry)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          confirmDeleteId === entry.id
                            ? "destructive"
                            : "ghost"
                        }
                        className={cn(
                          "min-h-11 min-w-11 gap-1.5 px-2.5",
                          confirmDeleteId !== entry.id && "text-muted-foreground"
                        )}
                        disabled={deleting}
                        onClick={() => {
                          if (confirmDeleteId !== entry.id) setDeleteError(null);
                          void handleDelete(entry.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {confirmDeleteId === entry.id
                          ? deleting
                            ? "…"
                            : "Sure?"
                          : "Delete"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
