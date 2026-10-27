import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { APP_PREFIXES, isAppPath } from "../../lib/supabase/protected-routes.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const APP_GROUP = join(ROOT, "app", "(app)");

function pageFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return pageFiles(path);
    return name === "page.tsx" ? [path] : [];
  });
}

describe("authenticated route inventory", () => {
  it("covers every URL root represented by a page in the (app) route group", () => {
    const pageRoots = new Set(
      pageFiles(APP_GROUP).map((file) => {
        const route = relative(APP_GROUP, file)
          .split(sep)
          .slice(0, -1)
          .filter(Boolean);
        return route.length === 0 ? "/" : `/${route[0]}`;
      })
    );

    // / is intentionally public marketing and is rewritten to /dashboard
    // only after auth. Every other (app) page root is covered by its guard.
    pageRoots.delete("/");
    for (const path of pageRoots) {
      assert.ok(isAppPath(path), `${path} is a (app) page root but is not protected`);
    }
    assert.ok(isAppPath("/onboarding"), "onboarding is protected despite its (auth) route group");
    assert.ok(APP_PREFIXES.includes("/search"));
  });

  it("matches exact roots and descendants without matching lookalike prefixes", () => {
    assert.equal(isAppPath("/search"), true);
    assert.equal(isAppPath("/search/result/123"), true);
    assert.equal(isAppPath("/searching"), false);
    assert.equal(isAppPath("/search-results"), false);
    assert.equal(isAppPath("/dashboardx"), false);
  });

  it("keeps public token and marketing routes outside the app guard", () => {
    for (const path of [
      "/",
      "/pricing",
      "/about",
      "/solutions",
      "/share/01234567-89ab-cdef-0123-456789abcdef",
      "/invoice/01234567-89ab-cdef-0123-456789abcdef",
      "/invoice",
    ]) {
      assert.equal(isAppPath(path), false, `${path} must remain public`);
    }

    assert.equal(isAppPath("/invoices"), true, "plural app route stays protected");
    assert.equal(isAppPath("/invoices/123"), true);
  });
});
