#!/usr/bin/env python3
"""
Build accurate PNG screenshots of /pricing (light, dark, no-billing)
using the literal copy from our TypeScript sources (`app/(marketing)/pricing/plans.ts`
and `lib/razorpay.ts`).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs" / "screenshots"
DOCS.mkdir(parents=True, exist_ok=True)

FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


HERO_EYEBROW = "PRICING"
HERO_TITLE = "Plans that scale with how your team works."
HERO_INTRO = (
    "Start free. Upgrade when your team is ready to turn every client "
    "conversation into a plan everyone trusts."
)
FOOTER_ITEMS = (
    "No credit card required for trial  ·  Cancel anytime  ·  "
    "Your client data is never used to train models"
)
FOOTER_NOTE = (
    "Prices exclude tax where applicable. Account signup requires no credit card, and active "
    "Razorpay subscriptions can be cancelled anytime from Settings. Note: annual billing plans, "
    "per-tier quota enforcement, and third-party AI model-training opt-out attestations remain "
    "subject to commercial and payment configuration approval — roducq does not enforce a usage "
    "limit on briefs, seats, or AI generations in code today."
)
PRICES_UNCONFIGURED_NOTE = (
    "Live Razorpay checkout isn't configured for this environment yet — start free and upgrade "
    "from Settings once billing is enabled."
)

DEFAULT_OFFER_BADGE = "LAUNCH OFFER"
DEFAULT_OFFER_TEXT = "Save 20% for your first 3 months — use the code at Razorpay checkout."
DEFAULT_OFFER_CODE = "LAUNCH20"

PLAN_TIERS = [
    {
        "slug": "starter",
        "name": "Starter",
        "tagline": "For solo consultants and freelancers",
        "priceDisplay": "$29",
        "cadence": "/ month",
        "seatsLabel": "1 seat",
        "additionalSeatsLabel": None,
        "badge": None,
        "featuresHeading": "INCLUDES",
        "features": [
            "15 briefs / month",
            "Intake workspace with source preservation",
            "AI-generated briefs with flagged gaps",
            "Basic proposal generation",
            "Community support",
        ],
        "cta": {"label": "Start free trial", "href": "/signup", "primary": False},
    },
    {
        "slug": "team",
        "name": "Team",
        "tagline": "For small agencies getting organized",
        "priceDisplay": "$79",
        "cadence": "/ month",
        "seatsLabel": "Up to 5 seats",
        "additionalSeatsLabel": "+$12/seat after 5 seats",
        "badge": "MOST POPULAR",
        "featuresHeading": "EVERYTHING IN STARTER, PLUS",
        "features": [
            "Unlimited briefs",
            "Task-plan generation with owners & due dates",
            "Client-update composer",
            "Shareable read-only brief links",
            "Full edit history & audit trail",
            "Priority email support",
        ],
        "cta": {"label": "Start free trial", "href": "/signup", "primary": True},
    },
    {
        "slug": "studio",
        "name": "Studio",
        "tagline": "For growing teams running full client operations",
        "priceDisplay": "$199",
        "cadence": "/ month",
        "seatsLabel": "Up to 15 seats",
        "additionalSeatsLabel": None,
        "badge": None,
        "featuresHeading": "EVERYTHING IN TEAM, PLUS",
        "features": [
            "Configurable brief, proposal & update templates",
            "Intake inbox with threaded sources",
            "Link revocation controls",
            "Higher AI usage caps",
            "Priority support & onboarding",
        ],
        "cta": {"label": "Talk to us", "href": "mailto:hello@roducq.dev", "primary": False},
    },
]


def mix(a, b, t):
    return tuple(int(a[i] * t + b[i] * (1 - t)) for i in range(3))


THEMES = {
    "light": {
        "bg": (249, 247, 252),          # --lm-canvas #f9f7fc
        "card": (255, 255, 255),        # --lm-card #ffffff
        "text": (27, 20, 38),           # --lm-ink #1b1426
        "muted": (75, 80, 95),          # --lm-ink-soft #4b505f
        "border": (227, 223, 236),      # --lm-pricing-neutral-border #e3dfec
        "accent": (201, 59, 20),        # --lm-pricing-accent #c93b14
        "highlight": (201, 59, 20),     # --lm-pricing-accent #c93b14
        "cta_light": (246, 244, 250),   # --lm-pricing-cta-light #f6f4fa
        "badge_fg": (255, 255, 255),
        "on_accent": (255, 255, 255),
        "success": (201, 59, 20),
    },
    "dark": {
        "bg": (27, 20, 38),             # --lm-canvas #1b1426
        "card": (33, 27, 41),           # --lm-card #211b29
        "text": (244, 240, 251),        # --lm-ink #f4f0fb
        "muted": (212, 202, 232),       # --lm-ink-soft #d4cae8
        "border": (56, 48, 74),         # --lm-pricing-neutral-border #38304a
        "accent": (255, 120, 79),       # --lm-pricing-accent #ff784f
        "highlight": (255, 120, 79),    # --lm-pricing-accent #ff784f
        "cta_light": (42, 34, 51),      # --lm-pricing-cta-light #2a2233
        "badge_fg": (27, 20, 38),
        "on_accent": (27, 20, 38),
        "success": (255, 120, 79),
    },
}
for tn, t in THEMES.items():
    t["accent_soft"] = mix(t["accent"], t["card"], 0.14 if tn == "light" else 0.22)
    t["highlight_soft"] = mix(t["highlight"], t["card"], 0.14)

SCALE = 2


def s(v):
    return int(v * SCALE)


class Canvas:
    def __init__(self, theme_name, offer_visible=True, billing=True):
        self.T = THEMES[theme_name]
        self.theme = theme_name
        self.W = s(1280)
        self.H = s(2200)
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
            path = FONT_SERIF_BOLD
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
        for ln in lines:
            self.text(x, y + h, ln, size=size, color=color, weight=weight,
                      face=face, mono=mono, anchor=anchor)
            h += lh
        return h

    def rect(self, x, y, w, h, *, fill=None, stroke=None, radius=12, width=1):
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
        self.draw.line([(s(x - 6), s(y)), (s(x - 2), s(y + 5)), (s(x + 7), s(y - 6))],
                       fill=color, width=s(2))

    def crop_to(self, h):
        self.img = self.img.crop((0, 0, self.W, s(h)))
        self.img = self.img.resize((self.W // SCALE, h), Image.LANCZOS)

    def save(self, path):
        self.img.save(path, "PNG", optimize=True)


def render(theme_name, path, *, show_offer, billing):
    c = Canvas(theme_name, offer_visible=show_offer, billing=billing)
    T = c.T
    PAD_X = 80
    CONTENT_W = 1280 - 2 * PAD_X

    # Eyebrow
    c.text(640, c.y / SCALE, HERO_EYEBROW, size=13, color=T["accent"], weight="bold", anchor="ma")
    c.y += s(28)

    # Title
    title_size = 44
    title_lines = c.wrap(HERO_TITLE, CONTENT_W - 200, size=title_size, weight="bold")
    for ln in title_lines:
        c.text(640, c.y / SCALE, ln, size=title_size, weight="bold", anchor="ma")
        c.y += s(title_size * 1.15)
    c.y += s(16)

    # Subtitle
    intro_h = c.multiline(640, c.y / SCALE, HERO_INTRO, CONTENT_W - 280, size=16,
                          color=T["muted"], anchor="ma")
    c.y += s(intro_h + 26)

    # Launch Offer Callout
    if show_offer and billing:
        cw = CONTENT_W - 200
        cx = PAD_X + 100
        ch = 76
        c.rect(cx, c.y / SCALE, cw, ch, fill=T["highlight_soft"],
               stroke=mix(T["highlight"], T["card"], 0.35), radius=12)
        c.circle(cx + 28, c.y / SCALE + ch / 2, 18, mix(T["highlight"], T["card"], 0.2))
        pill_w = 120
        pill_x = cx + 64
        c.rect(pill_x, c.y / SCALE + 16, pill_w, 24, fill=T["accent"], radius=12)
        c.text(pill_x + pill_w / 2, c.y / SCALE + 16 + 12, DEFAULT_OFFER_BADGE,
               size=10, color=T["badge_fg"], weight="bold", anchor="mm")
        code_x = pill_x + pill_w + 16
        c.text(code_x, c.y / SCALE + 28, DEFAULT_OFFER_CODE, size=14,
               color=T["accent"], weight="bold", mono=True, anchor="lm")
        text_x = code_x + 100
        c.multiline(text_x, c.y / SCALE + 20, DEFAULT_OFFER_TEXT,
                    cw - (text_x - cx) - 20, size=13)
        c.y += s(ch + 24)

    # Segmented Billing Toggle (Monthly | Annual Save 17%)
    tw, th = 290, 44
    tx = 640 - tw / 2
    c.rect(tx, c.y / SCALE, tw, th, fill=T["cta_light"], stroke=T["border"], radius=22)
    c.rect(tx + 4, c.y / SCALE + 4, 118, th - 8, fill=T["card"], stroke=T["border"], radius=18)
    c.text(tx + 63, c.y / SCALE + th / 2, "Monthly", size=13, color=T["text"], weight="bold", anchor="mm")
    c.text(tx + 162, c.y / SCALE + th / 2, "Annual", size=13, color=T["muted"], weight="bold", anchor="mm")
    c.rect(tx + 200, c.y / SCALE + 10, 78, 24, fill=T["accent_soft"], radius=12)
    c.text(tx + 239, c.y / SCALE + 22, "Save 17%", size=11, color=T["accent"], weight="bold", anchor="mm")
    c.y += s(th + 36)

    # Three Horizontal Cards (Starter | Team | Studio)
    gap = 24
    card_w = (CONTENT_W - 2 * gap) / 3
    card_h = 560
    card_top = c.y / SCALE
    for i, tier in enumerate(PLAN_TIERS):
        cx = PAD_X + i * (card_w + gap)
        highlighted = tier["slug"] == "team"
        c.rect(cx, card_top, card_w, card_h,
               fill=T["card"],
               stroke=T["highlight"] if highlighted else T["border"],
               radius=14, width=2 if highlighted else 1)
        cy = card_top + 28
        if tier["badge"]:
            bw = 118
            c.rect(cx + 24, cy, bw, 22, fill=T["accent"], radius=11)
            c.text(cx + 24 + bw / 2, cy + 11, tier["badge"], size=10,
                   color=T["badge_fg"], weight="bold", anchor="mm")
            cy += 34

        c.text(cx + 24, cy, tier["name"], size=22, weight="bold")
        cy += 28
        tag_h = c.multiline(cx + 24, cy, tier["tagline"], card_w - 48, size=13, color=T["muted"])
        cy += tag_h + 16
        c.hline(cx + 24, cx + card_w - 24, cy)
        cy += 18

        # Price + Cadence
        c.text(cx + 24, cy, tier["priceDisplay"], size=38, weight="bold")
        pw = c.text_width(tier["priceDisplay"], size=38, weight="bold")
        c.text(cx + 24 + pw + 8, cy + 16, tier["cadence"], size=13, color=T["muted"])
        cy += 48

        # Seat label + additional seat pricing
        seat_txt = tier["seatsLabel"]
        if tier["additionalSeatsLabel"]:
            seat_txt += f"  ·  {tier['additionalSeatsLabel']}"
        c.text(cx + 24, cy, seat_txt, size=12, color=T["muted"], weight="bold")
        cy += 24

        # CTA Button above features (Forma layout)
        is_primary = tier["cta"].get("primary", False)
        c.rect(cx + 24, cy, card_w - 48, 44,
               fill=T["accent"] if is_primary else T["cta_light"],
               stroke=T["accent"] if is_primary else T["border"],
               radius=10, width=0 if is_primary else 1)
        c.text(cx + card_w / 2, cy + 22, tier["cta"]["label"],
               size=14, color=T["on_accent"] if is_primary else T["text"],
               weight="bold", anchor="mm")
        cy += 60

        c.hline(cx + 24, cx + card_w - 24, cy)
        cy += 16
        c.text(cx + 24, cy, tier["featuresHeading"], size=10, color=T["muted"], weight="bold")
        cy += 22

        for f in tier["features"]:
            c.check(cx + 32, cy + 8, color=T["accent"])
            fh = c.multiline(cx + 48, cy + 1, f, card_w - 72, size=12)
            cy += max(24, fh + 6)

    c.y = s(card_top + card_h + 32)
    c.hline(PAD_X + 80, 1280 - PAD_X - 80, c.y / SCALE)
    c.y += s(22)
    c.text(640, c.y / SCALE, FOOTER_ITEMS, size=13, color=T["text"], weight="bold", anchor="ma")
    c.y += s(26)
    footer_h = c.multiline(640, c.y / SCALE, FOOTER_NOTE + " Questions? Get in touch.",
                           CONTENT_W - 120, size=11, color=T["muted"], anchor="ma")
    c.crop_to(int(c.y / SCALE) + int(footer_h) + 50)
    c.save(path)


render("light", DOCS / "pricing-light.png", show_offer=True, billing=True)
render("dark", DOCS / "pricing-dark.png", show_offer=True, billing=True)
render("light", DOCS / "pricing-no-billing.png", show_offer=False, billing=False)
print("Wrote screenshots to", DOCS)
