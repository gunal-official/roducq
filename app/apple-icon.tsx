import { ImageResponse } from "next/og";

import { TOKENS } from "@/lib/design-tokens";

/**
 * Apple touch icon (180×180 PNG), generated at build time. Mirrors
 * app/icon.svg exactly: the brand purple (TOKENS.purple, asserted
 * against app/icon.svg by tests/lib/design-guide.test.ts) with a white
 * lowercase "r". SVG favicons are not accepted as apple-touch-icons,
 * hence this PNG twin.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: TOKENS.purple,
          color: "#ffffff",
          fontSize: "108px",
          fontWeight: 800,
        }}
      >
        r
      </div>
    ),
    { ...size },
  );
}
