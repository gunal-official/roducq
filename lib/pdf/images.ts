/**
 * Zero-runtime-dependency logo image support for the server-side PDF writer.
 *
 * Uploads are deliberately small data URLs in the workspaces row, so they
 * need no Storage bucket, public object URL, or extra deployment secret. PNGs
 * are decoded to RGB + an optional grayscale alpha mask (SMask); JPEG bytes
 * are passed straight through to the PDF's DCTDecode image XObject.
 */

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";

import type { PdfImage } from "./writer.ts";
import {
  MAX_WORKSPACE_LOGO_BYTES,
  MAX_WORKSPACE_LOGO_DATA_URL_CHARS,
} from "./image-constants.ts";

export { MAX_WORKSPACE_LOGO_BYTES, MAX_WORKSPACE_LOGO_DATA_URL_CHARS };
const MAX_IMAGE_PIXELS = 4_194_304;
const MAX_PNG_INFLATED_BYTES = 18 * 1024 * 1024;

export class LogoImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogoImageError";
  }
}

const PNG_SIGNATURE = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readU16(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 2 > bytes.length) {
    throw new LogoImageError("The image file is truncated.");
  }
  return bytes[offset] * 256 + bytes[offset + 1];
}

function readU32(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 4 > bytes.length) {
    throw new LogoImageError("The image file is truncated.");
  }
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  ) >>> 0;
}

function assertDimensions(width: number, height: number): void {
  if (
    width < 1 ||
    height < 1 ||
    width > 4096 ||
    height > 4096 ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new LogoImageError(
      "Logo dimensions must be no larger than 4096 × 4096 pixels (4 megapixels total)."
    );
  }
}

function hashImage(format: string, bytes: Uint8Array): string {
  return createHash("sha256")
    .update(format)
    .update(bytes)
    .digest("hex");
}

function channelsFor(colorType: number): number {
  switch (colorType) {
    case 0:
    case 3:
      return 1;
    case 2:
      return 3;
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      throw new LogoImageError("This PNG color format is not supported.");
  }
}

