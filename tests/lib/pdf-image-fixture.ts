import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";

function uint32be(value: number): Buffer {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value >>> 0, 0);
  return out;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)]);
  return Buffer.concat([
    uint32be(data.length),
    typeAndData,
    uint32be(crc32(typeAndData)),
  ]);
}

/** Two RGBA pixels: half-transparent red, then opaque green. */
export function makeLogoPngDataUrl(): string {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const pixels = Buffer.from([0, 255, 0, 0, 128, 0, 255, 0, 255]);
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Minimal JPEG marker sample with a baseline RGB frame and scan marker. */
export function makeLogoJpegDataUrl(): string {
  const jpeg = Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xc0, 0x00, 0x11, // SOF0, length 17
    0x08, 0x00, 0x01, 0x00, 0x02, 0x03,
    0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x0c, // SOS, length 12
    0x03, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x00, 0x3f, 0x00,
    0x00, // tiny scan payload; the PDF writer passes JPEG bytes through
    0xff, 0xd9, // EOI
  ]);
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}
