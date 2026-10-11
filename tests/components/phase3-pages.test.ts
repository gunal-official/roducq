/**
 * Structural tests for the Ember Studio Phase 3 page redesign — the shared
 * page vocabulary plus the layout contracts of the four redesigned pages
 * (Pipeline, Intake, Inbox, Settings).
 *
 * Source-string assertions, same convention as nav.test.ts and
 * doc-detail.test.ts: these are .tsx, so the zero-dependency runner reads
 * them as text. Nothing here needs a browser — the real-browser half of
 * the gate is `npm run verify:responsive`.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const page = read("components/ui/page.tsx");
const chips = read("components/ui/filter-chips.tsx");
const pipeline = read("app/(app)/dashboard/page.tsx");
const intake = read("components/intake/IntakeClient.tsx");
const sourcePanel = read("components/intake/SourcePanel.tsx");
const briefForm = read("components/intake/BriefForm.tsx");
const inbox = read("app/(app)/intake/inbox/page.tsx");
const threadList = read("components/intake/InboxThreadList.tsx");
const settings = read("app/(app)/settings/page.tsx");
const settingsNav = read("components/settings/SettingsNav.tsx");

describe("Phase 3 page vocabulary (components/ui/page.tsx)", () => {
  it("exports the page head, section card and empty state", () => {
    for (const name of ["PageHeader", "SectionCard", "EmptyState"]) {
      assert.ok(page.includes(`export function ${name}`), name);
    }
  });

  it("PageHeader leads with the accent icon-chip head and a display title", () => {
    assert.ok(page.includes('icon-chip icon-chip-accent h-10 w-10 shrink-0'));
    assert.ok(
      page.includes("font-display text-2xl font-bold tracking-tight tab:text-3xl"),
      "the title scales up from the tablet band"
    );
  });

  it("PageHeader stacks its action row under the title on phones", () => {
    assert.ok(
      page.includes("flex flex-col gap-4 tab:flex-row tab:items-start tab:justify-between"),
      "actions get their own row below 600px"
    );
  });

  it("SectionCard is a 12px surface with a hairlined head and an action slot", () => {
    assert.ok(page.includes("rounded-surface border border-border bg-card shadow-card"));
    assert.ok(page.includes("border-b border-border px-5 py-3.5"));
    assert.ok(page.includes("actions && ("), "the head has an action slot");
    assert.ok(page.includes("scroll-mt-6"), "in-page anchors clear the shell");
  });

  it("SectionCard labels itself from its own heading", () => {
    assert.ok(page.includes("aria-labelledby={labeledBy ?? (id ? `${id}-heading` : undefined)}"));
    assert.ok(page.includes("id={id ? `${id}-heading` : undefined}"));
  });

  it("SectionCard tones map to the icon-chip vocabulary", () => {
    for (const cls of [
      '"icon-chip-accent"',
      '"icon-chip-success"',
      '"icon-chip-muted"',
      '"icon-chip-error"',
    ]) {
      assert.ok(page.includes(cls), cls);
    }
  });

  it("EmptyState is dashed (the only place a dashed border is the signal)", () => {
    assert.ok(page.includes("border-dashed border-border bg-card/60"));
  });

  it("uses no arbitrary radii and no hardcoded brand hexes", () => {
    const offenders = [...page.matchAll(/\brounded(?:-[a-z]{1,2})?-\[[^\]]+\]/g)];
    assert.deepEqual(offenders.map((m) => m[0]), []);
    const hexes = (page.match(/#[0-9a-f]{6}\b/gi) ?? []).filter(
      (h) => !/^#fff(fff)?$/i.test(h)
    );
    assert.deepEqual(hexes, []);
  });
});

describe("Phase 3 filter chips", () => {
  it("is a labelled group of pressed-state toggles", () => {
    assert.ok(chips.includes('role="group"'));
    assert.ok(chips.includes("aria-label={label}"));
    assert.ok(chips.includes("aria-pressed={selected}"));
  });

  it("keeps 44px targets and the 8px control radius", () => {
    assert.ok(chips.includes("inline-flex min-h-11 items-center gap-1.5 rounded-control"));
  });

  it("hides itself when there is nothing to choose between", () => {
    assert.ok(chips.includes("if (options.length < 2) return null;"));
  });
});

describe("Pipeline (/ — app/(app)/dashboard/page.tsx)", () => {
  it("opens with exactly one PageHeader", () => {
    assert.equal(pipeline.match(/<PageHeader\b/g)?.length, 1);
    assert.ok(pipeline.includes('title="Pipeline"'));
  });

  it("switches to a content + 20rem rail grid on desktop only", () => {
    assert.ok(pipeline.includes("desk:grid-cols-[minmax(0,1fr)_20rem]"));
  });

  it("lays the flow stages out as one column on phones and five from 600px", () => {
    assert.ok(pipeline.includes("grid gap-2 tab:grid-cols-5"));
    assert.ok(pipeline.includes("tab:hidden"), "the between-stage arrow is phone-only");
  });

  it("keeps the honest empty pipeline state", () => {
    assert.ok(pipeline.includes("Your pipeline is empty"));
  });

  it("composes the Phase 3 section cards, not ad-hoc Card markup", () => {
    assert.equal(pipeline.match(/<SectionCard\b/g)?.length ?? 0, 5);
    assert.doesNotMatch(pipeline, /<CardHeader\b/);
  });
});

describe("Intake (/intake)", () => {
  it("opens with exactly one PageHeader", () => {
    assert.equal(intake.match(/<PageHeader\b/g)?.length, 1);
    assert.ok(intake.includes('title="Intake"'));
  });

  it("is one column on phones and source → draft side by side from 1024px", () => {
    assert.ok(intake.includes("desk:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"));
  });

  it("leads with the draft once one exists, and restores reading order on desktop", () => {
    assert.ok(intake.includes('const draftFirst = phase !== "input";'));
    assert.ok(intake.includes('draftFirst ? "order-2 min-w-0 desk:order-1"'));
    assert.ok(intake.includes('draftFirst ? "order-1 min-w-0 desk:order-2"'));
  });

  it("builds both panels on the shared SectionCard", () => {
    assert.ok(sourcePanel.includes("<SectionCard"));
    assert.ok(briefForm.includes("<SectionCard"));
    assert.ok(briefForm.includes("<EmptyState"));
  });

  it("gives the source textarea a phone-sized minimum height", () => {
    assert.ok(
      sourcePanel.includes("min-h-[220px] resize-y bg-muted/40 leading-relaxed tab:min-h-[340px]")
    );
  });

  it("pairs only the short fields from the tablet band", () => {
    assert.ok(briefForm.includes("grid gap-5 tab:grid-cols-2"));
    assert.ok(briefForm.includes("tab:col-span-2"), "long fields stay full width");
  });

  it("keeps the generate/ save affordances", () => {
    assert.ok(sourcePanel.includes("export const MIN_SOURCE_CHARS = 20;"));
    assert.ok(briefForm.includes('id="brief-title"'));
    assert.ok(briefForm.includes('id="brief-client"'));
    assert.ok(briefForm.includes('id="brief-objective"'));
    assert.ok(briefForm.includes('id="brief-budget"'));
    assert.ok(briefForm.includes("Open in Briefs"));
  });
});

describe("Inbox (/intake/inbox)", () => {
  it("opens with exactly one PageHeader", () => {
    assert.equal(inbox.match(/<PageHeader\b/g)?.length, 1);
    assert.ok(inbox.includes('title="Inbox"'));
  });

  it("is one column on phones and threads + 20rem staged rail from 1024px", () => {
    assert.ok(inbox.includes("desk:grid-cols-[minmax(0,1fr)_20rem]"));
    assert.ok(
      inbox.includes("order-first min-w-0 space-y-6 desk:order-none"),
      "the staged-import rail leads on phones"
    );
  });

  it("counts only real rows in the header meta", () => {
    assert.ok(inbox.includes("threads?.reduce((n, t) => n + t.sources.length, 0) ?? 0"));
    assert.ok(inbox.includes("staging.length + imports.length"));
  });

  it("keeps the staged Slack/Notion and mail surfaces", () => {
    assert.ok(inbox.includes("<MailboxStaging"));
    assert.ok(inbox.includes("<IntegrationStaging"));
  });

  it("filters threads by source type, with chips only for types that exist", () => {
    assert.ok(threadList.includes("<FilterChips"));
    assert.ok(threadList.includes('label="Filter threads by source type"'));
    assert.ok(
      threadList.includes("const present = new Set("),
      "chips are derived from the rows on the page"
    );
    assert.ok(threadList.includes("AddSourceForm"), "the composer survives the filter");
  });

  it("falls back to All when a filter outlives its data", () => {
    assert.ok(threadList.includes("options.some((o) => o.value === filter)"));
  });
});

describe("Settings (/settings)", () => {
  it("opens with exactly one PageHeader", () => {
    assert.equal(settings.match(/<PageHeader\b/g)?.length, 1);
    assert.ok(settings.includes('title="Settings"'));
  });

  it("is one column on phones and nav + content from 1024px", () => {
    assert.ok(settings.includes("desk:grid-cols-[13.75rem_minmax(0,1fr)]"));
    assert.ok(
      settingsNav.includes("hidden desk:sticky desk:top-6 desk:block desk:self-start"),
      "the section rail is desktop-only"
    );
  });

  it("builds the nav from the sections the page actually renders", () => {
    assert.ok(settings.includes("const sections: SettingsSectionLink[] = ["));
    assert.ok(
      settings.includes('...(workspace && isOwner\n      ? [{ id: "danger"'),
      "the danger-zone link is owner-only"
    );
  });

  it("gives every card an anchor id matching the nav", () => {
    for (const id of [
      "workspace",
      "branding",
      "team",
      "templates",
      "plan",
      "webhooks",
      "mailbox",
      "integrations",
      "activity",
      "danger",
    ]) {
      assert.ok(settings.includes(`sectionId="${id}"`), `sectionId="${id}"`);
    }
  });

  it("keeps every preserved surface: workspace, branding, team, templates, plan, webhooks, mailbox, integrations, activity, danger", () => {
    for (const component of [
      "<WorkspaceNameCard",
      "<WorkspaceBrandingCard",
      "<TeamCard",
      "<TemplatesList",
      "<PlanCard",
      "<WebhooksCard",
      "<MailboxCard",
      "<IntegrationsCard",
      "<EventsCard",
      "<WorkspaceDangerCard",
    ]) {
      assert.ok(settings.includes(component), component);
    }
  });

  it("keeps the one-time checkout / email / integration notices", () => {
    for (const notice of ["<CheckoutNotice", "<EmailNotice", "<IntegrationsNotice"]) {
      assert.ok(settings.includes(notice), notice);
    }
  });
});