function validPngDepth(colorType: number, depth: number): boolean {
  if (colorType === 0) return [1, 2, 4, 8, 16].includes(depth);
  if (colorType === 2) return depth === 8 || depth === 16;
  if (colorType === 3) return [1, 2, 4, 8].includes(depth);
  if (colorType === 4 || colorType === 6) return depth === 8 || depth === 16;
  return false;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function unfilterPng(
  input: Uint8Array,
  height: number,
  bytesPerPixel: number,
  rowBytes: number
): Uint8Array {
  const output = new Uint8Array(rowBytes * height);
  let inputOffset = 0;
  let previous = new Uint8Array(rowBytes);

  for (let y = 0; y < height; y += 1) {
    const filter = input[inputOffset++];
    if (filter > 4) throw new LogoImageError("The PNG uses an invalid row filter.");
    const row = output.subarray(y * rowBytes, (y + 1) * rowBytes);

    for (let x = 0; x < rowBytes; x += 1) {
      const raw = input[inputOffset++];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const above = previous[x];
      const upperLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paeth(left, above, upperLeft);
      row[x] = (raw + predictor) & 0xff;
    }

    previous = row;
  }

  return output;
}

function readSample(row: Uint8Array, index: number, depth: number): number {
  if (depth === 8) return row[index];
  if (depth === 16) return row[index * 2] * 256 + row[index * 2 + 1];
  const bitOffset = index * depth;
  const shift = 8 - depth - (bitOffset % 8);
  return (row[Math.floor(bitOffset / 8)] >>> shift) & ((1 << depth) - 1);
}

function sampleToByte(sample: number, depth: number): number {
  if (depth === 8) return sample;
  const maximum = depth === 16 ? 65535 : (1 << depth) - 1;
  return Math.round((sample * 255) / maximum);
}

function decodePng(bytes: Uint8Array): PdfImage {
  if (
    bytes.length < PNG_SIGNATURE.length ||
    PNG_SIGNATURE.some((byte, i) => bytes[i] !== byte)
  ) {
    throw new LogoImageError("The PNG signature is invalid.");
  }

  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = -1;
  let sawHeader = false;
  let sawPalette = false;
  let sawTransparency = false;
  let sawImageData = false;
  let imageDataEnded = false;
  let sawEnd = false;
  let palette: Uint8Array | null = null;
  let transparency: Uint8Array | null = null;
  let grayTransparent: number | null = null;
  let rgbTransparent: [number, number, number] | null = null;
  const idat: Uint8Array[] = [];
  let idatBytes = 0;

  for (let offset = PNG_SIGNATURE.length; offset < bytes.length; ) {
    if (offset + 12 > bytes.length) {
      throw new LogoImageError("The PNG file is truncated.");
    }
    const length = readU32(bytes, offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataStart || chunkEnd > bytes.length) {
      throw new LogoImageError("The PNG file is truncated.");
    }

    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    const chunkData = bytes.subarray(dataStart, dataEnd);
    const crcInput = bytes.subarray(offset + 4, dataEnd);
    if (crc32(crcInput) !== readU32(bytes, dataEnd)) {
      throw new LogoImageError("The PNG checksum is invalid.");
    }

    if (!sawHeader && type !== "IHDR") {
      throw new LogoImageError("The PNG header is missing.");
    }
    if (type !== "IDAT" && sawImageData) imageDataEnded = true;

    if (type === "IHDR") {
      if (sawHeader || length !== 13 || offset !== PNG_SIGNATURE.length) {
        throw new LogoImageError("The PNG header is invalid.");
      }
      width = readU32(chunkData, 0);
      height = readU32(chunkData, 4);
      depth = chunkData[8];
      colorType = chunkData[9];
      if (
        chunkData[10] !== 0 ||
        chunkData[11] !== 0 ||
        chunkData[12] !== 0 ||
        !validPngDepth(colorType, depth)
      ) {
        throw new LogoImageError("This PNG encoding is not supported.");
      }
      assertDimensions(width, height);
      sawHeader = true;
    } else if (type === "PLTE") {
      if (
        sawPalette ||
        sawImageData ||
        length === 0 ||
        length % 3 !== 0 ||
        length > 768 ||
        colorType === 0 ||
        colorType === 4
      ) {
        throw new LogoImageError("The PNG palette is invalid.");
      }
      palette = new Uint8Array(chunkData);
      sawPalette = true;
    } else if (type === "tRNS") {
      if (sawTransparency || sawImageData) {
        throw new LogoImageError("The PNG transparency data is invalid.");
      }
      if (colorType === 0 && length === 2) {
        grayTransparent = readU16(chunkData, 0);
      } else if (colorType === 2 && length === 6) {
        rgbTransparent = [
          readU16(chunkData, 0),
          readU16(chunkData, 2),
          readU16(chunkData, 4),
        ];
      } else if (
        colorType === 3 &&
        palette &&
        length <= palette.length / 3
      ) {
        transparency = new Uint8Array(chunkData);
      } else {
        throw new LogoImageError("The PNG transparency data is invalid.");
      }
      sawTransparency = true;
    } else if (type === "IDAT") {
      if (imageDataEnded || (colorType === 3 && !palette)) {
        throw new LogoImageError("The PNG image data is out of order.");
      }
      sawImageData = true;
      idatBytes += length;
      if (idatBytes > MAX_WORKSPACE_LOGO_BYTES) {
        throw new LogoImageError("The PNG image data is too large.");
      }
      idat.push(chunkData);
    } else if (type === "IEND") {
      if (length !== 0 || !sawImageData || sawEnd) {
        throw new LogoImageError("The PNG end marker is invalid.");
      }
      sawEnd = true;
      if (chunkEnd !== bytes.length) {
        throw new LogoImageError("The PNG contains unexpected trailing data.");
      }
      offset = chunkEnd;
      break;
    } else if (type !== "IHDR") {
      // Unknown critical chunks can change how pixels are interpreted. Ignore
      // ancillary chunks, but fail closed for unsupported critical chunks.
      const isCritical = bytes[offset + 4] >= 0x41 && bytes[offset + 4] <= 0x5a;
      if (isCritical) {
        throw new LogoImageError("The PNG contains an unsupported critical chunk.");
      }
    }

    offset = chunkEnd;
  }

  if (!sawHeader || !sawImageData || !sawEnd || idatBytes === 0) {
    throw new LogoImageError("The PNG file is incomplete.");
  }

  const channels = channelsFor(colorType);
  const rowBytes = Math.ceil((width * channels * depth) / 8);
  const expectedLength = height * (rowBytes + 1);
  if (expectedLength > MAX_PNG_INFLATED_BYTES) {
    throw new LogoImageError("The PNG expands beyond the supported image size.");
  }

  let filtered: Buffer;
  try {
    filtered = inflateSync(Buffer.concat(idat), {
      maxOutputLength: expectedLength,
    });
  } catch {
    throw new LogoImageError("The PNG image data could not be decoded.");
  }
  if (filtered.length !== expectedLength) {
    throw new LogoImageError("The PNG image data has an invalid length.");
  }

  const raw = unfilterPng(
    filtered,
    height,
    Math.max(1, Math.ceil((channels * depth) / 8)),
    rowBytes
  );
  const rgb = new Uint8Array(width * height * 3);
  const alpha = new Uint8Array(width * height);
  let hasTransparency = false;
  const paletteEntries = palette ? palette.length / 3 : 0;
  const grayKey = grayTransparent;
  const rgbKey = rgbTransparent;

  for (let y = 0; y < height; y += 1) {
    const row = raw.subarray(y * rowBytes, (y + 1) * rowBytes);
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      let red = 0;
      let green = 0;
      let blue = 0;
      let opacity = 255;

      if (colorType === 0) {
        const gray = readSample(row, x, depth);
        red = green = blue = sampleToByte(gray, depth);
        if (grayKey !== null && gray === grayKey) opacity = 0;
      } else if (colorType === 2) {
        const base = x * 3;
        const rawRed = readSample(row, base, depth);
        const rawGreen = readSample(row, base + 1, depth);
        const rawBlue = readSample(row, base + 2, depth);
        red = sampleToByte(rawRed, depth);
        green = sampleToByte(rawGreen, depth);
        blue = sampleToByte(rawBlue, depth);
        if (
          rgbKey &&
          rawRed === rgbKey[0] &&
          rawGreen === rgbKey[1] &&
          rawBlue === rgbKey[2]
        ) {
          opacity = 0;
        }
      } else if (colorType === 3) {
        const index = readSample(row, x, depth);
        if (!palette || index >= paletteEntries) {
          throw new LogoImageError("The PNG palette index is invalid.");
        }
        red = palette[index * 3];
        green = palette[index * 3 + 1];
        blue = palette[index * 3 + 2];
        opacity = transparency?.[index] ?? 255;
      } else if (colorType === 4) {
        const base = x * 2;
        const gray = sampleToByte(readSample(row, base, depth), depth);
        red = green = blue = gray;
        opacity = sampleToByte(readSample(row, base + 1, depth), depth);
      } else {
        const base = x * 4;
        red = sampleToByte(readSample(row, base, depth), depth);
        green = sampleToByte(readSample(row, base + 1, depth), depth);
        blue = sampleToByte(readSample(row, base + 2, depth), depth);
        opacity = sampleToByte(readSample(row, base + 3, depth), depth);
      }

      const rgbOffset = pixel * 3;
      rgb[rgbOffset] = red;
      rgb[rgbOffset + 1] = green;
      rgb[rgbOffset + 2] = blue;
      alpha[pixel] = opacity;
      if (opacity !== 255) hasTransparency = true;
    }
  }

  return {
    key: hashImage("png", bytes),
    width,
    height,
    colorSpace: "DeviceRGB",
    filter: "FlateDecode",
    data: deflateSync(rgb),
    ...(hasTransparency ? { alphaData: deflateSync(alpha) } : {}),
  };
}

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
  0xcf,
]);

