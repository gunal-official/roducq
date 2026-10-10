/** Built-in tests for PNG alpha decoding and JPEG DCT passthrough. */

import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  decodeLogoDataUrl,
  LogoImageError,
  MAX_WORKSPACE_LOGO_BYTES,
} from "../../lib/pdf/images.ts";
import {
  makeLogoJpegDataUrl,
  makeLogoPngDataUrl,
} from "./pdf-image-fixture.ts";

function inflated(bytes: Uint8Array): number[] {
  return [...inflateSync(Buffer.from(bytes))];
}

describe("decodeLogoDataUrl — PNG", () => {
  it("decodes RGBA to RGB plus a grayscale alpha mask", () => {
    const image = decodeLogoDataUrl(makeLogoPngDataUrl());
    assert.equal(image.width, 2);
    assert.equal(image.height, 1);
    assert.equal(image.colorSpace, "DeviceRGB");
    assert.equal(image.filter, "FlateDecode");
    assert.deepEqual(inflated(image.data), [255, 0, 0, 0, 255, 0]);
    assert.ok(image.alphaData, "transparent PNG must carry /SMask pixels");
    assert.deepEqual(inflated(image.alphaData), [128, 255]);
  });

  it("rejects a bad PNG checksum instead of embedding corrupt bytes", () => {
    const dataUrl = makeLogoPngDataUrl();
    const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const png = Buffer.from(encoded, "base64");
    png[29] ^= 0x01; // flip one compressed IDAT byte without updating its CRC
    assert.throws(
      () => decodeLogoDataUrl(`data:image/png;base64,${png.toString("base64")}`),
      LogoImageError
    );
  });
});

describe("decodeLogoDataUrl — JPEG", () => {
  it("reads the frame dimensions and preserves JPEG bytes for DCTDecode", () => {
    const dataUrl = makeLogoJpegDataUrl();
    const image = decodeLogoDataUrl(dataUrl);
    const original = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    assert.equal(image.width, 2);
    assert.equal(image.height, 1);
    assert.equal(image.colorSpace, "DeviceRGB");
    assert.equal(image.filter, "DCTDecode");
    assert.deepEqual(Buffer.from(image.data), original);
    assert.equal(image.alphaData, undefined);
  });

  it("rejects unsupported MIME types and oversized input", () => {
    assert.throws(
      () => decodeLogoDataUrl("data:image/gif;base64,R0lGODlh"),
      LogoImageError
    );
    const oversized = `data:image/png;base64,${"A".repeat(
      Math.ceil((MAX_WORKSPACE_LOGO_BYTES + 1) / 3) * 4
    )}`;
    assert.throws(() => decodeLogoDataUrl(oversized), LogoImageError);
  });
});
