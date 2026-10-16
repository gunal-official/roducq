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
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
