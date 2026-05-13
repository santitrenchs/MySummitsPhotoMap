# Handoff — Profile · Cimas (Variant C) + Foto/Etiquetado redesign

## Overview

Redesign of the **`/profile` "Cimas" tab** for Peakadex (Next.js + Prisma + maplibre-gl mountain-summit logging app). The current tab is a flat list of peaks with `name · altitude · ×N` and becomes unmanageable as users log more cimas. The new design adds:

1. A **carousel of 4 trophies** (most climbed, highest, rarest, most recent) — celebrates achievements without competing visually with the list.
2. A **collection KPI strip** (unique peaks, total ascents, rarities seen) — separated from the trophy so the user doesn't confuse "trophy stats" with "collection totals".
3. **Filters**: search by name, by rarity tier, by mountain range, plus sort options — opens as an expandable panel with a results-count CTA.
4. **Richer peak rows**: photo thumbnail, rarity flower, altitude pill tinted by rarity, ×N as a visual capture-stack, last/first ascent dates.
5. A complementary **Foto + Etiquetado** redesign with matching filter language, rarity flower + tagged-by badges on each tile.

## About the design files

The files under `mocks/` are **design references built in React+Babel inline HTML**. They are not production code to copy directly. The task is to **recreate them inside the existing Next.js codebase** (`MySummitsPhotoMap/`) using the repo's patterns: client components, inline styles + Tailwind, the i18n hook, the existing rarity system, and the existing UI helpers.

The mocks live in a `<design-canvas>` showing both mobile (390px) and desktop (760px) viewports side-by-side, plus a snapshot artboard of the filter panel open with filters applied.

## Fidelity

**High-fidelity.** Pixel-perfect colors, typography, spacing, and interactions. Recreate the UI faithfully — small adjustments are OK if they make integration cleaner, but the visual hierarchy and information density must match.

## Files in this handoff

Open `mocks/Profile Cimas.html` in a browser to see the live design. Source pieces:

| File | What it contains |
|---|---|
| `mocks/Profile Cimas.html` | Main entry. Loads fonts + scripts and renders the design canvas. |
| `mocks/profile-data.jsx` | Sample peak data, simplified `<RarityFlower>` SVG, `<PhotoPlaceholder>`, date/number formatters. |
| `mocks/profile-shared.jsx` | `<ProfileHeader>` mock, `usePeakFilters` hook, `SORT_OPTIONS`. |
| `mocks/profile-variant-c.jsx` | **Main reference**. `<VariantC>` + all subcomponents (carousel, trophy card, collection strip, filter panel, peak row, capture stack). |
| `mocks/profile-foto.jsx` | `<PhotoGrid>` shared by Foto and Etiquetado tabs. |
| `mocks/design-canvas.jsx`, `mocks/tweaks-panel.jsx` | Layout helpers for the design surface — not part of the implementation. |
| `screenshots/01-variant-c-mobile.png` | Trophy carousel + start of filter bar (mobile 390 px). |
| `screenshots/02-variant-c-desktop.png` | Same layout at 640 px max-width inside a 760 px viewport. |
| `screenshots/03-filters-open-mobile.png` | Filter panel expanded with rarity = Tundra, range = Pirineos, sort = "Más subidas" applied. Shows the 2-col rarity grid + sort radio + footer CTA. |
| `screenshots/04-foto-tab-mobile.png` | Redesigned Foto tab: search + rarity chips + 3-col grid with rarity flower badges. |
| `screenshots/05-etiquetado-tab-mobile.png` | Same grid with `isTagged` — adds "📸 @username" badges per tile. |
| `SPEC.md` | Component-by-component visual + interaction spec. **Read this before implementing.** |

## Implementation plan

### Components to create

Place under `components/profile/peaks-tab/` (or flat under `components/profile/`):

