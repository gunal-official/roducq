/**
 * Test-only DOCX/ZIP fixture builder (Queue item #6) — no binary fixtures
 * are committed; every archive in the suite is constructed byte-by-byte
 * here, like tests/lib/pdf-read.ts does for the PDF writer.
 *
 * Guarantees the extractor tests rest on:
 *   - a REAL ZIP container: local headers, a real central directory and a
 *     real end-of-central-directory record, with correct CRC-32s;
 *   - REAL deflate streams from node:zlib (deflateRawSync) — the same
 *     compressor Word effectively uses;
 *   - knobs for the hostilities the reader must survive:
 *       zeroLocalSizes — local headers carry 0 sizes (legal streaming
 *                        output; sizes must come from the central
 *                        directory, which is the requirement's point);
 *       corruptDeflate — bytes inside the deflate stream are flipped, so
 *                        the stream is genuinely broken (asserted in the
 *                        test itself).
 *
 * CRC-32 is implemented locally (table-driven IEEE) rather than pulled
 * from zlib's crc32 so the fixtures stay version-proof.
 */

import { deflateRawSync } from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntrySpec {
  name: string;
  /** XML/text content (encoded as UTF-8) or raw bytes. */
  content: string | Uint8Array;
  /** 0 = stored, 8 = deflate. Default: 8. */
  method?: 0 | 8;
  /** Local header gets zero size fields — legal streaming-writer output;
   *  a reader that trusts local header sizes explodes on this. */
  zeroLocalSizes?: boolean;
  /** Corrupt the deflate stream itself (method 8 only). Sets byte 0's
   *  BTYPE bits to 11 (reserved/invalid block type): any inflate
   *  implementation must reject such a stream, deterministically —
   *  middle-of-stream bit flips would only scramble output, because raw
   *  deflate carries no integrity check. */
  corruptDeflate?: boolean;
  /** Truncate the stored/compressed payload (the central directory still
   *  claims the full size). */
  truncatePayload?: boolean;
}

const encoder = new TextEncoder();

export function buildZip(entries: ZipEntrySpec[]): Uint8Array {
  const encoderName = (name: string) => encoder.encode(name);

  // Pass 1: payloads.
  const built = entries.map((spec) => {
    const raw =
      typeof spec.content === "string"
        ? encoder.encode(spec.content)
        : spec.content;
    const method = spec.method ?? 8;
    let payload: Uint8Array;
    if (method === 8) {
      payload = new Uint8Array(deflateRawSync(raw));
      if (spec.corruptDeflate && payload.length > 0) {
        // Stream byte 0: bit 0 = BFINAL, bits 1-2 = BTYPE. Forcing both
        // BTYPE bits on gives 11 — "reserved" per RFC 1951 — so inflate
        // fails fast ("invalid block type") no matter the content.
        payload[0] |= 0x06;
      }
    } else {
      payload = raw.slice();
    }
    if (spec.truncatePayload && payload.length > 2) {
      payload = payload.subarray(0, Math.floor(payload.length / 2)).slice();
    }
    return {
      spec,
      name: encoderName(spec.name),
      raw,
      method,
      claimedPayloadLength: spec.truncatePayload
        ? // Directory claims the full pre-truncation stream.
          method === 8
          ? deflateRawSync(raw).length
          : raw.length
        : payload.length,
      payload,
      crc: crc32(raw),
    };
  });

  // Pass 2: local headers + payloads.
  const localParts: Uint8Array[] = [];
  const centralSizeRecords: {
    localOffset: number;
    name: Uint8Array;
    method: number;
    crc: number;
    compressedSize: number;
    uncompressedSize: number;
  }[] = [];

  let offset = 0;
  const localHeaderLen = (name: Uint8Array) => 30 + name.length;
  for (const entry of built) {
    const local = new Uint8Array(localHeaderLen(entry.name) + entry.payload.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, entry.method, true);
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    if (!entry.spec.zeroLocalSizes) {
      view.setUint32(14, entry.crc, true);
      view.setUint32(18, entry.claimedPayloadLength, true);
      view.setUint32(22, entry.raw.length, true);
    }
    view.setUint16(26, entry.name.length, true);
    view.setUint16(28, 0, true); // extra length
    local.set(entry.name, 30);
    local.set(entry.payload, 30 + entry.name.length);
    localParts.push(local);
    centralSizeRecords.push({
      localOffset: offset,
      name: entry.name,
      method: entry.method,
      crc: entry.crc,
      compressedSize: entry.claimedPayloadLength,
      uncompressedSize: entry.raw.length,
    });
    offset += local.length;
  }

  // Pass 3: central directory.
  const central = new Uint8Array(
    centralSizeRecords.reduce((sum, r) => sum + 46 + r.name.length, 0)
  );
  {
    const view = new DataView(central.buffer);
    let pos = 0;
    for (const r of centralSizeRecords) {
      view.setUint32(pos + 0, 0x02014b50, true);
      view.setUint16(pos + 4, 20, true); // version made by
      view.setUint16(pos + 6, 20, true); // version needed
      view.setUint16(pos + 8, 0, true); // flags
      view.setUint16(pos + 10, r.method, true);
      view.setUint16(pos + 12, 0, true); // mod time
      view.setUint16(pos + 14, 0, true); // mod date
      view.setUint32(pos + 16, r.crc, true);
      view.setUint32(pos + 20, r.compressedSize, true);
      view.setUint32(pos + 24, r.uncompressedSize, true);
      view.setUint16(pos + 28, r.name.length, true);
      view.setUint16(pos + 30, 0, true); // extra length
      view.setUint16(pos + 32, 0, true); // comment length
      view.setUint16(pos + 34, 0, true); // disk number start
      view.setUint16(pos + 36, 0, true); // internal attrs
      view.setUint32(pos + 38, 0, true); // external attrs
      view.setUint32(pos + 42, r.localOffset, true);
      central.set(r.name, pos + 46);
      pos += 46 + r.name.length;
    }
  }

  // Pass 4: EOCD.
  const eocd = new Uint8Array(22);
  {
    const view = new DataView(eocd.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true); // this disk
    view.setUint16(6, 0, true); // cd disk
    view.setUint16(8, centralSizeRecords.length, true);
    view.setUint16(10, centralSizeRecords.length, true);
    view.setUint32(12, central.length, true);
    view.setUint32(16, offset, true); // cd offset
    view.setUint16(20, 0, true); // comment length
  }

  const total =
    localParts.reduce((sum, p) => sum + p.length, 0) +
    central.length +
    eocd.length;
  const zip = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...localParts, central, eocd]) {
    zip.set(part, cursor);
    cursor += part.length;
  }
  return zip;
}

/* Convenience layer: believable WordprocessingML --------------------- */

export const W_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";

/** Wrap body content in a minimal document.xml prolog/epilog, exactly
 *  the shape Word emits. */
export function documentXml(bodyInner: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${W_NS}" xmlns:mc="${MC_NS}">` +
    `<w:body>${bodyInner}<w:sectPr/></w:body></w:document>`
  );
}

export function p(inner: string): string {
  return `<w:p>${inner}</w:p>`;
}

export function t(text: string): string {
  return `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
}

/** Minimal-but-realistic .docx: content types + relationships + the
 *  document part itself (the only one the extractor needs). */
export function buildDocx(
  xml: string,
  overrides?: Partial<ZipEntrySpec>
): Uint8Array {
  return buildZip([
    {
      name: "[Content_Types].xml",
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`,
    },
    {
      name: "_rels/.rels",
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`,
    },
    { name: "word/document.xml", content: xml, ...overrides },
  ]);
}
