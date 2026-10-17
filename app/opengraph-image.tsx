import { ImageResponse } from "next/og";

/**
 * Social preview card (1200×630), generated at build time by next/og.
 * Also reused as the Twitter image (app/twitter-image.tsx re-exports
 * this file). Colours are the landing design tokens: --lm-dark-surface
 * ink ground, --lm-accent action purple, --lm-dark-muted secondary
 * text. Copy is the landing page's existing headline — nothing new is
 * claimed here.
 */
export const alt = "roducq — the workspace that does the client writing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#1b1426",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: "#6246ea",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 800,
            }}
          >
            r
          </div>
          <div style={{ color: "#ffffff", fontSize: "44px", fontWeight: 700 }}>
            roducq
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: "64px",
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: "900px",
            }}
          >
            The workspace that does the client writing for you
          </div>
          <div style={{ color: "#cdc4d8", fontSize: "28px", lineHeight: 1.4 }}>
            Briefs, proposals, plans and weekly updates — one pipeline.
          </div>
        </div>
        <div
          style={{
            height: "8px",
            width: "180px",
            borderRadius: "999px",
            backgroundColor: "#6246ea",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
