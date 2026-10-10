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
      // User-specified shell bands (Step 33): mobile <600, tablet 600–1023,
      // desktop ≥1024. Named screens so shell code reads `tab:` / `desk:`.
      screens: { tab: "600px", desk: "1024px" },
      colors: {
        // Raw design tokens (CSS variables defined in app/globals.css).
        // 2026-09 design guide: warm ivory backdrop, near-white cards, burnt
        // orange-red accent, espresso ink.
        bg: "var(--bg)",
        text: "var(--text)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
          soft: "var(--accent-soft)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--text)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "color-mix(in srgb, var(--text) 52%, transparent)",
        },
        border: "var(--border)",
        error: "var(--error)",
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
        },
        // "Sent" blue (Step 35 — invoice status badge redesign): a distinct
        // hue from accent/success so Draft/Sent/Paid/Void read at a glance.
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
        },
        dark: {
          DEFAULT: "var(--dark)",
          foreground: "#ffffff",
        },
        // shadcn-style semantic aliases mapped onto the design tokens
        background: "var(--bg)",
        foreground: "var(--text)",
        input: "var(--border)",
        ring: "var(--accent)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--card)",
          foreground: "var(--text)",
        },
        destructive: {
          DEFAULT: "var(--error)",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "var(--card)",
          foreground: "var(--text)",
        },
      },
      borderRadius: {
        // 2026-09 design guide: ONE compact radius (--radius = 0.35rem) for
        // cards, inputs, buttons, menus and chips alike — the larger steps
        // collapse onto it so legacy rounded-lg/xl call sites stay compact.
        // `sm` is the inner step (checkboxes, tiny marks), still derived from
        // the token. Pills/avatars keep rounded-full. No arbitrary radii —
        // tests/lib/design-guide.test.ts fails on any `rounded-[…]`.
        "2xl": "var(--radius)",
        xl: "var(--radius)",
        lg: "var(--radius)",
        md: "var(--radius)",
        DEFAULT: "var(--radius)",
        sm: "calc(var(--radius) - 0.15rem)", // 0.2rem
      },
      boxShadow: {
        // Soft elevation: hairline + wide low shadow, tinted with the
        // espresso ink (--text #16100f = rgb 22 16 15) instead of cool gray.
        card: "0 1px 2px rgb(22 16 15 / 0.04), 0 12px 32px -16px rgb(22 16 15 / 0.10)",
        pop: "0 8px 30px -6px rgb(22 16 15 / 0.14)",
        rail: "0 1px 2px rgb(22 16 15 / 0.05)",
      },
      fontFamily: {
        // 2026-09 design guide. Display (headings, numbers, brand): Georgia,
        // falling back to Times — system serifs, nothing to download. Body:
        // Inter via next/font/google (app/layout.tsx sets --font-inter).
        display: ["Georgia", '"Times New Roman"', "Times", "serif"],
        sans: [
          "var(--font-inter)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
