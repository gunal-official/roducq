"use client";

/**
 * Interactive task checklist for /plans/:id — unlike the read-only
 * deliverables lists on briefs/proposals, clicking a task flips `checked`
 * and persists immediately via the toggleTask server action.
 *
 * Optimistic UI: the task flips locally on click; if the action returns an
 * error we flip it back and show the message (same rollback pattern as the
 * Step 5 resolve-question dialog). After a successful save the server
 * component re-renders with fresh `tasks`, which we re-sync into state.
 * Toggles are disabled while a save is in flight, because the action is
 * read-modify-write on the whole array — overlapping toggles could race.
 *
 * Phase D: the board groups tasks into what is left and what is done, each
 * row is a 44px target on a lavender surface, and the progress rail reads
 * from the same counts as the rows. Nothing here completes a task on its
 * own — the copy says so, and the only way a task changes is the click.
 */

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { toggleTask } from "@/app/(app)/plans/[id]/actions";
import { WorkProgress } from "@/components/workflow/WorkCard";
import { cn } from "@/lib/utils";
import type { PlanTask } from "@/lib/types/plan";

export function TaskChecklist({
  planId,
  tasks: initialTasks,
  readOnly = false,
}: {
  planId: string;
  tasks: PlanTask[];
  /** Step 29: viewers see tasks read-only (no toggle affordance). */
  readOnly?: boolean;
}) {
  const [tasks, setTasks] = useState<PlanTask[]>(initialTasks);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the server re-renders with fresh data after revalidation
  // (adjust-state-during-render — the endorsed props→state pattern).
  const [prevTasks, setPrevTasks] = useState(initialTasks);
  if (prevTasks !== initialTasks) {
    setPrevTasks(initialTasks);
    setTasks(initialTasks);
  }

  const doneCount = tasks.filter((t) => t.checked).length;
  const openTasks = tasks.filter((t) => !t.checked);
  const finishedTasks = tasks.filter((t) => t.checked);

  async function handleToggle(task: PlanTask) {
    if (pending || readOnly) return;

    setPending(true);
    setError(null);
    // optimistic flip
    setTasks((current) =>
      current.map((t) =>
        t.id === task.id ? { ...t, checked: !t.checked } : t
      )
    );

    const result = await toggleTask({ planId, taskId: task.id });

    setPending(false);
    if (result?.error) {
      // rollback
      setTasks((current) =>
        current.map((t) =>
          t.id === task.id ? { ...t, checked: task.checked } : t
        )
      );
      setError(result.error);
    }
  }

  function TaskRow({ task }: { task: PlanTask }) {
    return (
      <li>
        <button
          type="button"
          onClick={() => handleToggle(task)}
          disabled={pending || readOnly}
          aria-pressed={task.checked}
          className={cn("task-row", task.checked && "task-row-done")}
        >
          <span className={cn("task-tick", task.checked && "task-tick-done")} aria-hidden="true">
            {task.checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
          </span>
          <span className={cn("task-text", task.checked && "task-text-done")}>
            {task.text}
          </span>
          {readOnly && <span className="task-readonly">Read-only</span>}
          {pending && !readOnly && (
            <Loader2 className="task-spin h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          )}
        </button>
      </li>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-board">
        <p className="task-empty">No tasks in this plan.</p>
      </div>
    );
  }

  return (
    <div className="task-board">
      <WorkProgress label="Tasks ticked off" done={doneCount} total={tasks.length} />
      <p className="task-note">
        {readOnly
          ? "You have view access — tasks are ticked off by editors."
          : "Ticking a task saves it straight away. Nothing is marked done for you."}
      </p>

      <section aria-labelledby="tasks-open" className="task-group">
        <h3 id="tasks-open" className="task-group-title">
          To do
          <span className="task-group-count">{openTasks.length}</span>
        </h3>
        {openTasks.length === 0 ? (
          <p className="task-empty-inline">
            Every task in this plan is ticked off.
          </p>
        ) : (
          <ul className="task-list">
            {openTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </section>

      {finishedTasks.length > 0 && (
        <section aria-labelledby="tasks-done" className="task-group">
          <h3 id="tasks-done" className="task-group-title">
            Completed
            <span className="task-group-count">{finishedTasks.length}</span>
          </h3>
          <ul className="task-list">
            {finishedTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p className="task-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
