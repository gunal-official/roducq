#!/usr/bin/env python3
"""
Build accurate PNG screenshots of the redesigned home page (light + dark)
using the literal copy from our TypeScript sources.

Rendered with Pillow — no Chromium in the sandbox — at 2x and resampled to
1x, matching scripts/build-pricing-screenshots.py so both sets of evidence
in docs/screenshots look like the same product.

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

# ---- Approximation fonts for this Pillow-only evidence renderer -------------
# Production uses self-hosted Source Sans 3 / Playfair Display / Fira Code.
# DejaVu is preinstalled in the sandbox, so these screenshots approximate
# those families without depending on a browser or system font installation.
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


# ── Copy: read from the real TypeScript sources, never re-typed ──────────────

def load_content():
    """Import the live content modules through jiti and dump them as JSON."""
    script = r"""
const jiti = require('jiti')(process.argv[1]);
const content = jiti(process.argv[2]);
const vs = jiti(process.argv[3]);
process.stdout.write(JSON.stringify({
  HERO: content.HERO,
  RAIL: content.RAIL,
  PIPELINE_SECTION: content.PIPELINE_SECTION,
  PIPELINE: content.PIPELINE,
  FEATURES_SECTION: content.FEATURES_SECTION,
  FEATURES: content.FEATURES,
  COMPARE: content.COMPARE,
  PRICING_TEASER: content.PRICING_TEASER,
  CLOSING: content.CLOSING,
  LIMITATION: content.LIMITATION,
  COMPETITORS: vs.VS_PAGE_LIST.map((e) => e.competitor),
}));
"""
    out = subprocess.run(
        [
            "node",
            "-e",
            script,
            str(ROOT / "package.json"),
            str(ROOT / "app/(marketing)/home/content.ts"),
            str(ROOT / "app/(marketing)/vs/[slug]/vs-pages.ts"),
        ],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(out.stdout)


C = load_content()

HERO = C["HERO"]
RAIL = C["RAIL"]
PIPELINE_SECTION = C["PIPELINE_SECTION"]
PIPELINE = C["PIPELINE"]
FEATURES_SECTION = C["FEATURES_SECTION"]
FEATURES = C["FEATURES"]
COMPARE = C["COMPARE"]
PRICING_TEASER = C["PRICING_TEASER"]
CLOSING = C["CLOSING"]
LIMITATION = C["LIMITATION"]
COMPETITORS = C["COMPETITORS"]

# Glyphs for the 40x40 icon tiles, keyed by the IconKey in content.ts. They
# mirror the ICONS map in page.tsx (lucide has no DejaVu equivalent here).
GLYPH = {
    "intake": "\u2709", "brief": "\u2637", "proposal": "\u25a3",
    "plan": "\u2630", "update": "\u25b6", "share": "\u21bb",
    "template": "\u25a4", "money": "\u25a5", "time": "\u25ce",
    "search": "\u2315", "plug": "\u25c8", "compare": "\u2696",
    "warning": "\u26a0",
}


# ── Themes (app/globals.css, same values as build-pricing-screenshots.py) ────

def hex_to_rgb(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def mix(a, b, t):
    return tuple(int(a[i] * t + b[i] * (1 - t)) for i in range(3))


THEMES = {
    "light": {
        "bg": (250, 250, 249),          # --ember-background #fafaf9
        "band": (231, 229, 228),        # --ember-surface-raised #e7e5e4
        "card": (245, 245, 244),        # --ember-surface #f5f5f4
        "text": (28, 25, 23),           # --ember-text #1c1917
        "muted": (87, 83, 78),          # --ember-secondary-text #57534e
        "border": (214, 211, 209),      # --ember-border #d6d3d1
        "accent": (194, 65, 12),        # --ember-terracotta #c2410c
        "info": (47, 111, 237),
        "success": (31, 157, 104),
        "on_accent": (255, 255, 255),
    },
    "dark": {
        "bg": (28, 25, 23),             # --ember-background #1c1917
        "band": (68, 64, 60),           # --ember-surface-raised #44403c
        "card": (41, 37, 36),           # --ember-surface #292524
        "text": (250, 250, 249),        # --ember-text #fafaf9
        "muted": (231, 229, 228),       # --ember-secondary-text #e7e5e4
        "border": (87, 83, 78),         # --ember-border #57534e
        "accent": (251, 146, 60),       # --ember-terracotta #fb923c
        "info": (96, 165, 250),
        "success": (74, 222, 128),
        "on_accent": (28, 25, 23),
    },
}
for _t in THEMES.values():
    _pct = 0.12 if _t["bg"][0] > 128 else 0.18
    for _name in ("accent", "info", "success"):
        # color-mix(in srgb, var(--x) 12%, var(--card)) — the soft token
        _t[_name + "_soft"] = mix(_t[_name], _t["card"], _pct)


# ── Canvas ───────────────────────────────────────────────────────────────────
#
# Content is drawn onto a transparent layer; the alternating section bands are
# painted onto the background afterwards and the two are composited. That way
# each section draws once, in order, with no measure-then-redraw pass.

SCALE = 2  # render at 2x, ship at 1x
W, PAD = 1280, 80
CW = W - 2 * PAD  # 1120 content width
CARD_R = 12  # --radius-surface: cards and icon chips use 12px


def s(v):
    return int(round(v * SCALE))


class Canvas:
    def __init__(self, theme_name):
        self.T = THEMES[theme_name]
        self.W, self.H = s(W), s(5200)
        self.layer = Image.new("RGBA", (self.W, self.H), (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.layer)
        self.bands = []  # (y0, y1, muted)

    # -- text ---------------------------------------------------------------

    def _font(self, *, size=14, weight="regular", face="sans", mono=False):
        if mono:
            path = FONT_MONO_BOLD
        elif face == "serif":
            path = FONT_SERIF_BOLD
        else:
            path = FONT_SANS_BOLD if weight == "bold" else FONT_SANS
        return ImageFont.truetype(path, s(size))

    def width(self, txt, **kw):
        return self.draw.textlength(txt, font=self._font(**kw)) / SCALE

    def text(self, x, y, txt, *, color=None, anchor="la", **kw):
        f = self._font(**kw)
        self.draw.text((s(x), s(y)), txt, font=f,
                       fill=color if color is not None else self.T["text"],
                       anchor=anchor)

    def wrap(self, txt, max_w, **kw):
        lines, line = [], ""
        for word in txt.split():
            test = (line + " " + word).strip()
            if line and self.width(test, **kw) > max_w:
                lines.append(line)
                line = word
            else:
                line = test
        if line:
            lines.append(line)
        return lines

    def para(self, x, y, txt, max_w, *, size=14, color=None, anchor="la",
             lh=None, **kw):
        """Wrapped paragraph. Returns the height it used."""
        lh = lh or size * 1.5
        lines = self.wrap(txt, max_w, size=size, **kw)
        for i, ln in enumerate(lines):
            self.text(x, y + i * lh, ln, size=size,
                      color=color if color is not None else self.T["muted"],
                      anchor=anchor, **kw)
        return len(lines) * lh

    # -- shapes -------------------------------------------------------------

    def rect(self, x, y, w, h, *, fill=None, stroke=None, radius=CARD_R,
             width=1):
        self.draw.rounded_rectangle(
            [s(x), s(y), s(x + w), s(y + h)],
            radius=s(radius),
            fill=fill if fill is not None else self.T["card"],
            outline=stroke,
            width=s(width) if stroke else 0,
        )

    def hline(self, y, color=None, width=1):
        self.draw.line([(0, s(y)), (self.W, s(y))],
                       fill=color or self.T["border"], width=s(width))

    def pill(self, x, y, label, *, size=12, pad_x=14, height=30, fill=None,
             stroke=None, fg=None):
        w = self.width(label, size=size) + pad_x * 2
        self.rect(x, y, w, height, fill=fill or self.T["card"],
                  stroke=stroke or self.T["border"], radius=height / 2)
        self.text(x + pad_x, y + height / 2, label, size=size,
                  color=fg or self.T["text"], anchor="lm")
        return w

    def pills(self, items, x, y, max_w, *, gap=8, height=30, **kw):
        """A wrapping row of pills. Returns the height it used."""
        size = kw.get("size", 12)
        pad_x = kw.get("pad_x", 14)
        cx, top = x, y
        for label in items:
            w = self.width(label, size=size) + pad_x * 2
            if cx + w > x + max_w and cx > x:
                cx, top = x, top + height + gap
            self.pill(cx, top, label, height=height, **kw)
            cx += w + gap
        return (top - y) + height

    def button(self, x, y, label, *, primary=True, w=None, size=16):
        T = self.T
        h = 48
        w = w or self.width(label, size=size, weight="bold") + 64
        self.rect(x, y, w, h, fill=T["accent"] if primary else T["card"],
                  stroke=None if primary else T["border"], radius=8)
        self.text(x + w / 2, y + h / 2, label, size=size, weight="bold",
                  color=T["on_accent"] if primary else T["text"], anchor="mm")
        return w

    def chip(self, x, y, tone, glyph):
        """The 40x40 tinted icon tile (.icon-chip + a TONE_CHIP_CLASS tint)."""
        T = self.T
        self.rect(x, y, 40, 40, fill=T[tone + "_soft"], radius=CARD_R)
        self.text(x + 20, y + 20, glyph, size=17, color=T[tone], anchor="mm")

    # -- bands + output -----------------------------------------------------

    def band(self, y0, y1, muted=True):
        self.bands.append((y0, y1, muted))

    def finish(self, height):
        T = self.T
        bg = Image.new("RGBA", (self.W, self.H), T["bg"] + (255,))
        for y0, y1, muted in self.bands:
            if muted:
                bg_draw = ImageDraw.Draw(bg)
                bg_draw.rectangle([0, s(y0), self.W, s(y1)],
                                  fill=T["band"] + (255,))
        out = Image.alpha_composite(bg, self.layer).convert("RGB")
        out = out.crop((0, 0, self.W, s(height)))
        self.img = out.resize((W, int(height)), Image.LANCZOS)

    def save(self, path):
        self.img.save(path, "PNG", optimize=True)


# ── Section renderers: A → G ─────────────────────────────────────────────────

def eyebrow(c, x, y, label):
    c.text(x, y, label.upper(), size=12, weight="bold", color=c.T["accent"])


def section_head(c, x, y, section, body_w=CW - 240):
    """Eyebrow + display title + intro. Returns the new y."""
    eyebrow(c, x, y, section["eyebrow"])
    y += 22
    c.text(x, y, section["title"], size=30, weight="bold", face="serif")
    y += 42
    return y + c.para(x, y, section["intro"], body_w, size=14,
                      color=c.T["muted"])


def hero(c, y):
    """A. Hero — eyebrow pill, display H1, intro, two CTAs, note."""
    T = c.T
    y += 64
    ew = c.width(HERO["eyebrow"], size=12, weight="bold") + 28
    c.rect(W / 2 - ew / 2, y, ew, 26, fill=T["accent_soft"], radius=13)
    c.text(W / 2, y + 13, HERO["eyebrow"], size=12, weight="bold",
           color=T["accent"], anchor="mm")
    y += 26 + 36

    for ln in c.wrap(HERO["title"], CW - 240, size=56, weight="bold",
                     face="serif"):
        c.text(W / 2, y, ln, size=56, weight="bold", face="serif", anchor="ma")
        y += 64
    y += 12

    y += c.para(W / 2, y, HERO["intro"], CW - 320, size=15, color=T["muted"],
                anchor="ma") + 40

    w1 = c.width(HERO["primaryCta"]["label"], size=16, weight="bold") + 64
    w2 = c.width(HERO["secondaryCta"]["label"], size=16, weight="bold") + 64
    gap = 12
    left = W / 2 - (w1 + gap + w2) / 2
    c.button(left, y, HERO["primaryCta"]["label"], primary=True, w=w1)
    c.button(left + w1 + gap, y, HERO["secondaryCta"]["label"], primary=False,
             w=w2)
    y += 48 + 18

    c.text(W / 2, y, HERO["note"], size=12, color=T["muted"], anchor="ma")
    return y + 24 + 64


def rail(c, y):
    """B. Capability rail — centred lead-in plus a wrapping row of chips."""
    y += 40
    # RAIL.lead is rendered uppercase + tracked out by the page's classes.
    y += c.para(W / 2, y, RAIL["lead"].upper(), CW, size=12, weight="bold",
                color=c.T["muted"], anchor="ma")
    y += 20
    y += c.pills(RAIL["items"], PAD, y, CW, size=12, pad_x=14, gap=8)
    return y + 40


def pipeline(c, y):
    """C. The pipeline — five equal cards on a muted band."""
    T = c.T
    y += 64
    y = section_head(c, PAD, y, PIPELINE_SECTION) + 32

    gap = 16
    cw = (CW - 4 * gap) / 5
    top = y
    body_h = max(len(c.wrap(p["copy"], cw - 32, size=12)) for p in PIPELINE)
    card_h = 20 + 40 + 12 + 20 + 26 + body_h * 18 + 24

    for i, step in enumerate(PIPELINE):
        tone = step["tone"]
        cx = PAD + i * (cw + gap)
        c.rect(cx, top, cw, card_h, fill=T["card"], stroke=T["border"])
        c.rect(cx, top, cw, 4, fill=T[tone], radius=2)
        c.chip(cx + 16, top + 20, tone, GLYPH.get(step["icon"], "\u25a0"))
        sy = top + 20 + 40 + 12
        c.text(cx + 16, sy, f"STEP {step['step']}", size=11, weight="bold",
               color=T["muted"])
        c.text(cx + 16, sy + 20, step["title"], size=17, weight="bold",
               face="serif")
        for j, ln in enumerate(c.wrap(step["copy"], cw - 32, size=12)):
            c.text(cx + 16, sy + 46 + j * 18, ln, size=12, color=T["muted"])

    return top + card_h + 64


def features(c, y):
    """D. Feature grid — six cards, three per row."""
    T = c.T
    y += 64
    y = section_head(c, PAD, y, FEATURES_SECTION) + 32

    gap = 16
    fw = (CW - 2 * gap) / 3
    top = y
    rows = [FEATURES[0:3], FEATURES[3:6]]
    heights = [
        max(len(c.wrap(f["copy"], fw - 32, size=12)) for f in row)
        for row in rows
    ]
    row_h = [20 + 40 + 14 + 26 + h * 18 + 20 for h in heights]

    for r, row in enumerate(rows):
        for i, feat in enumerate(row):
            cx = PAD + i * (fw + gap)
            cy = top + sum(row_h[:r]) + r * gap
            c.rect(cx, cy, fw, row_h[r], fill=T["card"], stroke=T["border"])
            c.chip(cx + 16, cy + 20, feat["tone"],
                   GLYPH.get(feat["icon"], "\u25a0"))
            c.text(cx + 16, cy + 20 + 40 + 14, feat["title"], size=16,
                   weight="bold", face="serif")
            for j, ln in enumerate(c.wrap(feat["copy"], fw - 32, size=12)):
                c.text(cx + 16, cy + 20 + 40 + 14 + 26 + j * 18, ln, size=12,
                       color=T["muted"])

    return top + sum(row_h) + gap + 64


def compare(c, y):
    """E. Compare teaser — icon tile, heading, competitor chips, /vs link."""
    T = c.T
    y += 64
    c.chip(PAD, y, "accent", GLYPH["compare"])
    y += 4
    eyebrow(c, PAD + 52, y, COMPARE["eyebrow"])
    y += 22 + 4
    c.text(PAD + 52, y, COMPARE["title"], size=30, weight="bold", face="serif")
    y += 42
    y += c.para(PAD, y, COMPARE["intro"], CW - 240, size=14,
                color=T["muted"]) + 24
    y += c.pills([f"roducq vs {n}" for n in COMPETITORS], PAD, y, CW, size=13,
                 pad_x=16, gap=8, height=44) + 24
    label = COMPARE["cta"]["label"]
    c.text(PAD, y, label, size=14, weight="bold", color=T["accent"])
    c.draw.line([(s(PAD), s(y + 18)),
                 (s(PAD + c.width(label, size=14, weight="bold")), s(y + 18))],
                fill=T["accent"], width=s(1))
    return y + 26 + 64


def pricing_teaser(c, y):
    """F. Pricing teaser — heading, three bullets, /pricing button."""
    T = c.T
    y += 64
    y = section_head(c, PAD, y, PRICING_TEASER) + 24
    for bullet in PRICING_TEASER["bullets"]:
        c.draw.ellipse([s(PAD + 2), s(y + 6), s(PAD + 8), s(y + 12)],
                       fill=T["accent"])
        c.text(PAD + 20, y, bullet, size=14, color=T["text"])
        y += 28
    y += 16
    c.button(PAD, y, PRICING_TEASER["cta"]["label"], primary=False,
             w=c.width(PRICING_TEASER["cta"]["label"], size=16,
                       weight="bold") + 48)
    return y + 48 + 64


def closing(c, y):
    """G. Closing CTA + the honest-limits callout."""
    T = c.T
    y += 64
    for ln in c.wrap(CLOSING["title"], CW - 320, size=30, weight="bold",
                     face="serif"):
        c.text(W / 2, y, ln, size=30, weight="bold", face="serif", anchor="ma")
        y += 38
    y += 10
    y += c.para(W / 2, y, CLOSING["intro"], CW - 480, size=14,
                color=T["muted"], anchor="ma") + 32

    w1 = c.width(CLOSING["primaryCta"]["label"], size=16, weight="bold") + 64
    w2 = c.width(CLOSING["secondaryCta"]["label"], size=16, weight="bold") + 64
    gap = 12
    left = W / 2 - (w1 + gap + w2) / 2
    c.button(left, y, CLOSING["primaryCta"]["label"], primary=True, w=w1)
    c.text(left + w1 + gap + w2 / 2, y + 24, CLOSING["secondaryCta"]["label"],
           size=16, weight="bold", color=T["text"], anchor="mm")
    y += 48 + 48

    card_w = min(CW, 900)
    card_x = PAD + (CW - card_w) / 2
    detail = c.wrap(LIMITATION["detail"], card_w - 32 - 56, size=13)
    card_h = 20 + 20 + 26 + 24 + len(detail) * 20 + 18 + 20

    c.rect(card_x, y, card_w, card_h, fill=T["card"], stroke=T["border"])
    ly = y + 20
    c.rect(card_x + 20, ly, 40, 40, fill=T["band"], radius=CARD_R)
    c.text(card_x + 40, ly + 20, GLYPH["warning"], size=17, color=T["muted"],
           anchor="mm")
    tx = card_x + 20 + 40 + 16
    ty = ly + 2
    c.text(tx, ty, LIMITATION["title"], size=16, weight="bold", face="serif")
    ty += 26
    c.text(tx, ty, LIMITATION["summary"], size=13, color=T["accent"], mono=True)
    ty += 24
    for ln in detail:
        c.text(tx, ty, ln, size=13, color=T["muted"])
        ty += 20
    ty += 4
    label = LIMITATION["hrefLabel"]
    c.text(tx, ty, label, size=13, weight="bold", color=T["accent"])
    c.draw.line([(s(tx), s(ty + 18)),
                 (s(tx + c.width(label, size=13, weight="bold")), s(ty + 18))],
                fill=T["accent"], width=s(1))

    return y + card_h + 64


def render(theme_name, path):
    c = Canvas(theme_name)
    y = 0

    y0 = y
    y = hero(c, y)
    c.band(y0, y, muted=True)
    c.hline(y)

    y0 = y
    y = rail(c, y)
    c.band(y0, y, muted=False)
    c.hline(y)

    y0 = y
    y = pipeline(c, y)
    c.band(y0, y, muted=True)
    c.hline(y)

    y0 = y
    y = features(c, y)
    c.band(y0, y, muted=False)
    c.hline(y)

    y0 = y
    y = compare(c, y)
    c.band(y0, y, muted=True)
    c.hline(y)

    y0 = y
    y = pricing_teaser(c, y)
    c.band(y0, y, muted=False)
    c.hline(y)

    y0 = y
    y = closing(c, y)
    c.band(y0, y, muted=True)

    c.finish(y)
    c.save(path)
    print(f"wrote {path} ({c.img.size[0]}x{c.img.size[1]})")


if __name__ == "__main__":
    try:
        render("light", DOCS / "home-light.png")
        render("dark", DOCS / "home-dark.png")
    except subprocess.CalledProcessError as exc:  # pragma: no cover
        print(exc.stderr, file=sys.stderr)
        raise
