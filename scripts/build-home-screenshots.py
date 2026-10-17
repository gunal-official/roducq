#!/usr/bin/env python3
"""
Build PNG evidence of the redesigned landing page (light + dark) using the
literal copy from our TypeScript sources.

Rendered with Pillow — no Chromium in the sandbox (NSS/NSPR are absent and
the browser CDNs are unreachable from this network) — at 2x and resampled to
1x, matching scripts/build-pricing-screenshots.py so both sets of evidence in
docs/screenshots look like the same product.

WHAT THIS IS AND IS NOT. This is an approximation drawn from the same data
the page renders: band order, headings, copy, card counts and palette. It is
NOT a browser render and must never be described as a pixel comparison
against the reference site. Its job is to stop docs/screenshots drifting from
what / actually serves.

UNLIKE the pricing script, no copy is re-typed here. The strings are read at
build time by asking Node to import app/(marketing)/home/content.ts and
app/(marketing)/vs/[slug]/vs-pages.ts through jiti — the same trick
tests/components/pricing-offer-shots.test.ts uses — and dump them as JSON.
These screenshots therefore cannot drift from what / actually renders.

Usage:  python3 scripts/build-home-screenshots.py
"""

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs" / "screenshots"
DOCS.mkdir(parents=True, exist_ok=True)

# ── Approximation fonts for this Pillow-only evidence renderer ──────────────
# Production self-hosts Manrope (app/fonts/manrope-latin-wght-normal.woff2),
# which Pillow cannot read. DejaVu is preinstalled in the sandbox, so these
# shots approximate the family without depending on a browser or on
# converting the woff2.
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

W = 1440
SCALE = 2
GUTTER = 88
CONTENT = W - 2 * GUTTER

# ── Copy: read from the real TypeScript sources, never re-typed ────────────


