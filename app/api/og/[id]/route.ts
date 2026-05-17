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

    // ── Logo watermark paths ───────────────────────────────────────────────
    // Layout: [icon circle+mountain] [peak] [adex]
    // Positioned bottom-left, opacity 0.45
    const logoFontSize = 22;
    const iconR = 13; // icon circle radius
    const logoY = H - 36; // baseline y for text
    const iconCX = 36 + iconR;
    const iconCY = logoY - (otFont
      ? (otFont.tables.os2.sCapHeight / otFont.unitsPerEm) * logoFontSize / 2
      : logoFontSize * 0.36);

    const peakAdvW = otFont ? otFont.getAdvanceWidth("peak", logoFontSize) : logoFontSize * 2.2;
    const adexAdvW = otFont ? otFont.getAdvanceWidth("adex", logoFontSize) : logoFontSize * 2.2;
    const textGap = 10;

    const peakTextX = iconCX + iconR + textGap;
    const adexTextX = peakTextX + peakAdvW + textGap * 2 + iconR * 2 + textGap;

    const peakPath  = textPath("peak", peakTextX, logoY, logoFontSize, "#ffffff", { opacity: 0.45 });
    const adexPath  = textPath("adex", adexTextX, logoY, logoFontSize, "#ffffff", { opacity: 0.45 });

    // Second icon circle between "peak" and "adex"
    const icon2CX = peakTextX + peakAdvW + textGap + iconR;

    // Mountain path points inside circle (normalized, then scaled)
    const mtn = (cx: number, cy: number, r: number) =>
      `${cx - r*0.55},${cy + r*0.42} ${cx - r*0.08},${cy - r*0.38} ` +
      `${cx + r*0.18},${cy - r*0.02} ${cx + r*0.48},${cy - r*0.48} ${cx + r*0.72},${cy + r*0.42}`;

    const overlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Subtle vignette — darkens edges, keeps centre bright -->
    <radialGradient id="vg" cx="50%" cy="50%" r="70%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#vg)"/>

  <!-- Peakadex logo watermark — bottom left -->
  <!-- "peak" text -->
  ${peakPath}
  <!-- icon circle + mountain (between peak and adex) -->
  <circle cx="${icon2CX}" cy="${iconCY}" r="${iconR}"
    fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.45"/>
  <polyline points="${mtn(icon2CX, iconCY, iconR)}"
    fill="none" stroke="#ffffff" stroke-width="1.4"
    stroke-linejoin="round" stroke-linecap="round" opacity="0.45"/>
  <!-- "adex" text -->
  ${adexPath}
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
