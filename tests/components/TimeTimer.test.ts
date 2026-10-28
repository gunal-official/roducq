import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("TimeTimer", () => {
  it("keeps every control at 44px and unshrinkable at 320px", () => {
    const src = read("components/time/TimeTimer.tsx");
    assert.ok(src.includes("export function TimeTimer"));
    assert.ok(src.includes('className="min-h-11 flex h-11 w-11 shrink-0 items-center justify-center rounded-control')); // discard
    assert.ok(src.includes('className="h-11 shrink-0 gap-1.5')); // Stop
  });

  it("stop flow collects a label and notes before submitting", () => {
    const src = read("components/time/TimeTimer.tsx");
    assert.ok(src.includes('placeholder="What are you working on?"'));
    assert.ok(src.includes('pending ? "Saving…"')); // real submit label + pending state
    assert.ok(src.includes("logTimeAction")); // real server action
    assert.match(src, /role="alert"/);
    for (const field of ["descriptionInvalid", "minutesInvalid", "dateInvalid"]) {
      assert.match(src, new RegExp(`aria-invalid=\\{${field} \\|\\| undefined\\}`));
      assert.match(src, new RegExp(`aria-describedby=\\{${field} \\? errorId : undefined\\}`));
    }
  });

  it("reserves a real scrollport only when the narrow shell has a timer", () => {
    const layout = read("app/(app)/layout.tsx");
    const css = read("app/globals.css");
    assert.match(layout, /data-has-timer=\{context\.canSeeMoney \? "" : undefined\}/);
    assert.match(css, /\.app-main\[data-has-timer\]\s*\{\s*margin-bottom: calc\(9\.5rem \+ env\(safe-area-inset-bottom, 0px\)\)/);
    assert.match(css, /min-width: 600px\) and \(max-width: 1023\.98px\)/);
    assert.match(css, /\.app-main\[data-has-timer\]\s*\{\s*margin-bottom: 5\.5rem/);
  });

  it("keeps a modal stop form focus-safe on narrow screens and the desktop form non-modal", () => {
    const src = read("components/time/TimeTimer.tsx");
    assert.match(src, /useSyncExternalStore\(subscribeToNarrowTimer/);
    assert.match(src, /if \(!narrow\)/);
    assert.match(src, /<Dialog\.Root/);
    assert.match(src, /<Dialog\.Title/);
    assert.match(src, /<Dialog\.Description/);
    assert.match(src, /onOpenAutoFocus/);
    assert.match(src, /onCloseAutoFocus/);
    assert.match(src, /stopTriggerRef\.current/);
    assert.match(src, /if \(!open && !pending\) setPhase\("running"\)/);
    assert.match(src, /onEscapeKeyDown/);
    assert.match(src, /aria-label="Close timer form"/);
    assert.match(src, /overflow-y-auto/);
  });
});
