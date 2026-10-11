"use client";

/**
 * /intake orchestrator: paste text → Generate (server action) → edit the
 * draft → Save brief (per-field RPC updates, logged in edit history).
 *
 * How to test: see the comment at the top of app/(app)/intake/page.tsx.
 */

import { useState } from "react";

import {
  generateBriefFromSource,
  saveBriefEdits,
} from "@/app/(app)/intake/actions";
import { BriefForm, type BriefDraftFields } from "@/components/intake/BriefForm";
import { SourcePanel } from "@/components/intake/SourcePanel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { PenLine, RotateCcw } from "lucide-react";
import type { BriefQuestion, BriefSource } from "@/lib/types/brief";
import type { GeneratedBriefBundle } from "@/app/(app)/intake/actions";
import type { EditableBriefField } from "@/lib/types/brief";

type Phase = "input" | "generating" | "preview";

function bundleToDraft(bundle: GeneratedBriefBundle): BriefDraftFields {
  return {
    title: bundle.brief.title,
    clientName: bundle.brief.client_name ?? "",
    objective: bundle.brief.objective ?? "",
    budgetTimeline: bundle.brief.budget_timeline ?? "",
    deliverables: bundle.brief.deliverables,
  };
}

export function IntakeClient({ aiConfigured }: { aiConfigured: boolean }) {
  const [phase, setPhase] = useState<Phase>("input");
  const [rawText, setRawText] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [briefId, setBriefId] = useState<string | null>(null);
  const [source, setSource] = useState<BriefSource | null>(null);
  const [questions, setQuestions] = useState<BriefQuestion[]>([]);
  const [engine, setEngine] = useState<"openai" | "heuristic" | null>(null);

  const [draft, setDraft] = useState<BriefDraftFields | null>(null);
  const [snapshot, setSnapshot] = useState<BriefDraftFields | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  const dirty =
    draft !== null &&
    snapshot !== null &&
    JSON.stringify(draft) !== JSON.stringify(snapshot);

  async function handleGenerate() {
    setGenerateError(null);
    setSaveError(null);
    setSavedLabel(null);
    setPhase("generating");

    const result = await generateBriefFromSource({ rawText });

    if (result.error || !result.data) {
      setGenerateError(result.error ?? "Generation failed.");
      setPhase("input");
      return;
    }

    const fields = bundleToDraft(result.data);
    setBriefId(result.data.brief.id);
    setSource(result.data.source);
    setQuestions(result.data.questions);
    setEngine(result.data.engine);
    setDraft(fields);
    // Deep copy for dirty-detection against the persisted state
    setSnapshot(JSON.parse(JSON.stringify(fields)));
    setPhase("preview");
  }

  async function handleSave() {
    if (!briefId || !draft || !snapshot) return;

    const changes: { field: EditableBriefField; value: unknown }[] = [];
    if (draft.title !== snapshot.title)
      changes.push({ field: "title", value: draft.title.trim() || snapshot.title });
    if (draft.clientName !== snapshot.clientName)
      changes.push({ field: "client_name", value: draft.clientName.trim() || null });
    if (draft.objective !== snapshot.objective)
      changes.push({ field: "objective", value: draft.objective.trim() || null });
    if (draft.budgetTimeline !== snapshot.budgetTimeline)
      changes.push({ field: "budget_timeline", value: draft.budgetTimeline.trim() || null });
    if (JSON.stringify(draft.deliverables) !== JSON.stringify(snapshot.deliverables))
      changes.push({ field: "deliverables", value: draft.deliverables });

    if (changes.length === 0) return;

    setSaving(true);
    setSaveError(null);
    const result = await saveBriefEdits({ briefId, changes });
    setSaving(false);

    if (result?.error) {
      setSaveError(result.error);
      return;
    }

    setSnapshot(JSON.parse(JSON.stringify(draft)));
    setSavedLabel(`Saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  function handleReset() {
    setPhase("input");
    setRawText("");
    setGenerateError(null);
    setBriefId(null);
    setSource(null);
    setQuestions([]);
    setEngine(null);
    setDraft(null);
    setSnapshot(null);
    setSaveError(null);
    setSavedLabel(null);
  }

  const generating = phase === "generating";
  // Phones stack the two panels; once a draft exists the draft leads (that
  // is what the user came to edit) and the source thread follows. From
  // 1024px the two sit side by side in source → draft reading order.
  const draftFirst = phase !== "input";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={PenLine}
        eyebrow="Workspace"
        title="Intake"
        subtitle="Paste what the client sent you. Get a structured, gap-flagged brief back."
        actions={
          phase !== "input" ? (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Start over
            </Button>
          ) : undefined
        }
      />

      {engine === "heuristic" && phase === "preview" && (
        <div className="mb-4 rounded-control border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
          Drafted with the built-in local parser (deterministic). Set{" "}
          <code className="text-text">OPENAI_API_KEY</code> in{" "}
          <code className="text-text">.env.local</code> for AI-powered
          extraction — the same flow, sharper results.
        </div>
      )}

      <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div
          data-proof="intake-source"
          className={
            draftFirst ? "order-2 min-w-0 desk:order-1" : "order-1 min-w-0 desk:order-1"
          }
        >
          <SourcePanel
            mode={phase === "preview" || generating ? "thread" : "input"}
            rawText={rawText}
            onChange={setRawText}
            onGenerate={handleGenerate}
            generating={generating}
            error={generateError}
            aiConfigured={aiConfigured}
            source={source}
            onReset={handleReset}
          />
        </div>

        <div
          data-proof="intake-brief"
          className={
            draftFirst ? "order-1 min-w-0 desk:order-2" : "order-2 min-w-0 desk:order-2"
          }
        >
          <BriefForm
            mode={phase === "input" ? "empty" : generating ? "loading" : "form"}
            draft={draft ?? { title: "", clientName: "", objective: "", budgetTimeline: "", deliverables: [] }}
            onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
            questions={questions}
            dirty={dirty}
            saving={saving}
            savedLabel={savedLabel}
            saveError={saveError}
            onSave={handleSave}
            briefId={briefId}
          />
        </div>
      </div>
    </div>
  );
}