def load_content():
    """Import the live content modules through jiti and dump them as JSON."""
    script = r"""
const jiti = require('jiti')(process.argv[1]);
const content = jiti(process.argv[2]);
const vs = jiti(process.argv[3]);
const plans = jiti(process.argv[4]);
process.stdout.write(JSON.stringify({
  ANNOUNCEMENT: content.ANNOUNCEMENT,
  HERO: content.HERO,
  CONNECTS_WITH: content.CONNECTS_WITH,
  FEATURES_SECTION: content.FEATURES_SECTION,
  AUTOMATION_PANEL: content.AUTOMATION_PANEL,
  FEATURE_BLOCKS: content.FEATURE_BLOCKS,
  STEPS_SECTION: content.STEPS_SECTION,
  STEPS: content.STEPS,
  ENGAGEMENT_PANEL: content.ENGAGEMENT_PANEL,
  ONBOARDING_CHECKLIST: content.ONBOARDING_CHECKLIST,
  INTEGRATIONS_SECTION: content.INTEGRATIONS_SECTION,
  INTEGRATION_CARDS: content.INTEGRATION_CARDS,
  TEAMS_SECTION: content.TEAMS_SECTION,
  TEAM_CARDS: content.TEAM_CARD || content.TEAM_CARDS,
  PRICING_SECTION: content.PRICING_SECTION,
  PRICES_NOTE: plans.PRICES_UNCONFIGURED_NOTE,
  PLAN_TIER_NAMES: plans.PLAN_TIERS.map((p) => p.name),
  FAQ_SECTION: content.FAQ_SECTION,
  FAQ: content.FAQ,
  CLOSING: content.CLOSING,
  LIMITATION: content.LIMITATION,
  FOOTER: content.FOOTER,
  COMPETITORS: vs.VS_PAGE_LIST.map((e) => e.competitor),
}));
"""
    out = subprocess.run(
        [
            "node", "-e", script,
            str(ROOT),
            str(ROOT / "app/(marketing)/home/content.ts"),
            str(ROOT / "app/(marketing)/vs/[slug]/vs-pages.ts"),
            str(ROOT / "app/(marketing)/pricing/plans.ts"),
        ],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


DATA = load_content()


# ── Palettes: the same token names as app/(marketing)/landing.css ──────────

LIGHT = {
    "canvas": "#f9f7fc", "canvas_alt": "#f2eef8", "mint": "#e7f7ed",
    "card": "#ffffff", "surface_muted": "#eae6f1", "surface_accent": "#efebff",
    "surface_neutral": "#d1d5df",
    "ink": "#1b1426", "ink_soft": "#4b505f", "ink_accent": "#5332d6",
    "muted": "#7a659f", "muted_slate": "#687083", "muted_gray": "#9ba4b6",
    "accent": "#6246ea", "accent_strong": "#5b3fe0", "on_accent": "#ffffff",
    "success": "#15803d", "border": "#ac7dfc", "border_soft": "#e3d7f7",
    "border_strong": "#c9a4fb",
}

DARK = {
    "canvas": "#17131e", "canvas_alt": "#1d1826", "mint": "#12291d",
    "card": "#211b29", "surface_muted": "#2a2233", "surface_accent": "#2b2140",
    "surface_neutral": "#3b3546",
    "ink": "#f4f0fb", "ink_soft": "#cdc4d8", "ink_accent": "#c4b5fd",
    "muted": "#a795c4", "muted_slate": "#a4a2b3", "muted_gray": "#8b8798",
    "accent": "#a78bfa", "accent_strong": "#b9a3fb", "on_accent": "#1b1426",
    "success": "#4ade80", "border": "#7c5fd0", "border_soft": "#38304a",
    "border_strong": "#8f74dd",
}

PALETTES = {"light": LIGHT, "dark": DARK}


class Canvas:
    """2x-supersampled surface with the few primitives every band needs."""

    def __init__(self, theme_name):
        self.t = PALETTES[theme_name]
        # Generous headroom: the bands are drawn top-down without knowing
        # their own height, and drawing past the surface is silently clipped.
        # A canvas shorter than the page crops to black at the bottom.
        self.height = 12000
        self.img = Image.new("RGB", (W * SCALE, self.height * SCALE), self.t["canvas"])
        self.d = ImageDraw.Draw(self.img)
        self.cursor = 0

    def s(self, v):
        return int(v * SCALE)

    def font(self, size, bold=False):
        return ImageFont.truetype(FONT_SANS_BOLD if bold else FONT_SANS, self.s(size))

    def text(self, x, y, value, size=14, bold=False, color=None):
        self.d.text((self.s(x), self.s(y)), value,
                    font=self.font(size, bold),
                    fill=color or self.t["ink"])
        return self.width(value, size, bold)

    def width(self, value, size=14, bold=False):
        bbox = self.d.textbbox((0, 0), value, font=self.font(size, bold))
        return (bbox[2] - bbox[0]) / SCALE

    def wrap_center(self, y, value, size, max_width, color=None, leading=1.6, bold=False):
        """Wrap into a centred measure, centring each line individually.

        `wrap()` takes a left x, so calling it with an offset to *simulate*
        centring produces a paragraph hugging the left edge of a half-width
        box — the first draft shipped that on five bands.
        """
        words, lines, line = value.split(), [], ""
        for word in words:
            trial = f"{line} {word}".strip()
            if self.width(trial, size, bold) > max_width and line:
                lines.append(line)
                line = word
            else:
                line = trial
        if line:
            lines.append(line)
        for i, row in enumerate(lines):
            self.text((W - self.width(row, size, bold)) / 2, y + i * size * leading,
                      row, size, bold, color)
        return y + len(lines) * size * leading

    def wrap(self, x, y, value, size, max_width, color=None, leading=1.6, bold=False):
        words, line, out = value.split(), "", []
        for word in words:
            trial = f"{line} {word}".strip()
            if self.width(trial, size, bold) > max_width and line:
                out.append(line)
                line = word
            else:
                line = trial
        if line:
            out.append(line)
        for i, row in enumerate(out):
            self.text(x, y + i * size * leading, row, size, bold, color)
        return y + len(out) * size * leading

    def rect(self, x, y, w, h, fill=None, outline=None, radius=0):
        self.d.rounded_rectangle(
            [self.s(x), self.s(y), self.s(x + w), self.s(y + h)],
            radius=self.s(radius), fill=fill,
            outline=outline, width=self.s(1) if outline else 0,
        )

    def fit(self, value, size, max_width, bold=True):
        """Largest size at or below `size` that fits `max_width`.

        DejaVu is materially wider than Manrope, which production self-hosts
        and Pillow cannot read; without this the 64px headline would clip at
        the 1440px edge in the evidence render while the real page wraps
        cleanly.
        """
        while size > 24 and self.width(value, size, bold) > max_width:
            size -= 2
        return size

    def hline(self, y):
        self.d.line([(0, self.s(y)), (self.s(W), self.s(y))],
                    fill=self.t["border_soft"], width=self.s(1))

    def eyebrow(self, y, value):
        self.text(GUTTER, y, value.upper(), 12, True, self.t["muted_gray"])
        return y + 26

    def heading(self, y, before, after, size=54):
        size = self.fit(f"{before} {after}", size, CONTENT - 40)
        self.text(GUTTER, y, before, size, True, self.t["ink"])
        x = GUTTER + self.width(before, size, True) + self.width(" ", size, True)
        self.text(x, y, after, size, True, self.t["ink_accent"])
        return y + size * 1.25

    def heading_center(self, y, before, after, size=54):
        full = f"{before} {after}"
        size = self.fit(full, size, CONTENT - 40)
        total = self.width(full, size, True)
        x = (W - total) / 2
        self.text(x, y, before, size, True, self.t["ink"])
        self.text(x + self.width(before + " ", size, True), y, after, size, True,
                  self.t["ink_accent"])
        return y + size * 1.25

    def button(self, x, y, label, primary=True, size=14):
        w = self.width(label, size, True) + 44
        self.rect(x, y, w, 48,
                  fill=self.t["accent"] if primary else self.t["card"],
                  outline=None if primary else self.t["border_strong"],
                  radius=5)
        self.text(x + 22, y + 15, label, size, True,
                  self.t["on_accent"] if primary else self.t["ink"])
        return x + w

    def finish(self, y):
        self.img = self.img.crop((0, 0, self.s(W), self.s(y)))

    def save(self, path):
        self.img.resize((W, int(self.img.size[1] / SCALE)), Image.LANCZOS).save(path)


# ── Bands, in the reference's order ────────────────────────────────────────


def announcement(c, y):
    c.rect(0, y, W, 44, fill=c.t["canvas_alt"])
    label = f"{DATA['ANNOUNCEMENT']['label']} — {DATA['ANNOUNCEMENT']['text']}"
    x = (W - c.width(label, 12, True)) / 2
    c.text(x, y + 13, label, 12, True, c.t["ink_soft"])
    return y + 44


def header(c, y):
    c.rect(0, y, W, 72, fill=c.t["canvas"])
    c.rect(GUTTER, y + 20, 32, 32, fill=c.t["accent"], radius=8)
    c.text(GUTTER + 44, y + 25, "roducq", 18, True, c.t["ink"])
    x = GUTTER + 130
    for label in ["About", "Pricing", "Compare"]:
        c.text(x, y + 28, label, 14, False, c.t["muted_slate"])
        x += c.width(label, 14) + 34
    c.text(W - GUTTER - 320, y + 28, "Log in", 14, True, c.t["ink"])
    c.rect(W - GUTTER - 140, y + 12, 140, 48, fill=c.t["accent"], radius=5)
    label = "Start free"
    c.text(W - GUTTER - 140 + (140 - c.width(label, 14, True)) / 2, y + 27,
           label, 14, True, c.t["on_accent"])
    c.hline(y + 72)
    return y + 72


def hero(c, y):
    hero = DATA["HERO"]
    pill = hero["eyebrow"]
    pw = c.width(pill, 12, True) + 40
    c.rect((W - pw) / 2, y, pw, 32, fill=c.t["surface_accent"], radius=999)
    c.text((W - pw) / 2 + 20, y + 8, pill, 12, True, c.t["ink_accent"])
    y += 68

    hsize = min(c.fit(line, 64, CONTENT) for line in hero["titleLines"])
    for line in hero["titleLines"]:
        full = c.width(line, hsize, True)
        x = (W - full) / 2
        at = line.find(hero["emphasis"])
        if at < 0:
            # No emphasis on this line: draw it whole. Slicing with a -1
            # index silently drops the final character instead.
            c.text(x, y, line, hsize, True, c.t["ink"])
        else:
            c.text(x, y, line[:at], hsize, True, c.t["ink"])
            c.text(x + c.width(line[:at], hsize, True), y, hero["emphasis"], hsize, True,
                   c.t["ink_accent"])
            c.text(x + c.width(line[:at] + hero["emphasis"], hsize, True), y,
                   line[at + len(hero["emphasis"]):], hsize, True, c.t["ink"])
        y += hsize + 6

    y = c.wrap_center(y + 22, hero["intro"], 18, CONTENT - 380, c.t["ink_soft"]) + 26
    primary = c.width(hero["primaryCta"]["label"], 14, True) + 44
    secondary = c.width(hero["secondaryCta"]["label"], 14, True) + 44
    x = (W - primary - secondary - 12) / 2
    c.button(x, y, hero["primaryCta"]["label"], True)
    c.button(x + primary + 12, y, hero["secondaryCta"]["label"], False)
    y += 48 + 18
    note = hero["note"]
    c.text((W - c.width(note, 12)) / 2, y, note, 12, False, c.t["muted"])
    y += 40

    strip = f"{DATA['CONNECTS_WITH']['lead'].upper()}   " + "    ".join(
        DATA["CONNECTS_WITH"]["items"])
    c.text((W - c.width(strip, 12)) / 2, y, strip, 12, False, c.t["muted_slate"])
    y += 56

    # Product frame — chrome, rail, stats, chart, today's work.
    fx, fw = GUTTER, CONTENT
    c.rect(fx, y, fw, 560, fill=c.t["card"], outline=c.t["border_soft"], radius=16)
    c.rect(fx + 1, y + 1, fw - 2, 44, fill=c.t["canvas_alt"], radius=16)
    for i, tint in enumerate([c.t["surface_neutral"], c.t["border"], c.t["success"]]):
        c.rect(fx + 20 + i * 18, y + 16, 12, 12, fill=tint, radius=999)
    c.text(fx + 90, y + 13, "Acme Studio / Overview", 12, True, c.t["muted_slate"])
    y += 45
    rail = fx + 20
    c.rect(rail, y + 16, 32, 32, fill=c.t["accent"], radius=8)
    c.text(rail + 44, y + 24, "roducq", 16, True, c.t["ink"])
    c.rect(rail, y + 66, 186, 52, fill=c.t["card"], outline=c.t["border_soft"], radius=8)
    c.rect(rail + 10, y + 76, 32, 32, fill=c.t["surface_accent"], radius=4)
    c.text(rail + 52, y + 78, "Acme Studio", 12, True, c.t["ink"])
    c.text(rail + 52, y + 96, "Team plan · 4 members", 10, False, c.t["muted"])
    ry = y + 138
    for i, item in enumerate(["Overview", "Intake", "Briefs", "Proposals", "Plans",
                              "Updates", "Invoices", "Time"]):
        if i == 0:
            c.rect(rail, ry, 186, 34, fill=c.t["surface_accent"], radius=8)
        c.rect(rail + 12, ry + 13, 6, 6,
               fill=c.t["accent"] if i == 0 else c.t["surface_neutral"], radius=999)
        c.text(rail + 28, ry + 9, item, 12, i == 0, c.t["ink_accent"] if i == 0 else c.t["muted_slate"])
        ry += 38
    c.rect(rail, ry + 8, 186, 62, fill=c.t["surface_accent"],
           outline=c.t["border_soft"], radius=8)
    c.text(rail + 12, ry + 20, "WEEKLY UPDATE · FRI 16:00", 10, True, c.t["ink_accent"])
    c.text(rail + 12, ry + 40, "Drafted from plan progress.", 10, False, c.t["muted"])

    mx = fx + 230
    c.text(mx, y + 20, "WORKSPACE / OVERVIEW", 10, True, c.t["muted_gray"])
    c.text(mx, y + 44, "MONDAY, MARCH 3", 10, True, c.t["muted"])
    c.text(mx, y + 64, "Good morning, Priya", 22, True, c.t["ink"])
    c.text(mx, y + 96, "3 briefs in review and 1 proposal to send.", 12, False,
           c.t["muted_slate"])
    c.rect(fx + fw - 150, y + 56, 130, 38, fill=c.t["accent"], radius=5)
    c.text(fx + fw - 150 + 26, y + 66, "New brief", 12, True, c.t["on_accent"])

    stats = [("BRIEFS DRAFTED", "24", "this month"), ("PROPOSALS SENT", "08", "this quarter"),
             ("PLAN TASKS DONE", "12", "all on track"), ("TIME LOGGED", "6.4h", "this week")]
    sw = (fw - 250 - 3 * 10) / 4
    for i, (label, value, note) in enumerate(stats):
        sx = mx + i * (sw + 10)
        c.rect(sx, y + 130, sw, 92, fill=c.t["canvas"], outline=c.t["border_soft"], radius=8)
        c.text(sx + 12, y + 142, label, 10, True, c.t["muted_gray"])
        c.text(sx + 12, y + 162, value, 22, True, c.t["ink"])
        c.text(sx + 12, y + 194, note, 10, False, c.t["muted"])

    cy = y + 236
    cw = (fw - 250) * 0.57
    c.rect(mx, cy, cw, 176, fill=c.t["canvas"], outline=c.t["border_soft"], radius=8)
    c.text(mx + 14, cy + 12, "Briefs drafted", 12, True, c.t["ink"])
    c.text(mx + cw - 90, cy + 14, "Last 7 days", 10, False, c.t["muted"])
    for i, (day, h) in enumerate([("Mon", 46), ("Tue", 62), ("Wed", 88), ("Thu", 70),
                                  ("Fri", 100), ("Sat", 22), ("Sun", 14)]):
        bw = (cw - 28 - 6 * 8) / 7
        bx = mx + 14 + i * (bw + 8)
        c.rect(bx, cy + 140 - h, bw, h,
               fill=c.t["accent"] if h == 100 else c.t["border_strong"], radius=3)
        c.text(bx + 2, cy + 148, day, 10, False, c.t["muted_gray"])

    tx = mx + cw + 12
    tw = fw - 250 - cw - 12
    c.rect(tx, cy, tw, 176, fill=c.t["canvas"], outline=c.t["border_soft"], radius=8)
    c.text(tx + 14, cy + 12, "Due today", 12, True, c.t["ink"])
    for i, (title, project) in enumerate([("Review Acme brief", "Acme launch"),
                                          ("Send proposal v3", "Acme launch"),
                                          ("Draft weekly update", "Northwind retainer")]):
        ry2 = cy + 40 + i * 44
        c.rect(tx + 12, ry2, tw - 24, 38, fill=c.t["card"],
               outline=c.t["border_soft"], radius=4)
        c.text(tx + 22, ry2 + 6, title, 12, True, c.t["ink"])
        c.text(tx + 22, ry2 + 22, project, 10, False, c.t["muted"])

    sy = cy + 188
    c.rect(mx, sy, fw - 250, 46, fill=c.t["mint"], outline=c.t["border_soft"], radius=8)
    c.text(mx + 14, sy + 14, "Client call · Acme", 12, True, c.t["ink"])
    c.text(mx + 220, sy + 16, "11:00 AM – 11:30 AM", 10, False, c.t["muted_slate"])
    for i, initials in enumerate(["PR", "AL", "JK"]):
        c.rect(fx + fw - 110 + i * 26, sy + 11, 24, 24, fill=c.t["surface_accent"], radius=999)
        c.text(fx + fw - 105 + i * 26, sy + 16, initials, 10, True, c.t["ink_accent"])
    return y + 560 + 120


def features(c, y):
    section = DATA["FEATURES_SECTION"]
    c.eyebrow(y, section["eyebrow"])
    y = c.heading(y + 20, section["titleBefore"], section["titleAfter"], 54)
    y = c.wrap(GUTTER, y, section["intro"], 18, 660, c.t["ink_soft"]) + 30

    panel = DATA["AUTOMATION_PANEL"]
    px, pw = GUTTER + 700, CONTENT - 700
    c.rect(px, y - 190, pw, 230, fill=c.t["card"], outline=c.t["border_soft"], radius=14)
    c.rect(px + 20, y - 170, 32, 32, fill=c.t["surface_accent"], radius=4)
    c.text(px + 64, y - 162, "WEBHOOKS", 10, True, c.t["muted"])
    c.text(px + 20, y - 116, panel["trigger"], 14, True, c.t["ink"])
    cx = px + 20
    c.rect(cx, y - 80, c.width(panel["action"], 12, True) + 28, 30,
           fill=c.t["accent"], radius=999)
    c.text(cx + 14, y - 72, panel["action"], 12, True, c.t["on_accent"])
    cx += c.width(panel["action"], 12, True) + 38
    for step in panel["steps"][:1]:
        c.rect(cx, y - 80, c.width(step, 12, True) + 28, 30,
               fill=c.t["surface_accent"], radius=999)
        c.text(cx + 14, y - 72, step, 12, True, c.t["ink_accent"])
    c.text(px + 20, y - 34, panel["footnote"], 12, False, c.t["muted"])

    y += 70
    for i, block in enumerate(DATA["FEATURE_BLOCKS"]):
        left = i % 2 == 0
        vx = GUTTER if left else GUTTER + CONTENT - 520
        tx = GUTTER + 560 if left else GUTTER
        c.rect(vx, y, 520, 200, fill=c.t["card"], outline=c.t["border_soft"], radius=14)
        c.rect(vx + 20, y + 20, 480, 44, fill=c.t["canvas"],
               outline=c.t["border_soft"], radius=8)
        c.rect(vx + 20, y + 76, 480, 44, fill=c.t["surface_accent"],
               outline=c.t["border_strong"], radius=8)
        c.rect(vx + 20, y + 132, 300, 12, fill=c.t["surface_neutral"], radius=2)
        c.text(tx, y + 4, block["label"].upper(), 10, True, c.t["muted"])
        c.wrap(tx, y + 30, block["title"], 22, 520, c.t["ink"], 1.2, True)
        c.wrap(tx, y + 90, block["copy"], 14, 520, c.t["ink_soft"])
        y += 250
    cta = section["cta"]["label"]
    c.text((W - c.width(cta, 14, True)) / 2, y, cta, 14, True, c.t["ink_accent"])
    return y + 120


def steps(c, y):
    section = DATA["STEPS_SECTION"]
    c.eyebrow(y, section["eyebrow"])
    y = c.heading_center(y + 20, section["titleBefore"], section["titleAfter"], 54)
    y = c.wrap_center(y, section["intro"], 18, CONTENT - 640, c.t["ink_soft"]) + 50

    cardw = (CONTENT - 2 * 12) / 3
    for i, step in enumerate(DATA["STEPS"]):
        x = GUTTER + i * (cardw + 12)
        c.rect(x, y, cardw, 260, fill=c.t["card"], outline=c.t["border_soft"], radius=14)
        c.rect(x + 24, y + 24, 36, 36, fill=c.t["surface_accent"], radius=8)
        c.text(x + 37, y + 33, step["index"], 14, True, c.t["ink_accent"])
        c.rect(x + cardw - 60, y + 40, 36, 3, fill=c.t["border_strong"], radius=2)
        c.wrap(x + 24, y + 82, step["title"], 18, cardw - 48, c.t["ink"], 1.2, True)
        c.wrap(x + 24, y + 124, step["copy"], 12, cardw - 48, c.t["ink_soft"])
        cx = x + 24
        for chip in step["chips"]:
            cw2 = c.width(chip, 10, True) + 20
            c.rect(cx, y + 218, cw2, 24, fill=c.t["canvas_alt"], radius=999)
            c.text(cx + 10, y + 224, chip, 10, True, c.t["muted"])
            cx += cw2 + 8
    y += 260 + 12

    panel = DATA["ENGAGEMENT_PANEL"]
    lw = CONTENT - 420
    c.rect(GUTTER, y, lw, 320, fill=c.t["card"], outline=c.t["border_soft"], radius=14)
    c.text(GUTTER + 24, y + 24, panel["date"], 10, True, c.t["muted_gray"])
    c.text(GUTTER + 24, y + 48, panel["heading"], 22, True, c.t["ink"])
    for i, event in enumerate(panel["events"]):
        ey = y + 100 + i * 44
        c.rect(GUTTER + 28, ey + 6, 10, 10,
               fill=c.t["accent"] if i == len(panel["events"]) - 1 else c.t["border"],
               radius=999)
        if i < len(panel["events"]) - 1:
            c.d.line([(c.s(GUTTER + 33), c.s(ey + 18)), (c.s(GUTTER + 33), c.s(ey + 46))],
                     fill=c.t["border_soft"], width=c.s(1))
        c.text(GUTTER + 56, ey, event["time"], 12, True, c.t["muted"])
        c.text(GUTTER + 110, ey, event["label"], 14, True, c.t["ink"])
        c.text(GUTTER + 320, ey + 2, event["detail"], 12, False, c.t["muted_slate"])
    c.button(GUTTER + 24, y + 268, panel["cta"]["label"], True, 12)

    checklist = DATA["ONBOARDING_CHECKLIST"]
    ox = GUTTER + lw + 12
    c.rect(ox, y, 408, 320, fill=c.t["surface_accent"],
           outline=c.t["border_strong"], radius=14)
    c.text(ox + 24, y + 24, checklist["title"].upper(), 10, True, c.t["ink_accent"])
    c.rect(ox + 330, y + 18, 54, 24, fill=c.t["accent"], radius=999)
    c.text(ox + 342, y + 24, checklist["progress"], 10, True, c.t["on_accent"])
    for i, item in enumerate(checklist["items"]):
        iy = y + 66 + i * 50
        c.rect(ox + 20, iy, 368, 42, fill=c.t["card"],
               outline=c.t["border_soft"], radius=8)
        c.text(ox + 40, iy + 12, item["label"], 12, item["state"] != "Done", c.t["ink"])
        c.rect(ox + 318, iy + 9, 60, 24,
               fill=c.t["mint"] if item["state"] == "Done" else c.t["surface_muted"],
               radius=4)
        c.text(ox + 330, iy + 15, item["state"], 10, True,
               c.t["success"] if item["state"] == "Done" else c.t["muted_slate"])
    return y + 320 + 120


def integrations(c, y):
    section = DATA["INTEGRATIONS_SECTION"]
    c.eyebrow(y, section["eyebrow"])
    y = c.heading_center(y + 20, section["titleBefore"], section["titleAfter"], 54)
    y = c.wrap_center(y, section["intro"], 18, CONTENT - 640, c.t["ink_soft"]) + 50

    cards = DATA["INTEGRATION_CARDS"]
    cardw = (CONTENT - 3 * 10) / 4
    for i, card in enumerate(cards):
        x = GUTTER + (i % 4) * (cardw + 10)
        cy = y + (i // 4) * 150
        c.rect(x, cy, cardw, 140, fill=c.t["card"], outline=c.t["border_soft"], radius=14)
        c.rect(x + 18, cy + 18, 36, 36, fill=c.t["surface_accent"], radius=4)
        # Icon stand-in. The real page renders a lucide glyph here; Pillow has
        # no icon font, and an empty tile reads as a broken image rather than
        # a deliberate one.
        c.rect(x + 28, cy + 28, 16, 16, fill=c.t["accent"], radius=3)
        c.text(x + 18, cy + 68, card["name"], 16, True, c.t["ink"])
        c.wrap(x + 18, cy + 94, card["copy"], 12, cardw - 36, c.t["muted_slate"])
    y += ((len(cards) + 3) // 4) * 150 + 10
    cta = section["cta"]["label"]
    c.text((W - c.width(cta, 14, True)) / 2, y, cta, 14, True, c.t["ink_accent"])
    return y + 120


def teams(c, y):
    section = DATA["TEAMS_SECTION"]
    c.eyebrow(y, section["eyebrow"])
    y = c.heading_center(y + 20, section["titleBefore"], section["titleAfter"], 54)
    y = c.wrap_center(y, section["intro"], 18, CONTENT - 640, c.t["ink_soft"]) + 50

    for card in DATA["TEAM_CARDS"]:
        c.rect(GUTTER, y, CONTENT, 170, fill=c.t["card"],
               outline=c.t["border_soft"], radius=14)
        c.text(GUTTER + 28, y + 44, card["index"], 48, True, c.t["border"])
        c.text(GUTTER + 150, y + 26, card["label"].upper(), 10, True, c.t["muted"])
        c.wrap(GUTTER + 150, y + 48, card["title"], 20, 700, c.t["ink"], 1.2, True)
        c.wrap(GUTTER + 150, y + 96, card["copy"], 13, 700, c.t["ink_soft"])
        c.d.line([(c.s(GUTTER + 900), c.s(y + 30)), (c.s(GUTTER + 900), c.s(y + 140))],
                 fill=c.t["border_soft"], width=c.s(1))
        c.text(GUTTER + 930, y + 50, card["detail"], 12, True, c.t["ink_accent"])
        c.text(GUTTER + 930, y + 78, card["templates"], 12, False, c.t["muted"])
        y += 170 + 10
    cta = section["cta"]["label"]
    c.text((W - c.width(cta, 14, True)) / 2, y + 10, cta, 14, True, c.t["ink_accent"])
    return y + 130


def pricing(c, y):
    section = DATA["PRICING_SECTION"]
    c.eyebrow(y, section["eyebrow"])
    y = c.heading_center(y + 20, section["titleBefore"], section["titleAfter"], 54)
    y = c.wrap_center(y, section["intro"], 18, CONTENT - 560, c.t["ink_soft"]) + 50

    # Tier names come from content; prices are read from live config at
    # render time, so this evidence shows "$0" and "config" rather than a
    # number that could drift from what the operator charges.
    # Prices are read from live Razorpay config at render time, so this
    # evidence cannot show a number. When billing is unconfigured the real
    # card shows PRICES_UNCONFIGURED_NOTE; mirror that rather than inventing
    # a placeholder price.
    note = DATA["PRICES_NOTE"]
    tiers = [
        ("Starter", "SOLO AND SMALL STUDIOS", "$0", "/ month",
         "The whole product, free, for as long as you like.", False),
        ("Team", "AGENCIES RUNNING CLIENT WORK", note, "",
         "The same product, billed per workspace through Razorpay.", True),
        ("Studio", "LARGER TEAMS AND PROCUREMENT", "Custom", "",
         "For multi-workspace rollouts, security review, invoicing.", False),
    ]
    cardw = (CONTENT - 2 * 12) / 3
    for i, (name, eyebrow, price, per, tagline, featured) in enumerate(tiers):
        x = GUTTER + i * (cardw + 12)
        c.rect(x, y, cardw, 330, fill=c.t["card"],
               outline=c.t["border_strong"] if featured else c.t["border_soft"],
               radius=14)
        c.text(x + 24, y + 26, eyebrow, 10, True, c.t["muted"])
        c.text(x + 24, y + 48, name, 22, True, c.t["ink"])
        if featured:
            badge = "MOST POPULAR"
            c.rect(x + cardw - c.width(badge, 10, True) - 44, y + 24,
                   c.width(badge, 10, True) + 20, 24, fill=c.t["accent"], radius=999)
            c.text(x + cardw - c.width(badge, 10, True) - 34, y + 30, badge, 10, True,
                   c.t["on_accent"])
        if len(price) > 20:
            c.wrap(x + 24, y + 112, price, 12, cardw - 48, c.t["muted_slate"])
        else:
            c.text(x + 24, y + 104, price, 54, True, c.t["ink"])
            c.text(x + 24 + c.width(price, 54, True) + 8, y + 138, per, 12, False,
                   c.t["muted"])
        c.wrap(x + 24, y + 172, tagline, 12, cardw - 48, c.t["ink_soft"])
        for j in range(3):
            c.rect(x + 24, y + 222 + j * 20, cardw - 100 - j * 40, 8,
                   fill=c.t["surface_muted"], radius=2)
        c.rect(x + 24, y + 276, cardw - 48, 40,
               fill=c.t["accent"] if featured else c.t["card"],
               outline=None if featured else c.t["border_strong"], radius=5)
        label = "Start free" if i == 0 else ("Start free" if i == 1 else "Talk to us")
        c.text(x + (cardw - c.width(label, 14, True)) / 2, y + 288, label, 14, True,
               c.t["on_accent"] if featured else c.t["ink"])
    y += 330 + 20
    cta = section["cta"]["label"]
    c.text((W - c.width(cta, 14, True)) / 2, y, cta, 14, True, c.t["ink_accent"])
    return y + 120


def faq(c, y):
    section = DATA["FAQ_SECTION"]
    c.eyebrow(y, section["eyebrow"])
    y = c.heading_center(y + 20, section["titleBefore"], section["titleAfter"], 54)
    intro = f"{section['intro']} {section['contact']['label']}."
    c.text((W - c.width(intro, 14)) / 2, y + 16, intro, 14, False, c.t["ink_soft"])
    y += 62
    for i, item in enumerate(DATA["FAQ"]):
        c.hline(y)
        c.text(GUTTER + 280, y + 22, item["q"], 18, True, c.t["ink"])
        c.d.ellipse([c.s(W - GUTTER - 262), c.s(y + 20), c.s(W - GUTTER - 238), c.s(y + 44)],
                    outline=c.t["border_strong"], width=c.s(1))
        c.text(W - GUTTER - 254, y + 24, "+", 14, True, c.t["accent"])
        if i == 0:
            c.wrap(GUTTER + 280, y + 58, item["a"], 14, CONTENT - 360, c.t["muted_slate"])
            y += 58 + 14 * 1.65 * (len(item["a"]) // 95 + 1) + 24
        else:
            y += 76
    c.hline(y)
    return y + 120


def closing(c, y):
    closing = DATA["CLOSING"]
    csize = min(c.fit(line, 64, CONTENT) for line in closing["lines"])
    for line in closing["lines"]:
        full = c.width(line, csize, True)
        c.text((W - full) / 2, y, line, csize, True, c.t["ink"])
        y += csize + 6
    y = c.wrap_center(y + 20, closing["intro"], 18, CONTENT - 640, c.t["ink_soft"]) + 26
    primary = c.width(closing["primaryCta"]["label"], 14, True) + 44
    secondary = c.width(closing["secondaryCta"]["label"], 14, True) + 44
    x = (W - primary - secondary - 12) / 2
    c.button(x, y, closing["primaryCta"]["label"], True)
    c.button(x + primary + 12, y, closing["secondaryCta"]["label"], False)
    y += 48 + 18
    note = closing["note"]
    c.text((W - c.width(note, 12)) / 2, y, note, 12, False, c.t["muted"])
    y += 56

    limitation = DATA["LIMITATION"]
    c.rect(GUTTER + 160, y, CONTENT - 320, 190, fill=c.t["card"],
           outline=c.t["border_soft"], radius=14)
    c.rect(GUTTER + 184, y + 24, 40, 40, fill=c.t["surface_muted"], radius=8)
    c.text(GUTTER + 244, y + 26, limitation["title"], 16, True, c.t["ink"])
    c.text(GUTTER + 244, y + 52, limitation["summary"], 14, True, c.t["ink_accent"])
    c.wrap(GUTTER + 244, y + 80, limitation["detail"], 14, CONTENT - 460, c.t["muted_slate"])
    c.text(GUTTER + 244, y + 152, limitation["hrefLabel"], 14, True, c.t["ink_accent"])
    return y + 190 + 120


def footer(c, y):
    footer = DATA["FOOTER"]
    c.rect(0, y, W, 240, fill=c.t["canvas"])
    c.hline(y)
    c.rect(GUTTER, y + 36, 28, 28, fill=c.t["accent"], radius=8)
    c.text(GUTTER + 40, y + 40, "roducq", 18, True, c.t["ink"])
    c.wrap(GUTTER, y + 84, footer["tagline"], 12, 320, c.t["muted_slate"])
    for i, column in enumerate(footer["columns"]):
        x = GUTTER + 420 + i * 200
        c.text(x, y + 36, column["title"].upper(), 10, True, c.t["muted_gray"])
        for j, link in enumerate(column["links"]):
            c.text(x, y + 66 + j * 28, link["label"], 14, False, c.t["muted_slate"])
    c.text(GUTTER + 860, y + 36, "LIMITS", 10, True, c.t["muted_gray"])
    c.wrap(GUTTER + 860, y + 66, footer["limits"], 12, 380, c.t["muted_slate"])
    c.hline(y + 176)
    c.text(GUTTER, y + 196, footer["legal"], 12, False, c.t["muted"])
    c.text(W - GUTTER - c.width(footer["built"], 12), y + 196, footer["built"], 12,
           False, c.t["muted"])
    return y + 240


def render(theme_name, path):
    c = Canvas(theme_name)
    marks = []

    def band(fn, alt=False):
        """Paint the band's wash first, then draw into it.

        Filling after the fact would cover the content with the background —
        the first draft of this script did exactly that and produced four
        empty bands. Each band paints generously downward and the next band
        overwrites the overshoot, so no band needs to pre-measure itself.
        """
        y0 = c.cursor
        c.d.rectangle(
            [0, c.s(y0), c.s(W), c.s(y0 + 3000)],
            fill=c.t["canvas_alt"] if alt else c.t["canvas"],
        )
        y = fn(c, y0)
        marks.append(y)
        c.cursor = y
        return y

    # Order matches app/(marketing)/page.tsx exactly.
    band(announcement)
    band(header)
    band(hero)
    band(features, alt=True)
    band(steps)
    band(integrations, alt=True)
    band(teams)
    band(pricing, alt=True)
    band(faq)
    band(closing, alt=True)
    band(footer)

    c.finish(c.cursor)
    c.save(path)
    print(f"wrote {path} ({c.img.size[0]}x{c.img.size[1]})")


if __name__ == "__main__":
    try:
        render("light", DOCS / "home-light.png")
        render("dark", DOCS / "home-dark.png")
    except FileNotFoundError as exc:
        sys.exit(
            f"Pillow or a DejaVu font is missing ({exc}).\n"
            "  python3 -m pip install pillow   # or: apt install fonts-dejavu-core"
        )
