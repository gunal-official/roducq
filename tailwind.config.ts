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
        "cta-button-ink": "var(--lm-cta-button-ink)",
        // /solutions: measured on-stage eyebrow (#cdb8ff) and the
        // getting-started checklist's muted row ink (#655f78).
        "cta-eyebrow": "var(--lm-cta-eyebrow)",
        // Stage foot and rail fills. The custom properties were declared
        // with the /solutions stage work but their utility mappings were
        // missing, so `text-lm-cta-faint`, `bg-lm-cta-track` and
        // `bg-lm-cta-fill` compiled to nothing; /features' six-step stage
        // needs the same measured 60%-white label, 18%-white track and
        // white fill, so the mappings now exist for both pages.
        "cta-faint": "var(--lm-cta-faint)",
        "cta-track": "var(--lm-cta-track)",
        "cta-fill": "var(--lm-cta-fill)",
        "mock-muted": "var(--lm-mock-muted)",
        // /solutions: the measured miniature fills.
        "mock-row-active": "var(--lm-mock-row-active)",
        "mock-rail": "var(--lm-mock-rail)",
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
        "lm-button": "var(--lm-radius-button)",
        "lm-card": "var(--lm-radius-card)",
        "lm-frame": "var(--lm-radius-frame)",
        "lm-pill": "var(--lm-radius-pill)",
        "lm-dot": "var(--lm-radius-dot)",
        "lm-step": "var(--lm-radius-step)",
        "lm-stage": "var(--lm-radius-stage)",
        // /solutions: the sticky miniature stage and the plan band
        // measure 24px, not the closing CTA's 28px.
        "lm-stage-sm": "var(--lm-radius-stage-sm)",
        "lm-mock": "var(--lm-radius-mock)",
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
        "lm-mock": "var(--lm-shadow-mock)",
        "lm-mock-stage": "var(--lm-shadow-mock-stage)",
        "lm-stage": "var(--lm-shadow-stage)",
        // /solutions: the measured 1px/2px hairline lift under the
        // floating numbered-category pill.
        "lm-chip": "var(--lm-shadow-chip)",
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
        "lm-13": ["var(--lm-size-13)", { lineHeight: "1.55" }],
        "lm-14": ["var(--lm-size-14)", { lineHeight: "1.65" }],
        "lm-15": ["var(--lm-size-15)", { lineHeight: "1.55" }],
        // /solutions: the two on-stage buttons measure 15.5px / 24.03px
        // (`sol-1440x900-light-styles.json`), not the shell's 15px step.
        "lm-15-5": ["var(--lm-size-15-5)", { lineHeight: "1.55" }],
        "lm-16": ["var(--lm-size-16)", { lineHeight: "1.65" }],
        "lm-17": ["var(--lm-size-17)", { lineHeight: "1.5" }],
        "lm-18": ["var(--lm-size-18)", { lineHeight: "1.65" }],
        "lm-19": ["var(--lm-size-19)", { lineHeight: "1.55" }],
        "lm-20": ["var(--lm-size-20)", { lineHeight: "1.35" }],
        "lm-21": ["var(--lm-size-21)", { lineHeight: "1.35" }],
        "lm-22": ["var(--lm-size-22)", { lineHeight: "1.3" }],
        "lm-23": ["var(--lm-size-23)", { lineHeight: "1.4" }],
        "lm-28": ["var(--lm-size-28)", { lineHeight: "1.1" }],
        "lm-30": ["var(--lm-size-30)", { lineHeight: "1.1" }],
        "lm-32": ["var(--lm-size-32)", { lineHeight: "1.1" }],
        "lm-34": ["var(--lm-size-34)", { lineHeight: "1.1" }],
        "lm-35": ["var(--lm-size-35)", { lineHeight: "1.35" }],
        "lm-36": ["var(--lm-size-36)", { lineHeight: "1.2" }],
        // /solutions: the closing CTA headline measures 40px / 40.8px at
        // 768 and 390 (`sol-768x1024-light-styles.json`,
        // `sol-390x844-light-styles.json`).
        "lm-40": ["var(--lm-size-40)", { lineHeight: "1.02" }],
        "lm-42": ["var(--lm-size-42)", { lineHeight: "1.1" }],
        "lm-43": ["var(--lm-size-43)", { lineHeight: "1.02" }],
        "lm-44": ["var(--lm-size-44)", { lineHeight: "1.02" }],
        "lm-46": ["var(--lm-size-46)", { lineHeight: "1.35" }],
        "lm-48": ["var(--lm-size-48)", { lineHeight: "1.1" }],
        "lm-54": ["var(--lm-size-54)", { lineHeight: "1.1" }],
        "lm-64": ["var(--lm-size-64)", { lineHeight: "1.02" }],
        // /solutions: the closing CTA headline measures 64.8px — it is
        // NOT the hero's 67.2px, which it was borrowing.
        "lm-65": ["var(--lm-size-65)", { lineHeight: "1.02" }],
        // Two /solutions-only fractional steps the integer scale cannot
        // express. Deliberately NOT `lm-11`: activating that shared step
        // would restyle CardLabel on the other marketing pages.
        "lm-chip": ["var(--lm-size-chip)", { lineHeight: "1.5" }],
        "lm-mock": ["var(--lm-size-mock)", { lineHeight: "1.5" }],
        // The /solutions hero's compact lead: the reference measures
        // 16.5px / 27.23px at both 768 and 390, so the measured step is
        // 16.5 rather than the nearest integer token.
        "lm-16-5": ["var(--lm-size-16-5)", { lineHeight: "1.65" }],
        // /integrations steps (see the token block in landing.css). Added as
        // NEW keys only: no existing utility changes meaning.
        "lm-45-4": ["var(--lm-size-45-4)", { lineHeight: "1.02" }],
        "lm-40-8": ["var(--lm-size-40-8)", { lineHeight: "1.1" }],
        "lm-13-5": ["var(--lm-size-13-5)", { lineHeight: "1.55" }],
        "lm-12-5": ["var(--lm-size-12-5)", { lineHeight: "1.5" }],
        "lm-67": ["var(--lm-size-67)", { lineHeight: "1.02" }],
        "lm-72": ["var(--lm-size-72)", { lineHeight: "1.02" }],
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
        6.25: "25px",
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
        /* Measured on the reference: a section's supporting paragraph is
           500px wide, and the hero's is 640px. */
        "lm-measure-intro": "500px",
        "lm-measure-lead": "640px",
      },
      /* Measured on the reference: a section eyebrow runs at 1.2, a step
         card title at 1.15 and a team card title at 1.35. */
      /* Measured on the reference's links: the navigation uses
         cubic-bezier(0.2, 0.7, 0.2, 1) and its inline text link uses the
         CSS `ease` curve. */
      transitionTimingFunction: {
        "lm-nav": "cubic-bezier(0.2, 0.7, 0.2, 1)",
        "lm-text": "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      lineHeight: {
        "lm-label": "1.2",
        "lm-step": "1.15",
        "lm-card": "1.35",
      },
      fontWeight: {
        "lm-regular": "400",
        "lm-medium": "500",
        "lm-semibold": "600",
        "lm-bold": "700",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