function decodeJpeg(bytes: Uint8Array): PdfImage {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[bytes.length - 2] !== 0xff ||
    bytes[bytes.length - 1] !== 0xd9
  ) {
    throw new LogoImageError("The JPEG file is incomplete or has an invalid signature.");
  }

  let offset = 2;
  let width = 0;
  let height = 0;
  let precision = 0;
  let components = 0;
  let adobeTransform: number | null = null;
  let sawScan = false;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new LogoImageError("The JPEG marker stream is invalid.");
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];

    if (marker === 0xda) {
      const scanLength = readU16(bytes, offset);
      const scanComponents = bytes[offset + 2] ?? 0;
      if (
        scanComponents === 0 ||
        scanLength < 6 + scanComponents * 2 ||
        offset + scanLength > bytes.length
      ) {
        throw new LogoImageError("The JPEG scan header is invalid.");
      }
      sawScan = true;
      break;
    }
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue;
    }

    const segmentLength = readU16(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw new LogoImageError("The JPEG segment is truncated.");
    }
    const dataStart = offset + 2;
    const dataLength = segmentLength - 2;

    if (marker === 0xee && dataLength >= 12) {
      const isAdobe =
        bytes[dataStart] === 0x41 &&
        bytes[dataStart + 1] === 0x64 &&
        bytes[dataStart + 2] === 0x6f &&
        bytes[dataStart + 3] === 0x62 &&
        bytes[dataStart + 4] === 0x65;
      if (isAdobe) adobeTransform = bytes[dataStart + 11];
    }

    if (SOF_MARKERS.has(marker)) {
      if (dataLength < 6) throw new LogoImageError("The JPEG frame is invalid.");
      precision = bytes[dataStart];
      height = readU16(bytes, dataStart + 1);
      width = readU16(bytes, dataStart + 3);
      components = bytes[dataStart + 5];
      if (components === 0 || dataLength < 6 + components * 3) {
        throw new LogoImageError("The JPEG frame is truncated.");
      }
    }

    offset += segmentLength;
  }

  if (!sawScan || !width || !height || precision !== 8) {
    throw new LogoImageError("The JPEG dimensions or encoding are not supported.");
  }
  if (![1, 3, 4].includes(components)) {
    throw new LogoImageError("This JPEG color format is not supported.");
  }
  assertDimensions(width, height);

  const colorSpace =
    components === 1
      ? "DeviceGray"
      : components === 4
        ? "DeviceCMYK"
        : "DeviceRGB";
  return {
    key: hashImage("jpeg", bytes),
    width,
    height,
    colorSpace,
    filter: "DCTDecode",
    data: new Uint8Array(bytes),
    ...(components === 4 && adobeTransform !== null
      ? { decodeArray: "[1 0 1 0 1 0 1 0]" }
      : {}),
  };
}

/**
 * Parse and validate the persisted PNG/JPEG data URL, returning a PDF-ready
 * image XObject payload. Invalid data is rejected both on upload and when a
 * PDF is built, rather than reaching a PDF reader as a malformed object.
 */
export function decodeLogoDataUrl(dataUrl: string): PdfImage {
  if (
    typeof dataUrl !== "string" ||
    dataUrl.length > MAX_WORKSPACE_LOGO_DATA_URL_CHARS
  ) {
    throw new LogoImageError("The logo file is too large. Choose a file under 256 KB.");
  }

  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match || match[2].length % 4 !== 0) {
    throw new LogoImageError("Choose a valid PNG or JPEG image.");
  }

  const format = match[1];
  const encoded = match[2];
  const bytes = Buffer.from(encoded, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_WORKSPACE_LOGO_BYTES ||
    bytes.toString("base64") !== encoded
  ) {
    throw new LogoImageError("The logo file is too large or has invalid base64 data.");
  }

  if (format === "png") return decodePng(bytes);
  return decodeJpeg(bytes);
}
