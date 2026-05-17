/**
 * OG image generator using sharp + opentype.js.
 *
 * Font rendering strategy: convert ALL text to SVG <path> elements via
 * opentype.js. This completely bypasses fontconfig and librsvg's font
 * subsystem — paths are pure geometry, no font lookup required.
 * Works on any Linux regardless of installed system fonts.
 */
import path from "path";
import fs from "fs";
import sharp from "sharp";
// opentype.js is a pure-JS font parser; no native deps.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const opentype = require("opentype.js") as typeof import("opentype.js");
import { getPublicAscent } from "@/lib/services/public-ascent.service";
import { getRarityId, RARITY_COLORS, RARITY_LABELS } from "@/lib/rarity";

export const runtime = "nodejs";

// ── In-memory image cache ──────────────────────────────────────────────────
// Railway runs a persistent Node.js process, so module-level state survives
// between requests. Caching the JPEG output means WhatsApp's second scrape
// (after the share button pre-warms it) returns in <50ms.
const OG_CACHE = new Map<string, { buf: Buffer; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getCached(id: string): Buffer | null {
  const entry = OG_CACHE.get(id);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.buf;
  OG_CACHE.delete(id);
  return null;
}
function setCached(id: string, buf: Buffer) {
  // Evict oldest entries if cache grows too large (keep max 200 images ~30MB)
  if (OG_CACHE.size >= 200) {
    const oldest = [...OG_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) OG_CACHE.delete(oldest[0]);
  }
  OG_CACHE.set(id, { buf, ts: Date.now() });
}

// ── Load Geist-Regular once at module init ─────────────────────────────────
// Path 1: /app/config/ (Railway — copied by nixpacks build phase)
// Path 2: node_modules (local dev)
const otFont = (() => {
  const candidates = [
    path.join(process.cwd(), "config/Geist-Regular.ttf"),
    path.join(process.cwd(), "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"),
  ];
  for (const p of candidates) {
    try {
      const buf = fs.readFileSync(p);
      return opentype.parse(buf.buffer as ArrayBuffer);
    } catch {
      // try next
    }
  }
  return null;
})();

// ── Helpers ────────────────────────────────────────────────────────────────

const W = 1200;
const H = 630;

function jpegResponse(buf: Buffer, maxAge = 86400) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=3600`,
    },
  });
}

/** Escape text for safe SVG embedding */
function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap long text to approximate max char width */
function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Convert text to an SVG <path> element via opentype.js.
 * y is the text baseline position.
 * anchor: "left" (default) or "middle" (horizontally centered on x).
 * letterSpacing: extra pixels between characters (renders glyph-by-glyph).
 */
function textPath(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  opts: { anchor?: "left" | "middle"; opacity?: number; letterSpacing?: number } = {}
): string {
  if (!otFont) return "";
  const { anchor = "left", opacity, letterSpacing = 0 } = opts;

  let startX = x;
  if (anchor === "middle") {
    let totalW = 0;
    for (const ch of text) totalW += otFont.getAdvanceWidth(ch, fontSize) + letterSpacing;
    totalW -= letterSpacing; // no trailing spacing
    startX = x - totalW / 2;
  }

  let svgParts = "";
  if (letterSpacing !== 0) {
    // Render char-by-char for letter-spacing support
    let cx = startX;
    for (const ch of text) {
      const p = otFont.getPath(ch, cx, y, fontSize);
      p.fill = fill;
      svgParts += p.toSVG(1);
      cx += otFont.getAdvanceWidth(ch, fontSize) + letterSpacing;
    }
  } else {
    const p = otFont.getPath(text, startX, y, fontSize);
    p.fill = fill;
    svgParts = p.toSVG(1);
  }

  if (opacity !== undefined && opacity < 1) {
    return `<g opacity="${opacity}">${svgParts}</g>`;
  }
  return svgParts;
}

/**
 * Baseline y for text that should appear visually centered in a box.
 * Uses the font's cap-height metric for precision.
 */
function baselineForCenter(boxCenterY: number, fontSize: number): number {
  if (otFont) {
    const capH = (otFont.tables.os2.sCapHeight / otFont.unitsPerEm) * fontSize;
    return boxCenterY + capH / 2;
  }
  return boxCenterY + fontSize * 0.35;
}

/** Minimal navy JPEG fallback — no SVG, no fonts needed */
async function navyFallback(): Promise<Buffer> {
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = 13; buf[i * 3 + 1] = 37; buf[i * 3 + 2] = 56; // #0D2538
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 80 }).toBuffer();
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Serve from cache if available (instant response) ──────────────────
    const cached = getCached(id);
    if (cached) return jpegResponse(cached);

    const ascent = await getPublicAscent(id);

    // ── No ascent / no photo → brand fallback ──────────────────────────────
    if (!ascent?.photoUrl) {
      const jpg = await navyFallback();
      return jpegResponse(jpg);
    }

    // ── Fetch and resize photo ─────────────────────────────────────────────
    let photoBuffer: Buffer;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(ascent.photoUrl, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("fetch failed");
      photoBuffer = Buffer.from(await res.arrayBuffer());
    } catch {
      const jpg = await navyFallback();
      return jpegResponse(jpg, 60);
    }

    // Resize to target dimensions as a raw buffer for compositing
    const photo = await sharp(photoBuffer)
      .resize(W, H, { fit: "cover", position: "centre" })
      .toBuffer({ resolveWithObject: false });

    // ── Build SVG overlay ──────────────────────────────────────────────────
    const rarity = getRarityId(ascent.peak.altitudeM);
    const rarityColor = RARITY_COLORS[ascent.peak.rarityId ?? rarity] ?? RARITY_COLORS[rarity];
    const rarityLabel = RARITY_LABELS[rarity];

    const peakNameLines = wrapText(ascent.peak.name, 22);
    const peakFontSize = peakNameLines[0].length > 18 ? 64 : 76;
    const peakLineH = Math.round(peakFontSize * 1.15);

    // opentype baselines: text draws UPWARD from y (cap tops at y - capH).
    // Layout from bottom to top:
    //   peak name baseline  → H - 52
    //   gap                 → 22px
    //   altitude baseline
    //   gap (above cap-top) → 14px
    //   badge bottom
    //   badge height        → badgeH
    const peakBaselineY = H - 52;
    // Altitude baseline sits above peak name block
    const peakCapH = otFont
      ? Math.round((otFont.tables.os2.sCapHeight / otFont.unitsPerEm) * peakFontSize)
      : Math.round(peakFontSize * 0.72);
    const altY = peakBaselineY - (peakNameLines.length - 1) * peakLineH - peakCapH - 22;

    const altText = `${ascent.peak.altitudeM.toLocaleString("en")} m${
      ascent.peak.mountainRange ? `  ·  ${ascent.peak.mountainRange}` : ""
    }`;

    // Badge sits above altitude text (clear gap above altitude cap-top)
    const altCapH = otFont
      ? Math.round((otFont.tables.os2.sCapHeight / otFont.unitsPerEm) * 22)
      : Math.round(22 * 0.72);
    const badgeLabel = rarityLabel;
    const badgeW = badgeLabel.length * 10 + 40;
    const badgeH = 30;
    const badgeX = 52;
    const badgeY = altY - altCapH - 14 - badgeH;

    // ── Text paths ──────────────────────────────────────────────────────────
    // PEAKADEX watermark (top-left, letter-spaced)
    const watermarkBaseline = 28 + (otFont
      ? (otFont.tables.os2.sCapHeight / otFont.unitsPerEm) * 14
      : 14 * 0.7);
    const watermarkPath = textPath("PEAKADEX", 28, watermarkBaseline, 14, "#ffffff",
      { opacity: 0.40, letterSpacing: 3 });

    // Rarity badge label (centered in badge)
    const badgeLabelPath = textPath(
      esc(badgeLabel),
      badgeX + badgeW / 2,
      baselineForCenter(badgeY + badgeH / 2, 14),
      14,
      rarityColor,
      { anchor: "middle" }
    );

    // Altitude text
    const altPath = textPath(esc(altText), 52, altY, 22, "#ffffff", { opacity: 0.75 });

    // Peak name lines
    const peakNamePaths = peakNameLines
      .map((line, i) =>
        textPath(esc(line), 52, peakBaselineY + i * peakLineH, peakFontSize, "#ffffff")
      )
      .join("\n");

    const overlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0"/>
      <stop offset="40%"  stop-color="#000000" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.80"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#gr)"/>

  <!-- Rarity badge -->
  <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="15"
    fill="${rarityColor}" fill-opacity="0.2"
    stroke="${rarityColor}" stroke-width="1.5"/>
  ${badgeLabelPath}

  <!-- Altitude -->
  ${altPath}

  <!-- Peak name -->
  ${peakNamePaths}

  <!-- Peakadex watermark top-left -->
  ${watermarkPath}
</svg>`;

    const jpg = await sharp(photo)
      .composite([{ input: Buffer.from(overlay), blend: "over" }])
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    // Cache for subsequent requests (WhatsApp may scrape multiple times)
    setCached(id, jpg);

    return jpegResponse(jpg);
  } catch (err) {
    console.error("[og-image] unhandled error:", err);
    try {
      const jpg = await navyFallback();
      return jpegResponse(jpg, 60);
    } catch {
      return new Response("error", { status: 500 });
    }
  }
}
