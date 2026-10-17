import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // User-specified shell bands (mobile <600, tablet 600–1023,
      // desktop ≥1024). Named screens so shell code reads `tab:` / `desk:`.
      screens: { tab: "600px", desk: "1024px" },
      colors: {
        /* ── Marketing landing system (components/marketing/**) ──────────
           Mirrors the `--lm-*` custom properties declared in
           app/(marketing)/landing.css. Marketing markup never hardcodes a
           hex value; it names a token here and the scoped CSS resolves it,
           which is what lets the dark adaptation remap the whole surface
           from one block. Reference design: forma-visuvate.framer.website
           (visual system only — no Forma asset or copy is reproduced). */
        lm: {
          canvas: "var(--lm-canvas)",
          "canvas-alt": "var(--lm-canvas-alt)",
          mint: "var(--lm-mint)",
          card: "var(--lm-card)",
          "surface-muted": "var(--lm-surface-muted)",
          "surface-accent": "var(--lm-surface-accent)",
          "surface-neutral": "var(--lm-surface-neutral)",
          ink: "var(--lm-ink)",
          "ink-soft": "var(--lm-ink-soft)",
          "ink-accent": "var(--lm-ink-accent)",
          muted: "var(--lm-muted)",
          "muted-alt": "var(--lm-muted-alt)",
          "muted-slate": "var(--lm-muted-slate)",
          "muted-sage": "var(--lm-muted-sage)",
          "muted-gray": "var(--lm-muted-gray)",
          "muted-readable": "var(--lm-muted-readable)",
          "muted-label": "var(--lm-muted-label)",
          accent: "var(--lm-accent)",
          "accent-strong": "var(--lm-accent-strong)",
          "accent-line": "var(--lm-accent-line)",
          "on-accent": "var(--lm-on-accent)",
          success: "var(--lm-success)",
          border: "var(--lm-border)",
          hairline: "var(--lm-border-hairline)",
          "border-soft": "var(--lm-border-soft)",
          "border-strong": "var(--lm-border-strong)",
          "border-emphasis": "var(--lm-border-emphasis)",
          scrim: "var(--lm-scrim)",
          "header-wash": "var(--lm-header-wash)",
          glow: "var(--lm-glow)",
          bar: "var(--lm-bar)",
          "dot-success": "var(--lm-dot-success)",
          "dark-surface": "var(--lm-dark-surface)",
          "dark-ink": "var(--lm-dark-ink)",
          "dark-muted": "var(--lm-dark-muted)",
          "dark-border": "var(--lm-dark-border)",
          "cta-ink": "var(--lm-cta-ink)",
          "cta-muted": "var(--lm-cta-muted)",
          "cta-border": "var(--lm-cta-border)",
          "cta-wash": "var(--lm-cta-wash)",
        },
        // Explicit Forma palette for new work, alongside semantic aliases
        // retained for every existing app component and shadcn-style API.
        forma: {
          purple: {
            DEFAULT: "var(--forma-purple)",
            hover: "var(--forma-purple-hover)",
            soft: "var(--accent-soft)",
            foreground: "var(--on-accent)",
          },
          lavender: "var(--forma-lavender)",
          plum: {
            DEFAULT: "var(--forma-plum)",
            foreground: "var(--dark-foreground)",
          },
          background: "var(--forma-background)",
          surface: {
            DEFAULT: "var(--forma-surface)",
            raised: "var(--forma-surface-raised)",
          },
        },
        bg: "var(--bg)",
        text: "var(--text)",
        "secondary-text": "var(--secondary-text)",
        neutral: "var(--neutral)",
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          translucent: "var(--bg-translucent)",
          foreground: "var(--text)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          foreground: "var(--on-accent)",
          soft: "var(--accent-soft)",
        },
        // Amber is deliberately named by purpose: use it for highlights and
        // notifications, never as the primary action or active-state color.
        highlight: {
          DEFAULT: "var(--amber)",
          soft: "var(--amber-soft)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--text)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--secondary-text)",
        },
        border: "var(--border)",
        error: {
          DEFAULT: "var(--error)",
          foreground: "var(--on-error)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
          foreground: "var(--on-success)",
        },
        // "Sent" blue remains distinct from accent/success in invoice status.
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
          foreground: "var(--on-info)",
        },
        dark: {
          DEFAULT: "var(--dark)",
          foreground: "var(--dark-foreground)",
        },
        // Phase B shell planes: the rail, the glass layer the floating
        // bar and drawer use, and the brand glow behind the mark.
        shell: {
          rail: "var(--shell-rail)",
          wash: "var(--shell-rail-wash)",
          panel: "var(--shell-panel)",
          hairline: "var(--shell-hairline)",
          glass: "var(--shell-glass)",
          "glass-strong": "var(--shell-glass-strong)",
          glow: "var(--shell-glow)",
          "glow-strong": "var(--shell-glow-strong)",
        },
        // shadcn-style aliases retained for existing components.
        background: "var(--bg)",
        foreground: "var(--text)",
        input: "var(--border)",
        ring: "var(--accent)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--on-accent)",
        },
        secondary: {
          DEFAULT: "var(--card)",
          foreground: "var(--text)",
        },
        destructive: {
          DEFAULT: "var(--error)",
          foreground: "var(--on-error)",
        },
        popover: {
          DEFAULT: "var(--card)",
          foreground: "var(--text)",
        },
      },
      borderRadius: {
        // Semantic radii for new components, plus mapped legacy steps so
        // existing `rounded-md/lg/xl` classes keep the intended 8/12px scale.
        control: "var(--radius-control)",
        surface: "var(--radius-surface)",
        /* Marketing landing radii — the reference's published steps
           (2/3/4/5/8/10/14/16/50%/999px), named by the surface they belong
           to so a component reads `rounded-lm-card` instead of guessing. */
        "lm-hair": "var(--lm-radius-hair)",
        "lm-tile": "var(--lm-radius-tile)",
        "lm-chip": "var(--lm-radius-chip)",
        "lm-control": "var(--lm-radius-control)",
        "lm-row": "var(--lm-radius-row)",
        "lm-panel": "var(--lm-radius-panel)",
        "lm-card": "var(--lm-radius-card)",
        "lm-frame": "var(--lm-radius-frame)",
        "lm-pill": "var(--lm-radius-pill)",
        "lm-dot": "var(--lm-radius-dot)",
        // The floating phone bar and the auth panel: a soft rectangle,
        // deliberately wider than `surface` so the chrome reads as a
        // separate plane from the content cards.
        dock: "20px",
        "2xl": "var(--radius-surface)",
        xl: "var(--radius-surface)",
        lg: "var(--radius-surface)",
        md: "var(--radius-control)",
        DEFAULT: "var(--radius-control)",
        sm: "4px",
      },
      boxShadow: {
        // Plum-tinted, low-contrast elevation that stays subtle in both themes.
        card: "0 1px 2px rgb(43 27 54 / 0.04), 0 12px 32px -16px rgb(43 27 54 / 0.10)",
        pop: "0 8px 30px -6px rgb(43 27 54 / 0.14)",
        rail: "0 1px 2px rgb(43 27 54 / 0.05)",
        /* Marketing landing elevation — the reference's four steps plus the
           one heavier shadow the hero product frame carries. */
        "lm-none": "var(--lm-shadow-none)",
        "lm-sm": "var(--lm-shadow-sm)",
        "lm-md": "var(--lm-shadow-md)",
        "lm-lg": "var(--lm-shadow-lg)",
        "lm-frame": "var(--lm-shadow-frame)",
        // Phase B: the floating bar, the drawer and the auth panel.
        shell: "var(--shell-shadow)",
        lift: "var(--shell-shadow-lift)",
      },
      fontFamily: {
        // Headings and body copy both use Manrope across the product.
        display: ["var(--font-manrope)", '"Manrope"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-manrope)", '"Manrope"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "var(--font-fira-code)",
          '"Fira Code"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
        manrope: ["var(--font-manrope)", '"Manrope"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      /* ── Marketing landing type scale ──────────────────────────────────
         The reference publishes exactly nine steps. They are named by step
         so the whole page can be re-scaled from tailwind.config.ts, and the
         line-heights ship with each step rather than being re-decided per
         component (heading steps pair with 1.04, body steps with 1.5–1.65). */
      fontSize: {
        "lm-10": ["var(--lm-size-10)", { lineHeight: "1.5" }],
        "lm-12": ["var(--lm-size-12)", { lineHeight: "1.5" }],
        "lm-14": ["var(--lm-size-14)", { lineHeight: "1.65" }],
        "lm-16": ["var(--lm-size-16)", { lineHeight: "1.65" }],
        "lm-18": ["var(--lm-size-18)", { lineHeight: "1.55" }],
        "lm-22": ["var(--lm-size-22)", { lineHeight: "1.2" }],
        "lm-29": ["var(--lm-size-29)", { lineHeight: "1.2" }],
        "lm-54": ["var(--lm-size-54)", { lineHeight: "1.04" }],
        "lm-64": ["var(--lm-size-64)", { lineHeight: "1.04" }],
      },
      /* ── Marketing landing spacing ─────────────────────────────────────
         Tailwind's default 4px grid already covers 1/2/4/6/8/10/12/14/16/
         20/32/36/48/52/88/120px. These eight fractional steps fill the gaps
         in the reference's scale (3/5/13/15/18/22/26/30px) so components
         never reach for an arbitrary `p-[26px]`. */
      spacing: {
        0.75: "3px",
        1.25: "5px",
        3.25: "13px",
        3.75: "15px",
        4.5: "18px",
        5.5: "22px",
        6.5: "26px",
        7.5: "30px",
        /* Whole steps the reference uses that Tailwind's default scale skips
           (…12, 14, 16, 20, 24…). Without these the section padding
           (`py-13`, `md:py-22`, `lg:py-30`) and the header height (`md:h-18`)
           compile to nothing — a class that silently vanishes is the failure
           mode content.ts's "no dynamic classes" rule exists to prevent. */
        13: "52px",
        18: "72px",
        22: "88px",
        30: "120px",
      },
      maxWidth: {
        /* One container for every marketing band; the hero copy column and
           the pricing grid narrow themselves inside it. */
        "lm-container": "var(--lm-container)",
        "lm-measure": "620px",
      },
      fontWeight: {
        "lm-regular": "400",
        "lm-semibold": "600",
        "lm-bold": "700",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
