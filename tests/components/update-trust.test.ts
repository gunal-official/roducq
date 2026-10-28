/** Source-level wiring checks complement the real-browser fixture checks in
 * scripts/verify-phase1-trust-attention.mjs. These do not simulate RLS. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const detail = read("app/(app)/updates/[id]/page.tsx");
const list = read("components/updates/UpdatesList.tsx");
const panel = read("components/updates/ShareLinkPanel.tsx");
const composer = read("components/updates/UpdateComposer.tsx");
const selector = read("components/updates/UpdateStatusSelect.tsx");
const badge = read("components/updates/UpdateStatusBadge.tsx");
const actions = read("app/(app)/updates/[id]/actions.ts");

describe("update trust and sharing presentation", () => {
  it("uses the same three-state interpretation for the summary and panel", () => {
    assert.match(detail, /getUpdateShareState\(shareLink\)/);
    assert.match(detail, /UPDATE_SHARE_PRESENTATION\[shareState\]/);
    assert.match(detail, /sharePresentation\.chip/);
    assert.match(detail, /sharePresentation\.value/);
    assert.match(detail, /sharePresentation\.hint/);
    assert.match(detail, /shareState === "active" \? "success" : "muted"/);
    assert.match(panel, /getUpdateShareState\(shareLink\) === "active"/);
    assert.match(panel, /shareLink === null/);
    assert.match(panel, /shareLink !== null && isActive/);
    assert.match(panel, /shareLink !== null && !isActive/);
    assert.doesNotMatch(detail, /shareLink \? "Public link live"/);
  });

  it("explains draft sharing, manual delivery, live saved changes and exports", () => {
    assert.ok(detail.includes("Draft saved. A public link can be created while this update is still a draft."));
    assert.ok(detail.includes("Marked sent. Changing this status does not send the update; share a link or export it separately."));
    assert.ok(detail.includes("Draft status; a link can still be shared."));
    assert.ok(detail.includes("Status only; this does not confirm delivery."));
    assert.ok(list.includes("Drafts can be shared by link; changing the status does not send an update."));
    assert.ok(panel.includes("including drafts, without an account."));
    assert.ok(panel.includes("changes saved later."));
    assert.ok(composer.includes("Exported Markdown and PDFs use the saved content; neither is sent"));
    for (const source of [detail, list, panel, composer]) {
      assert.doesNotMatch(source, /Delivered to (?:the client|clients)|stays private until|Drafts stay private|the client (?:gets|receives)/i);
    }
  });

  it("keeps the stored value and filter semantics while labelling the status honestly", () => {
    assert.match(selector, /\{ value: "sent", label: "Marked sent" \}/);
    assert.match(list, /\{ value: "sent", label: "Marked sent" \}/);
    assert.match(list, /statusFilter !== "all" && update\.status !== statusFilter/);
    assert.match(selector, /updateUpdateStatus\(\{[\s\S]*status: nextStatus/);
    assert.match(badge, /sent:\s*\{\s*label: "Marked sent"/);
    assert.match(selector, /aria-describedby=\{hintId\}/);
    assert.match(selector, /Changing the status does not send this update\./);
    assert.match(read("app/share/[token]/page.tsx"), /<UpdateStatusBadge status=\{document\.status\}/);
  });

  it("does not invent a sent event or use updated_at as the send time", () => {
    assert.doesNotMatch(detail, /title:\s*"Marked sent"/);
    assert.doesNotMatch(detail, /Marked sent \$\{timeAgo\(update\.updated_at\)\}/);
    assert.match(detail, /title: "Drafted"/);
    assert.match(detail, /title: "Last updated",\s*at: timeAgo\(update\.updated_at\)/);
  });

  it("retains the existing share and status actions and their editor guards", () => {
    for (const action of ["createShareLink", "revokeShareLink", "regenerateShareLink"]) {
      assert.ok(panel.includes(action), `${action} remains wired`);
    }
    assert.match(actions, /\.update\(\{ status: input\.status \}\)/);
    assert.equal((actions.match(/await requireEditor\(\)/g) ?? []).length, 5);
    assert.match(read("lib/data/shares.ts"), /\.rpc\("get_shared_document"/);
  });
});
