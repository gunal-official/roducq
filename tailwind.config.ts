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
        // Ember Studio primitives (and the retained legacy aliases below).
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
        "2xl": "var(--radius-surface)",
        xl: "var(--radius-surface)",
        lg: "var(--radius-surface)",
        md: "var(--radius-control)",
        DEFAULT: "var(--radius-control)",
        sm: "4px",
      },
      boxShadow: {
        // Warm, low-contrast elevation that remains subtle in both themes.
        card: "0 1px 2px rgb(28 25 23 / 0.04), 0 12px 32px -16px rgb(28 25 23 / 0.10)",
        pop: "0 8px 30px -6px rgb(28 25 23 / 0.14)",
        rail: "0 1px 2px rgb(28 25 23 / 0.05)",
      },
      fontFamily: {
        display: ["var(--font-playfair)", '"Playfair Display"', "Georgia", "serif"],
        sans: [
          "var(--font-source-sans)",
          '"Source Sans 3"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-fira-code)",
          '"Fira Code"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
