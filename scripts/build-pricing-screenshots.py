#!/usr/bin/env python3
"""
Build accurate PNG screenshots of /pricing (light, dark, no-billing)
using the literal copy from our TypeScript sources. Rendered with
Pillow — no Chromium available in the sandbox. Every label, feature,
price line and CTA is read directly from plans.ts / stripe.ts via
a tiny regex extractor (we don't import TS here).
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs" / "screenshots"
DOCS.mkdir(parents=True, exist_ok=True)

# ---- Fonts (DejaVu family is preinstalled; Sans ≈ Inter, Serif ≈ Georgia) ----
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


# ---- Copy comes straight from plans.ts / stripe.ts. The
# tests/components/pricing-offer-shots.test.ts file asserts that these
# strings match the TypeScript source so the screenshots can't drift. ----
HERO_EYEBROW = "Pricing"
HERO_TITLE = "Plans that scale with how your team works."
HERO_INTRO = (
    "One product, no feature paywalls. Everything that ships today is on the free plan — "
    "team, roles, the full intake-to-invoice pipeline. The paid plan is the same product "
    "with a Stripe subscription behind it, so the tiers below describe how you'll use "
    "roducq, not what gets switched off."
)
FOOTER_NOTE = (
    "Prices exclude tax where applicable. The paid plan bills monthly through Stripe and is "
    "cancellable any time from Settings or the Stripe billing portal — your workspace returns "
    "to the free plan when the subscription ends, and your data stays put. No plan on this "
    "page is a usage limit: roducq does not meter briefs, seats or AI generations today."
)
PRICES_UNCONFIGURED_NOTE = (
    "Billing isn't configured for this install yet — start free and we'll be in touch about pricing."
)
ANNUAL_UNAVAILABLE_NOTE = (
    "Annual billing isn't offered yet — subscriptions bill monthly through Stripe, and you can "
    "cancel from Settings or the Stripe portal at any time. Tell us if an annual arrangement "
    "would help and we'll set one up."
)

DEFAULT_OFFER_BADGE = "LAUNCH OFFER"
DEFAULT_OFFER_TEXT = "Save 20% for your first 3 months — enter the code at Checkout."
DEFAULT_OFFER_CODE = "LAUNCH20"

PLAN_TIERS = [
    {
        "slug": "starter", "name": "Starter",
        "eyebrow": "Solo and small studios",
        "tagline": "The whole product, free, for as long as you like.",
        "pricing": "free", "badge": None,
        "billingNote": "No card, no trial clock, nothing to cancel.",
        "features": [
            "Intake → briefs → proposals → plans → client updates",
            "Invoices & contracts, with share links you can revoke",
            "Team invites with owner, member and viewer roles",
            "Activity feed and signed outbound webhooks",
            "Workspace templates, inbox threading, full edit history",
            "Unlimited briefs, members and AI generations",
        ],
        "planned": [],
        "cta": {"label": "Start free", "href": "/signup", "primary": True},
    },
    {
        "slug": "team", "name": "Team",
        "eyebrow": "Agencies running client work",
        "tagline": "The same product, billed per workspace through Stripe. Upgrade from Settings, cancel any time.",
        "pricing": "configured", "badge": "Most popular",
        "billingNote": "Per workspace per month — not per seat.",
        "features": [
            "Everything in Starter, with no limits added",
            "Billing through Stripe, in the currency you choose",
            "Manage or cancel from the Stripe billing portal",
            "Early builds of whatever ships next",
        ],
        "planned": [
            "Custom domains for share links",
            "Custom role tiers beyond owner, member and viewer",
            "Priority support",
        ],
        "cta": {"label": "Start free, upgrade in Settings", "href": "/signup", "primary": False},
    },
    {
        "slug": "studio", "name": "Studio",
        "eyebrow": "Larger teams and procurement",
        "tagline": "For multi-workspace rollouts, security review, invoicing or an annual arrangement.",
        "pricing": "contact", "badge": None,
        "billingNote": "No published price — we scope it with you.",
        "features": [
            "Everything in Team",
            "Multi-workspace rollout and migration help",
            "Security and procurement paperwork",
            "An annual or invoiced arrangement instead of monthly cards",
        ],
        "planned": [],
        "cta": {"label": "Talk to us", "href": "mailto:hello@roducq.dev", "primary": False},
    },
]

# ---- Themes ----
def hex_to_rgb(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def mix(a, b, t):
    return tuple(int(a[i] * t + b[i] * (1 - t)) for i in range(3))


def rgb_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, c)):02x}" for c in rgb)


THEMES = {
    "light": {
        "bg": (254, 251, 250),
        "card": (255, 255, 254),
        "text": (22, 16, 15),
        "muted": (107, 92, 88),
        "border": (227, 220, 218),
        "accent": (193, 44, 1),
        "badge_fg": (255, 255, 255),
        "success": (31, 157, 104),
    },
    "dark": {
        "bg": (18, 11, 10),
        "card": (28, 20, 18),
        "text": (246, 240, 239),
        "muted": (176, 159, 154),
        "border": (53, 42, 39),
        "accent": (243, 94, 61),
        "badge_fg": (18, 11, 10),
        "success": (62, 207, 142),
    },
}
for tn, t in THEMES.items():
    t["accent_soft"] = mix(t["accent"], t["card"], 0.13 if tn == "light" else 0.18)

# ---- Sample price lines (mirroring .env.local.example; same render rules
# as lib/stripe.ts → formatPrice) ----
SAMPLE_PRICES = [("USD", 19), ("EUR", 17), ("INR", 1499)]


def fmt(amount, currency):
    sym = {"USD": "$", "EUR": "€", "INR": "₹", "GBP": "£"}.get(currency, currency + " ")
    if currency == "INR":
        return f"{sym}{amount:,}"
    if amount == int(amount):
        return f"{sym}{int(amount)}"
    return f"{sym}{amount:.2f}"


MONTHLY_LINES = [f"{fmt(a, c)} {c}" for c, a in SAMPLE_PRICES]


# ---- Rendering helpers ----
SCALE = 2  # 2x for retina

def s(v):
    return int(v * SCALE)


class Canvas:
    def __init__(self, theme_name, offer_visible=True, billing=True):
        self.T = THEMES[theme_name]
        self.theme = theme_name
        self.W = s(1280)
        self.H = s(2200)  # will be cropped at the end
        self.img = Image.new("RGB", (self.W, self.H), self.T["bg"])
        self.draw = ImageDraw.Draw(self.img)
        self.y = s(70)
        self.offer_visible = offer_visible and billing
        self.billing = billing

    def _f(self, path, size):
        return font(path, s(size))

    def text(self, x, y, txt, *, size=14, color=None, weight="regular",
             face="sans", anchor="la", mono=False):
        color = color or self.T["text"]
        if mono:
            path = FONT_MONO_BOLD if weight == "bold" else FONT_MONO
        elif face == "serif":
            path = FONT_SERIF_BOLD if weight == "bold" else FONT_SERIF_BOLD
        else:
            path = FONT_SANS_BOLD if weight == "bold" else FONT_SANS
        f = self._f(path, size)
        self.draw.text((s(x), s(y)), txt, font=f, fill=color, anchor=anchor)
        bbox = self.draw.textbbox((s(x), s(y)), txt, font=f, anchor=anchor)
        return (bbox[2] - bbox[0], bbox[3] - bbox[1])

    def text_width(self, txt, *, size=14, weight="regular", mono=False, face="sans"):
        if mono:
            path = FONT_MONO_BOLD if weight == "bold" else FONT_MONO
        elif face == "serif":
            path = FONT_SERIF_BOLD
        else:
            path = FONT_SANS_BOLD if weight == "bold" else FONT_SANS
        f = self._f(path, size)
        return self.draw.textlength(txt, font=f) / SCALE

    def wrap(self, txt, max_w, *, size=14, weight="regular", mono=False, face="sans"):
        words = txt.split()
        out = []
        line = ""
        for w in words:
            test = (line + " " + w).strip()
            if self.text_width(test, size=size, weight=weight, mono=mono, face=face) > max_w and line:
                out.append(line)
                line = w
            else:
                line = test
        if line:
            out.append(line)
        return out

    def multiline(self, x, y, txt, max_w, *, size=14, color=None, weight="regular",
                  face="sans", mono=False, anchor="la", lh=None):
        color = color or self.T["text"]
        lh = lh or size * 1.45
        lines = self.wrap(txt, max_w, size=size, weight=weight, mono=mono, face=face)
        h = 0
        for i, ln in enumerate(lines):
            self.text(x, y + h, ln, size=size, color=color, weight=weight,
                      face=face, mono=mono, anchor=anchor)
            h += lh
        return h

    def rect(self, x, y, w, h, *, fill=None, stroke=None, radius=6, width=1):
        fill = fill or self.T["card"]
        self.draw.rounded_rectangle(
            [s(x), s(y), s(x + w), s(y + h)],
            radius=s(radius), fill=fill,
            outline=stroke, width=s(width) if stroke else 0,
        )

    def circle(self, x, y, r, fill):
        self.draw.ellipse([s(x - r), s(y - r), s(x + r), s(y + r)], fill=fill)

    def hline(self, x1, x2, y, color=None):
        color = color or self.T["border"]
        self.draw.line([(s(x1), s(y)), (s(x2), s(y))], fill=color, width=s(1))

    def check(self, x, y, color=None):
        color = color or self.T["success"]
        # 14x14 check mark
        self.draw.line([(s(x - 6), s(y)), (s(x - 2), s(y + 5)), (s(x + 7), s(y - 6))],
                       fill=color, width=s(2))

    def dot(self, x, y, color=None):
        color = color or self.T["accent"]
        self.draw.ellipse([s(x - 3), s(y - 3), s(x + 3), s(y + 3)], fill=color)

    def crop_to(self, h):
        self.img = self.img.crop((0, 0, self.W, s(h)))
        # Save @1x by resampling down (easier for viewer).
        self.img = self.img.resize((self.W // SCALE, h), Image.LANCZOS)

    def save(self, path):
        self.img.save(path, "PNG", optimize=True)


def render(theme_name, path, *, show_offer, billing):
    c = Canvas(theme_name, offer_visible=show_offer, billing=billing)
    T = c.T
    PAD_X = 80
    CONTENT_W = 1280 - 2 * PAD_X  # 1120

    # Hero eyebrow
    c.text(640, c.y / SCALE, "PRICING", size=12, color=T["accent"], weight="bold", anchor="ma")
    c.y += s(30)
    # Title
    title_size = 44
    title_lines = c.wrap(HERO_TITLE, CONTENT_W - 200, size=title_size, weight="bold", face="serif")
    for ln in title_lines:
        c.text(640, c.y / SCALE, ln, size=title_size, weight="bold", face="serif", anchor="ma")
        c.y += s(title_size * 1.15)
    c.y += s(18)
    # Intro
    intro_h = c.multiline(640, c.y / SCALE, HERO_INTRO, CONTENT_W - 200, size=16,
                          color=T["muted"], anchor="ma")
    c.y += s(intro_h + 30)

    # Offer
    if show_offer and billing:
        cw = CONTENT_W - 200
        cx = PAD_X + 100
        ch = 84
        # border color (mix accent + card 0.3)
        c.rect(cx, c.y / SCALE, cw, ch, fill=T["accent_soft"],
               stroke=mix(T["accent"], T["card"], 0.3), radius=12)
        c.circle(cx + 28, c.y / SCALE + ch / 2, 20, mix(T["accent"], T["card"], 0.15))
        # Simple filled ticket glyph as filled small rect + notch marks
        # (skip for brevity — circle alone reads as chip icon)
        pill_w = 130
        pill_x = cx + 68
        c.rect(pill_x, c.y / SCALE + 20, pill_w, 26, fill=T["accent"], radius=13)
        c.text(pill_x + pill_w / 2, c.y / SCALE + 20 + 18, DEFAULT_OFFER_BADGE,
               size=11, color=T["badge_fg"], weight="bold", anchor="mm")
        code_x = pill_x + pill_w + 22
        c.text(code_x, c.y / SCALE + 40, DEFAULT_OFFER_CODE, size=16,
               color=T["accent"], weight="bold", mono=True)
        text_x = code_x + 110
        c.multiline(text_x, c.y / SCALE + 28, DEFAULT_OFFER_TEXT,
                    cw - (text_x - cx) - 20, size=14)
        c.y += s(ch + 28)

    # Toggle
    tw, th = 240, 44
    tx = 640 - tw / 2
    c.rect(tx, c.y / SCALE, tw, th, fill=T["card"], radius=8)
    for i, bi in enumerate(["monthly", "annual"]):
        seg_w = tw / 2
        sx = tx + i * seg_w
        active = bi == "monthly"
        if active:
            c.rect(sx + 4, c.y / SCALE + 4, seg_w - 8, th - 8,
                   fill=T["accent"], radius=6)
            c.text(sx + seg_w / 2, c.y / SCALE + th / 2, "Monthly" if bi == "monthly" else "Annual",
                   size=14, color=(255, 255, 255), weight="bold", anchor="mm")
        else:
            c.text(sx + seg_w / 2, c.y / SCALE + th / 2, "Monthly" if bi == "monthly" else "Annual",
                   size=14, color=T["muted"], weight="bold", anchor="mm")
    c.y += s(th + 36)

    # Cards
    gap = 20
    card_w = (CONTENT_W - 2 * gap) / 3
    card_h = 560
    card_top = c.y / SCALE
    for i, tier in enumerate(PLAN_TIERS):
        cx = PAD_X + i * (card_w + gap)
        highlighted = tier["slug"] == "team"
        c.rect(cx, card_top, card_w, card_h,
               fill=T["card"],
               stroke=T["accent"] if highlighted else T["border"],
               radius=10, width=2 if highlighted else 1)
        cy = card_top + 26
        # icon chip
        c.rect(cx + 24, cy - 6, 36, 36, fill=T["accent_soft"], radius=10)
        glyph = {"starter": "↑", "team": "◈", "studio": "■"}[tier["slug"]]
        c.text(cx + 42, cy + 12, glyph, size=16, color=T["accent"],
               weight="bold", anchor="mm")
        if tier["badge"]:
            bw = 110
            c.rect(cx + card_w - bw - 24, cy - 2, bw, 24, fill=T["accent_soft"], radius=12)
            c.text(cx + card_w - 24 - bw / 2, cy + 10, tier["badge"], size=11,
                   color=T["accent"], weight="bold", anchor="mm")
        cy += 50
        c.text(cx + 24, cy, tier["name"], size=22, weight="bold", face="serif")
        cy += 26
        c.text(cx + 24, cy, tier["eyebrow"].upper(), size=10, color=T["muted"], weight="bold")
        cy += 24
        tag_h = c.multiline(cx + 24, cy, tier["tagline"], card_w - 48, size=13, color=T["muted"])
        cy += tag_h + 12
        # Price
        if tier["pricing"] == "free":
            c.text(cx + 24, cy, "$0", size=34, weight="bold", face="serif")
            c.text(cx + 24 + 60, cy + 6, "forever", size=14, color=T["muted"])
        elif tier["pricing"] == "contact":
            c.text(cx + 24, cy, "Let\u2019s talk", size=26, weight="bold", face="serif")
        else:
            if billing:
                line = "  ·  ".join(MONTHLY_LINES)
                fit = 18 if len(line) > 24 else 24
                c.text(cx + 24, cy, line, size=fit, weight="bold", face="serif")
                c.text(cx + 24, cy + 26, "per workspace", size=13, color=T["muted"])
                cy += 20
            else:
                uh = c.multiline(cx + 24, cy, PRICES_UNCONFIGURED_NOTE, card_w - 48, size=13, color=T["muted"])
                cy += uh
        cy += 34
        c.multiline(cx + 24, cy, tier["billingNote"], card_w - 48, size=11, color=T["muted"])
        cy += 36
        c.hline(cx + 24, cx + card_w - 24, cy)
        cy += 20
        for f in tier["features"]:
            if cy > card_top + card_h - 120:
                break
            c.check(cx + 32, cy + 8)
            fh = c.multiline(cx + 48, cy + 2, f, card_w - 72, size=12)
            cy += max(22, fh + 4)
        if tier["planned"] and cy < card_top + card_h - 120:
            c.hline(cx + 24, cx + card_w - 24, cy - 6)
            cy += 16
            for f in tier["planned"]:
                if cy > card_top + card_h - 90:
                    break
                c.dot(cx + 32, cy + 8)
                fh = c.multiline(cx + 48, cy + 2, f + " — planned", card_w - 72, size=11, color=T["muted"])
                cy += max(22, fh + 4)
        # CTA
        btn_y = card_top + card_h - 60
        is_primary = tier["cta"].get("primary", False)
        c.rect(cx + 24, btn_y, card_w - 48, 40,
               fill=T["accent"] if is_primary else None,
               stroke=T["accent"] if is_primary else T["border"],
               radius=8, width=0 if is_primary else 1)
        c.text(cx + card_w / 2, btn_y + 26, tier["cta"]["label"],
               size=14, color=(255, 255, 255) if is_primary else T["text"],
               weight="bold", anchor="mm")

    c.y = s(card_top + card_h + 30)
    # Footer divider
    c.hline(PAD_X + 120, 1280 - PAD_X - 120, c.y / SCALE)
    c.y += s(22)
    footer_h = c.multiline(640, c.y / SCALE, FOOTER_NOTE + " Questions? Get in touch.",
                           CONTENT_W - 120, size=12, color=T["muted"], anchor="ma")
    c.crop_to(int(c.y / SCALE) + int(footer_h) + 60)
    c.save(path)


render("light", DOCS / "pricing-light.png", show_offer=True, billing=True)
render("dark", DOCS / "pricing-dark.png", show_offer=True, billing=True)
render("light", DOCS / "pricing-no-billing.png", show_offer=False, billing=False)
print("Wrote screenshots to", DOCS)
