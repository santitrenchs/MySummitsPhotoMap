/**
 * OG image generator using sharp — composes a card-style image
 * (mountain photo + gradient + peak info overlay + Peakadex watermark)
 * that appears in WhatsApp/social previews.
 *
 * Uses sharp instead of next/og because next/og (resvg) crashes on Railway.
 * sharp is bundled with Next.js for image optimization and works reliably.
 */
import sharp from "sharp";
import { getPublicAscent } from "@/lib/services/public-ascent.service";
import { getRarityId, RARITY_COLORS, RARITY_LABELS } from "@/lib/rarity";

function pngResponse(buf: Buffer, maxAge = 86400) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=3600`,
    },
  });
}

export const runtime = "nodejs";

const W = 1200;
const H = 630;

/** Escape text for safe SVG embedding */
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Wrap long text to max width (approximate, char-based) */
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ascent = await getPublicAscent(id);

  // ── Fallback: brand-only image (no photo / not public) ─────────────────────
  if (!ascent || !ascent.photoUrl) {
    const fallbackSvg = `
      <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0D2538"/>
            <stop offset="100%" stop-color="#1a3a5c"/>
          </linearGradient>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#bg)"/>
        <text x="${W / 2}" y="${H / 2 - 24}" text-anchor="middle" font-family="serif" font-size="72" fill="white">✿</text>
        <text x="${W / 2}" y="${H / 2 + 48}" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="bold" fill="white">Peakadex</text>
      </svg>`;
    const png = await sharp(Buffer.from(fallbackSvg)).png().toBuffer();
    return pngResponse(png);
  }

  // ── Fetch and resize the ascent photo ──────────────────────────────────────
  let photoBuffer: Buffer;
  try {
    const res = await fetch(ascent.photoUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("photo fetch failed");
    photoBuffer = Buffer.from(await res.arrayBuffer());
  } catch {
    // If photo fetch fails, fall back to brand image
    const fallbackSvg = `
      <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${W}" height="${H}" fill="#0D2538"/>
        <text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white">${esc(ascent.peak.name)}</text>
      </svg>`;
    const png = await sharp(Buffer.from(fallbackSvg)).png().toBuffer();
    return pngResponse(png, 3600);
  }

  // Resize + crop to 1200×630
  const photo = await sharp(photoBuffer)
    .resize(W, H, { fit: "cover", position: "centre" })
    .toBuffer();

  // ── Build SVG overlay ──────────────────────────────────────────────────────
  const rarity = getRarityId(ascent.peak.altitudeM);
  const rarityColor = RARITY_COLORS[ascent.peak.rarityId ?? rarity] ?? RARITY_COLORS[rarity];
  const rarityLabel = RARITY_LABELS[rarity];

  const peakNameLines = wrapText(ascent.peak.name, 22);
  const peakFontSize = peakNameLines[0].length > 18 ? 64 : 76;
  const peakLineH = peakFontSize * 1.1;
  // Bottom of the peak name block (text anchored at baseline from bottom-up)
  const peakBaseY = H - 56 - (peakNameLines.length - 1) * peakLineH;
  const altY = peakBaseY - peakFontSize * 0.35 - 16;
  const mountainRangeY = altY - 30;

  const altText = `${ascent.peak.altitudeM.toLocaleString("en")} m${ascent.peak.mountainRange ? `  ·  ${ascent.peak.mountainRange}` : ""}`;

  // Rarity badge (pill shape)
  const badgeText = `✿  ${rarityLabel}`;
  const badgeW = badgeText.length * 9 + 24;
  const badgeH = 28;
  const badgeX = 52;
  const badgeY = H - 52 - (peakNameLines.length - 1) * peakLineH - peakFontSize - 52;

  const peakNameSvgLines = peakNameLines
    .map((line, i) =>
      `<text x="52" y="${peakBaseY + i * peakLineH}" font-family="sans-serif" font-size="${peakFontSize}" font-weight="900" fill="white" letter-spacing="-1">${esc(line)}</text>`
    )
    .join("\n");

  const overlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Bottom gradient for text readability -->
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
          <stop offset="42%" stop-color="rgba(0,0,0,0.55)" stop-opacity="1"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.82)" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#grad)"/>

      <!-- Rarity badge -->
      <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="14"
        fill="${rarityColor}33" stroke="${rarityColor}" stroke-width="1.5"/>
      <text x="${badgeX + badgeW / 2}" y="${badgeY + badgeH * 0.72}" text-anchor="middle"
        font-family="sans-serif" font-size="13" font-weight="700" fill="${rarityColor}">${esc(badgeText)}</text>

      <!-- Altitude + mountain range -->
      <text x="52" y="${altY}" font-family="sans-serif" font-size="22" font-weight="500"
        fill="rgba(255,255,255,0.75)">${esc(altText)}</text>

      <!-- Peak name -->
      ${peakNameSvgLines}

      <!-- Peakadex watermark — top-left -->
      <g opacity="0.38">
        <text x="28" y="44" font-family="sans-serif" font-size="20" fill="white"
          style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6))">✿</text>
        <text x="52" y="44" font-family="sans-serif" font-size="13" font-weight="700"
          letter-spacing="3" fill="white"
          style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6))">PEAKADEX</text>
      </g>
    </svg>`;

  // Composite overlay onto photo
  const png = await sharp(photo)
    .composite([{ input: Buffer.from(overlay), blend: "over" }])
    .png()
    .toBuffer();

  return pngResponse(png);
}