| Component | Source ref | Notes |
|---|---|---|
| `PeaksTabV2.tsx` | `<VariantC>` in `profile-variant-c.jsx` | Top-level tab. Owns filter state via `usePeakFilters`. Replaces current `PeaksTab` in `ProfileClient.tsx`. |
| `CollectionStatsStrip.tsx` | `<CollectionStatsStrip>` | Dark-bg strip with "TU COLECCIÓN" label and 3 stats. |
| `TrophyCarousel.tsx` | `<TrophyCarousel>` | Horizontal scroll-snap container + dots. Computes the 4 trophies from the peaks list. |
| `TrophyHeroCard.tsx` | `<TrophyHeroCard>` | Individual trophy card. Single hero stat in accent color on the right. |
| `PeakFiltersBar.tsx` | Sticky filter bar inside `<VariantC>` | Search input + "Filtros" button + active filter chips when panel is closed. |
| `PeakFiltersPanel.tsx` | The `{filtersOpen && …}` block | Expandable panel: header, rarity grid, range chips, sort radios, footer CTA. |
| `PeakRowCard.tsx` | `<TrophyCard>` (the row, badly named in the mock — rename) | List row: rarity strip · photo · name · tier pill · capture stack · dates. |
| `CaptureStack.tsx` | `<CaptureStack>` | Stacked chips visualization of ×N. |
| `usePeakFilters.ts` | `usePeakFilters` in `profile-shared.jsx` | Hook returning `{ query, tier, range, sort, setters, filtered }`. |
| `PhotosTabV2.tsx` | `<PhotoGrid>` in `profile-foto.jsx` | Replaces both `PhotosTab` uses (regular and tagged). Takes `isTagged?: boolean`. |
| `PhotoTile.tsx` | `<PhotoTile>` | Tile with rarity flower + tagged-by badge + overlay. |

### Files to modify

| File | Change |
|---|---|
| `components/profile/ProfileClient.tsx` | Replace `<PeaksTab>` use with `<PeaksTabV2 peaks={peaks} />`. Replace `<PhotosTab>` (×2) with `<PhotosTabV2 photos={…} isTagged={…} />`. Extend the local `Peak` and `Photo` types — see "Data model" below. |
| `lib/services/profile.service.ts` | Extend the `peakMap` aggregation (~lines 52–64) to include per-peak: `rarityId` (use `Peak.rarityId` from DB, NOT recompute), `country`, `mountainRange`, `firstDate = min(date)`, `lastDate = max(date)`, `firstPhotoUrl` (first photo of the most recent ascent). Add `rarityId` to each `Photo` returned. |
| `app/(app)/profile/page.tsx` | If needed, ensure the Prisma `select` for peaks/photos pulls the extra fields. |
| `components/brand/RarityFlowers.tsx` | Add `HeatherFlower`, `TundraFlower`, `DrabaFlower` SVGs and register them in the `RARITY_FLOWERS` export map. Currently only 6 of 9 tiers have SVGs. Fallback: render `RARITY_ICON = "✿"` tinted with `RARITY_COLORS[id]` if you ship before the SVGs land. |
| `lib/i18n/{ca,en,es,fr,de}.ts` | Add the new keys listed below — all 5 locales. |
| `app/globals.css` | Add `.scroll-snap-hide-bar::-webkit-scrollbar { display: none; }` if the inline `<style>` approach in the mock feels too ad-hoc. |

### Source-of-truth rules — must follow

- **Rarity tier**: use `getRarityId(altitudeM)` from `lib/rarity.ts`. Do NOT re-define a tier map. The mock has its own `tierOf()` for sandbox isolation — discard it.
- **Rarity color**: use `RARITY_COLORS[id]` from `lib/rarity.ts`. Hex values in the mocks match this table exactly.
- **Rarity flower SVG**: use `components/brand/RarityFlowers.tsx` (the detailed botanical ones), not the simplified flower in the mock.
- **DB**: `Peak.rarityId` is already persisted. Use the column — don't recompute on the client.
- **i18n**: every visible string must go through `useT()` / `i()`. The mocks are Spanish-only.

## Data model (additions to the `Peak` and `Photo` types in `ProfileClient.tsx`)

```ts
type Peak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  country: string | null;          // NEW
  rarityId: RarityId;              // NEW — from DB column
  count: number;                   // existing
  firstDate: Date;                 // NEW
  lastDate: Date;                  // NEW
  firstPhotoUrl: string | null;    // NEW — hero thumbnail
};

type Photo = {
  id: string;
  url: string;
  ascentId: string;
  peakName: string;
  altitudeM: number;
  rarityId: RarityId;              // NEW
  date: Date;
  creatorName?: string;            // existing — used in tagged tab
};
```

(Continued in `SPEC.md` — visual + interaction details per component.)
