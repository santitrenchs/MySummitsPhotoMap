/**
 * OG image generator using sharp — composes a card-style image.
 * Uses sharp instead of next/og because next/og (resvg) crashes on Railway.
 *
 * SVG rules for librsvg on Linux:
 * - No rgba() in fill/stop-color — use hex + opacity attributes
 * - No CSS filter on text elements
 * - No exotic Unicode glyphs that might be missing from system fonts
 */
import sharp from "sharp";
import { getPublicAscent } from "@/lib/services/public-ascent.service";
import { getRarityId, RARITY_COLORS, RARITY_LABELS } from "@/lib/rarity";

export const runtime = "nodejs";

const W = 1200;
const H = 630;

function pngResponse(buf: Buffer, maxAge = 86400) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/png",
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

/** Minimal guaranteed-to-work PNG (navy solid color, no SVG) */
async function navyFallback(): Promise<Buffer> {
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = 13; buf[i * 3 + 1] = 37; buf[i * 3 + 2] = 56; // #0D2538
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ascent = await getPublicAscent(id);

    // ── No ascent / no photo → brand fallback ──────────────────────────────
    if (!ascent?.photoUrl) {
      const png = await navyFallback();
      return pngResponse(png);
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
      const png = await navyFallback();
      return pngResponse(png, 60);
    }

    const photo = await sharp(photoBuffer)
      .resize(W, H, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    // ── SVG overlay (librsvg-safe: hex colors, no CSS filters) ─────────────
    const rarity = getRarityId(ascent.peak.altitudeM);
    const rarityColor = RARITY_COLORS[ascent.peak.rarityId ?? rarity] ?? RARITY_COLORS[rarity];
    const rarityLabel = RARITY_LABELS[rarity];

    const peakNameLines = wrapText(ascent.peak.name, 22);
    const peakFontSize = peakNameLines[0].length > 18 ? 64 : 76;
    const peakLineH = Math.round(peakFontSize * 1.15);
    const peakBaseY = H - 60;
    const altY = peakBaseY - peakNameLines.length * peakLineH - 14;

    const altText = `${ascent.peak.altitudeM.toLocaleString("en")} m${
      ascent.peak.mountainRange ? `  ·  ${ascent.peak.mountainRange}` : ""
    }`;

    // Badge dimensions
    const badgeLabel = rarityLabel;
    const badgeW = badgeLabel.length * 10 + 40;
    const badgeH = 30;
    const badgeX = 52;
    const badgeY = altY - badgeH - 14;

    const peakNameSvgLines = peakNameLines
      .map(
        (line, i) =>
          `<text x="52" y="${peakBaseY + i * peakLineH}"
            font-family="sans-serif" font-size="${peakFontSize}"
            font-weight="bold" fill="#ffffff" letter-spacing="-1">${esc(line)}</text>`
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
  <text x="${badgeX + badgeW / 2}" y="${badgeY + badgeH * 0.70}"
    text-anchor="middle" dominant-baseline="middle"
    font-family="sans-serif" font-size="14" font-weight="bold"
    fill="${rarityColor}">${esc(badgeLabel)}</text>

  <!-- Altitude -->
  <text x="52" y="${altY}"
    font-family="sans-serif" font-size="22" font-weight="normal"
    fill="#ffffff" fill-opacity="0.75">${esc(altText)}</text>

  <!-- Peak name -->
  ${peakNameSvgLines}

  <!-- Peakadex watermark top-left -->
  <text x="28" y="42"
    font-family="sans-serif" font-size="14" font-weight="bold"
    fill="#ffffff" fill-opacity="0.40" letter-spacing="3">PEAKADEX</text>
</svg>`;

    const png = await sharp(photo)
      .composite([{ input: Buffer.from(overlay), blend: "over" }])
      .png()
      .toBuffer();

    return pngResponse(png);
  } catch (err) {
    // Last resort: return a plain navy PNG so the browser never shows a broken image
    console.error("[og-image] unhandled error:", err);
    try {
      const png = await navyFallback();
      return pngResponse(png, 60);
    } catch {
      return new Response("error", { status: 500 });
    }
  }
}
