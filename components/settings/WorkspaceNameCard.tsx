"use client";

/**
 * Workspace card on /settings: shows the current workspace name. Owners
 * edit it inline (input + Save); members see it read-only with a "View
 * only" note and ZERO controls — the same hide-don't-disable pattern as
 * the Templates card (Step 11).
 */

import { useState } from "react";
import { Loader2, Save, Building2 } from "lucide-react";

import { updateWorkspaceName } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page";
import { Input } from "@/components/ui/input";

export function WorkspaceNameCard({
  name,
  isOwner,
  sectionId,
}: {
  name: string;
  isOwner: boolean;
  /** Anchor id for the settings page's section nav. */
  sectionId?: string;
}) {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  const dirty = value.trim() !== name && value.trim().length > 0;

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    setSavedLabel(null);

    const result = await updateWorkspaceName({ name: value });

    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSavedLabel(
      `Saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    );
  }

  return (
    <SectionCard
      icon={Building2}
      title="Workspace"
      description={
        <>
          The workspace name appears in the sidebar and across the app.
          {!isOwner && (
            <span className="italic">
              {" "}
              View only — owners manage this.
            </span>
          )}
        </>
      }
      id={sectionId}
      bodyClassName="p-5"
    >
      {isOwner ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSavedLabel(null);
              }}
              maxLength={80}
              placeholder="Workspace name"
              className="max-w-sm"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin"  aria-hidden="true" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4"  aria-hidden="true" />
                  Save
                </>
              )}
            </Button>
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          {savedLabel && (
            <p className="text-xs text-muted-foreground">{savedLabel}</p>
          )}
        </div>
      ) : (
        <p className="text-sm font-medium">{name}</p>
      )}
    </SectionCard>
  );
}
