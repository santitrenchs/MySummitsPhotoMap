# SPEC — Profile · Cimas (Variant C) + Foto/Etiquetado

Detailed visual + interaction specifications. Pair this with the live mock at `mocks/Profile Cimas.html`.

---

## Design tokens

All already exist in `lib/rarity.ts` and `app/globals.css`. Stick to these.

### Colors

```
--pc-dark:  #0D2538   /* primary text, hero numbers, sticky filter bg on focus */
--pc-orange: #FF5D2D  /* trophy "most climbed" accent */
--ld-accent: #2F7A5F  /* trophy "most recent" accent, "Ver N cimas" CTA */
--ld-muted:  #5A6E84  /* secondary text */

Rarity accents (from RARITIES table — DO NOT redefine):
  daisy      #00995C    soft: #D1FAE5   deep: #065F46
  heather    #06B6D4    soft: #CFFAFE   deep: #155E75
  gentian    #1E40AF    soft: #DBEAFE   deep: #1E3A8A
  tundra     #0E7490    soft: #CFFAFE   deep: #164E63
  edelweiss  #A855F7    soft: #F3E8FF   deep: #6B21A8
  draba      #EC4899    soft: #FCE7F3   deep: #9D174D
  saxifrage  #F97316    soft: #FFEDD5   deep: #9A3412
  cinquefoil #EAB308    soft: #FEF9C3   deep: #854D0E
  snow_lotus #94A3B8    soft: #F1F5F9   deep: #334155

Neutrals:
  #F4F7FA      page bg below header strip
  #F8FAFC      input bg
  #F1F5F9      subtle dividers, dot inactive
  #E5E7EB      borders
  #CBD5E1      placeholder ticks
  #94A3B8      mono caps labels
  white        cards
```

### Typography

```
--font-inter         Inter   400/500/600/700/800   body, chips, buttons
--font-space         Space Grotesk 700/800         peak names, hero stats, panel titles
--font-mono-landing  JetBrains Mono 500/600/700    altitudes, dates, ALL CAPS micro-labels, counts
```

Standard sizes used:

| Use | Family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Mono micro label "RAREZA" / "ALTITUD" | mono | 9 | 700 | 0.14–0.18em |
| Mono coordinates / dates | mono | 10–12 | 600–700 | 0.02em |
| Mono inline data (altitude, ×N) | mono | 11–12 | 700–800 | 0.01em |
| Peak name (row + trophy) | space | 14–18 | 700 | -0.015em |
| Hero trophy stat (number) | space | 28 | 800 | -0.025em |
| Hero trophy stat (word like "Edelweiss") | space | 20 | 800 | -0.025em |
| Collection KPI value | space | 22 | 700 | -0.025em |
| Filter panel header "Filtrar tus cimas" | space | 14 | 700 | -0.01em |
| Inter chip / button | inter | 11–13 | 600–700 | 0 |

### Spacing & radius

```
Card radius             14–18 px
Pill / chip radius      999 px (full)
Input radius            10–12 px
Panel radius            16 px
Section gap (page)      12–16 px
Inner card padding      14 px
Row vertical padding    (rowH - thumbH) / 2  → cozy: rowH=88, thumb=72 → 8 px
Gap inside row          12 px
```

Shadows:
- Cards: `0 1px 3px rgba(13,37,56,0.06), 0 12px 32px rgba(13,37,56,0.10)`
- Filter panel: `0 4px 24px rgba(13,37,56,0.08)`
- Dropdown menus: `0 12px 32px rgba(13,37,56,0.12)`
- Rarity flower badges: `0 2px 8px rgba(13,37,56,0.2)`

---

## Component specs

### 1. `CollectionStatsStrip`

Lives **above** the trophy carousel, on the dark gradient header band.

```
Layout:
  padding: 14px 16px 14px
  
  Eyebrow:  "TU COLECCIÓN"   mono 9px / 700 / 0.20em letter-spacing
            color: rgba(255,255,255,0.55)
            margin-bottom: 6px
  
  Stats row (display:flex, gap: 18px, align-items: baseline):
    [22 únicas]   [35 ascensiones]   [6/9 rarezas]
    
    Each stat:
      value: Space Grotesk 22px / 700 / white / -0.025em
      label: Inter 12px / 500 / rgba(255,255,255,0.6) / margin-left: 5px
```

Background: this strip sits on the page's gradient bg:
```css
background: linear-gradient(180deg, #0D2538 0%, #112A40 160px, #F4F7FA 160px);
```

i18n keys:
- `profile_collection_title` → "Tu colección" / "La teva col·lecció" / "Your collection" / "Ta collection" / "Deine Sammlung"
- `profile_collection_unique` → "únicas" (1-word, not pluralized)
- `profile_collection_ascents` → "ascensiones"
- `profile_collection_rarities` → "rarezas" (`6/9 rarezas`)

### 2. `TrophyCarousel` + `TrophyHeroCard`

**4 trophies, computed from `peaks[]`:**

| id | eyebrow (es) | criterion | accent | highlight label | highlight value |
|---|---|---|---|---|---|
| `most` | "★  Cima más subida" | `max(count) → max(altitude)` | `#FF5D2D` | "Ascensiones" | `×{count}` |
| `alt` | "⛰  Cima más alta" | `max(altitudeM)` | `#0E7490` | "Altitud" | `{altitude} m` (use `formatNumber`) |
| `rare` | "✨  Rareza más rara" | highest tier index, then altitude | `RARITY_COLORS[tier]` | "Especie" | `RARITIES[tier].label` |
| `recent` | "◐  Última cima" | `max(lastDate)` | `#2F7A5F` | "Conquistada" | `formatDateShort(lastDate)` |

Skip a trophy if the peaks list is empty.

**Carousel container:**
- `display: flex`, `overflowX: auto`, `scroll-snap-type: x mandatory`, scrollbar hidden.
- Each slide: `flex: 0 0 100%`, `scroll-snap-align: start`, `padding: 0 16px`.
- After the scroller: a row of dots (`gap: 6px`, centered).
  - Active dot: `22 × 6px`, `background: #0D2538`.
  - Inactive: `6 × 6px`, `background: rgba(13,37,56,0.22)`.
  - Transition: `all 0.25s ease`.
- Active-dot index synced via a `scroll` listener: `Math.round(scrollLeft / clientWidth)`.
- Tap on a dot → `scrollTo({ left: clientWidth * i, behavior: 'smooth' })`.

**Card (`TrophyHeroCard`):**
- White, radius 18, padding 14, border `1px solid rgba(13,37,56,0.07)`, big card shadow.
- 2-column flex (gap 14):
  - **Left**: `width: 84, height: 108`. Photo placeholder (`PhotoPlaceholder` w/ `peak.firstPhotoUrl`). Rarity flower badge floats top-right at `top: -4, right: -4`, in a `28×28` white circle with shadow, flower SVG `20×20` inside.
  - **Right** (flex column):
    1. Top row: eyebrow (mono caps 9px/700, accent color) + `{index}/{total}` counter (mono 9px/700, `#CBD5E1`).
    2. Peak name — Space Grotesk 17px/700, max 2 lines (`-webkit-line-clamp: 2`).
    3. Altitude+tier line — mono 11px/700 in `deep` rarity color, format: `{formatNumber(alt)} m · {RARITIES[tier].label}`.
    4. Spacer (`flex: 1`).
    5. **Hero stat row** — `borderTop: 1px dashed #E5E7EB`, paddingTop 10, marginTop 10, flex `space-between`, align-items: flex-end.
       - Left side: cordillera (mono caps 9px/700/`#94A3B8`) over country (mono 10px/600/`#5A6E84`).
       - Right side: highlight label (mono caps 9px/700/`#94A3B8`) over highlight value (Space Grotesk 28px/800 in accent color — drop to 20px if `value.length > 7`).

### 3. `PeakFiltersBar` (sticky, when panel closed)

Inside `<VariantC>`, just below the carousel — sticky at `top: 0` with `backdrop-filter: blur(8px)`.

```
Layout (display:flex, gap:8, align-items:center, padding: 0 16px 12px):
  ┌──────────────────────────────┐  ┌──────────────┐
  │ 🔍  Buscar cima…             │  │ ☰ Filtros  3 │
  └──────────────────────────────┘  └──────────────┘
```

- Search input: `flex: 1`, `padding: 10px 12px 10px 32px` (icon on left, `width: 14`, `stroke: #94A3B8`).
  - White bg, radius 12, `1px solid #E5E7EB`, `box-shadow: 0 1px 2px rgba(13,37,56,0.04)`.
  - Font 13/`#0D2538`.
  - Placeholder: `t.profile_filter_searchPlaceholder` → "Buscar cima…"
- Filters button: same radius/border/shadow.
  - Icon: 3-line filter glyph (longest top, medium middle, shortest bottom).
  - Label: "Filtros" (i18n: `t.profile_filter_button`).
  - **Active count badge** when ANY of (tier, range, sort≠default) are set: orange dot `#FF5D2D` containing the count (mono 10/800/white), `16×16`, radius 999. When the panel is open, badge swaps to white-on-dark and the button itself flips to `background: #0D2538`, `color: white`.

**Active filter recap** (rendered when panel is closed AND any filter is active):
- Row of `<ActiveChip>` below the bar: rarity (tinted), range (dark), sort (green).
- Each chip: white bg, `1px solid {color}55`, label in color, plus a `16×16` `×` button with bg `{color}1A`.
- Clicking the × clears just that filter.

### 4. `PeakFiltersPanel` (when open)

Drops below the filters bar (not a sheet — inline expansion).

**Container**: white, radius 16, `1px solid #E5E7EB`, shadow `0 4px 24px rgba(13,37,56,0.08)`, overflow hidden.

**Header** (12 14 padding, border-bottom):
- Title: "Filtrar tus cimas" (Space Grotesk 14/700/-0.01em). i18n: `t.profile_filter_title`.
- Close `×` button on right: `26×26` round, bg `#F1F5F9`, icon stroke 2.6.

**Section: Rareza** (`padding: 14 14 4`)
- Label: mono 9/700/0.16em uppercase, `#94A3B8`, "Rareza" (i18n: `t.profile_filter_rarity`). margin-bottom 6.
- **Grid 2 columns**, gap 6. ALL 9 rarities render, even if 0 (locked state).
- Each chip — flex row, padding `8 10`, radius 12:
  - `26×26` circle (rarity `soft` bg, or `rgba(255,255,255,0.18)` when active) containing the flower 18px.
  - Column with label (12/700) over range (mono 9/600, `r.range` from the table — e.g. `0 – 999 m`).
  - Right: count badge (mono 11/800, `2 7` padding, radius 999, `r.soft` bg, `r.deep` color). When locked (count=0): badge shows `"—"` in `#CBD5E1`, chip opacity 0.55, `disabled`, bg `#F8FAFC`, label `#94A3B8`.
  - Active state: chip bg `r.color`, label white, the count badge bg `rgba(255,255,255,0.22)`, border `r.color`.
  - Inactive (unlocked): chip bg white, label `r.deep`, border `r.soft`.

**Section: Cordillera** (`padding: 0 14 14`)
- Label "Cordillera" (i18n: `t.profile_filter_range`).
- Wrap flex row of chips, gap 6.
- Each chip — pill, `6 10` padding, radius 999, white bg `1px solid #E5E7EB`, label 12/600, with a small count count (mono 10/700/0.5 opacity) suffix.
- Active: bg `#0D2538`, label white, count opacity 0.7.

**Section: Orden** (`padding: 0 14 14`)
- Label "Orden" (i18n: `t.profile_filter_sort`).
- **Grid 2 columns**, gap 6.
- Each option — flex row, `8 10`, radius 10, bg `#F8FAFC`, border `#F1F5F9`.
  - Left: radio dot (14×14 round, border 1.5 `#CBD5E1`; when active, white bg + 6×6 inner dot in `#0D2538`).
  - Label (12/600).
  - Active: bg `#0D2538`, label white.

Sort options (i18n keys + default labels):
| id | key | label (es) |
|---|---|---|
| `altitude_desc` | `profile_sort_altDesc` | "Altitud ↓" |
| `altitude_asc` | `profile_sort_altAsc` | "Altitud ↑" |
| `count_desc` | `profile_sort_countDesc` | "Más subidas" |
| `recent` | `profile_sort_recent` | "Más recientes" |
| `alpha` | `profile_sort_alpha` | "Alfabético" |

**Footer** (`padding: 12 14`, `borderTop: 1px solid #F1F5F9`, `background: #FAFBFC`)
- Left: "Limpiar todo" link (12/600/`#5A6E84`, disabled = `#CBD5E1`). i18n: `t.profile_filter_clearAll`.
- Right: green CTA button "Ver {n} cimas →" — bg `#2F7A5F`, white, radius 999, `9 16` padding, 13/700, chevron icon. i18n: `t.profile_filter_showN` with `{n}` interpolation + `{n,plural,=1{cima}other{cimas}}`.
- Clicking the CTA closes the panel (filters are already applied live as the user edits).

### 5. `PeakRowCard` (each row in the list)

Cards stack with `gap: 10`, padding `8 16 32` around the list.

```
┌─┬──────────┬───────────────────────────────────────────┐
│ │          │ Mont Blanc / Monte Bianco                 │
│ │  photo   │ ✿ Edelweiss                  ┌──┐         │
│ │  96px    │                              │×4│   ×4    │
│ │  square  │ ULTIMA       PRIMERA         └──┘         │
│ │          │ 12 ago 24    14 jul 19          Pirineos  │
└─┴──────────┴───────────────────────────────────────────┘
   ↑ rarity vertical strip (4px wide, full height)
```

- Container: white, radius 16, `1px solid rgba(13,37,56,0.06)`, subtle shadow.
- **Rarity strip**: `width: 4px`, `background: RARITY_COLORS[tier]`, flex-shrink 0.
- **Photo column**: `width: 96px`, full row height. Bottom gradient overlay (55%) + altitude overlay (mono 10/700/white, 6px from bottom, text-shadow).
- **Content column** (`padding: 10 12`, flex column, gap 6):
  - Header row: peak name (Space 14/700, 1-line ellipsis) + `CaptureStack` on the right.
  - Pill below name: inline-flex, `2 7` padding, radius 999, bg `r.soft`, color `r.deep`, contents: flower 11px + label 10/700.
  - Bottom row (margin-top: auto): "ÚLTIMA" date label + "PRIMERA" date label (only if `count > 1`) + spacer + cordillera (mono 10/600/`#CBD5E1`). Date label: mono caps 8/700/`#94A3B8` over mono 11/700/`#0D2538`.

### 6. `CaptureStack` (×N visualization)

Shows the count as a stack of mini "capture cards", max 4 visible.

- `visible = min(count, 4)`
- For each `i` in `0..visible-1`:
  - `18 × 22` rounded rect (radius 4), border `1.5px solid {accent}`.
  - First (`i=0`, foreground): bg = accent color, contains `×{count}` text (mono 11/800/white).
  - Others: bg = white, mini drop shadow, no text, overlap by `-6px` margin-left.
- If `count > 4`, append `+{count - 4}` (mono 10/700 in accent color, margin-left 4).

If `count === 1`: render a single subtle `×1` mono 12/600/`#94A3B8` text — no stack.

### 7. `PhotosTabV2` (Foto + Etiquetado)

Used for both tabs. The `isTagged` prop changes:
- Placeholder copy: "Buscar foto donde apareces…" vs "Buscar foto por cima…".
- Each tile shows a "📸 @{taggedBy}" badge top-right.

**Filter bar** (sticky, white, padding `12 16`, `borderBottom: 1px solid #E5E7EB`):
- Search input (same style as peaks).
- Quick chips row (`overflow-x: auto`):
  - "Todas" pill — dark when active.
  - One pill per rarity tier that has ≥1 photo: flower 13 + label + count (mono 10/600 with opacity 0.7). Active: bg `r.color`, white.

**Count strip** (`padding: 10 16 6`, flex space-between):
- Left: mono caps 10/700/`#94A3B8` → `"{n} {n,plural,=1{foto}other{fotos}}"`.
- Right: native `<select>` for sort with the same 3 options (Recientes, Mayor altitud, Alfabético).

**Grid**: `display: grid; grid-template-columns: repeat(3, 1fr); gap: 6; padding: 0 16 32`.

**Tile** (aspect-ratio 1, radius 8, dark fallback bg):
- Photo fills the tile.
- Top-left: `20×20` round white pill (rgba 0.95) with the flower (14 inside).
- Top-right (only when tagged): `📸 @marc` style badge — dark bg rgba 0.78, white 8/700 text, `2 6` padding, radius 999, backdrop-blur.
- Bottom overlay: linear-gradient `to top`, padding `16 6 5`. Peak name (9/700/white, ellipsis), and a flex row below: altitude (mono 8/700 in `r.color`) + date (mono 8/700 in `rgba(255,255,255,0.7)`).

---

## Interactions

| Interaction | Behavior |
|---|---|
| Tap a trophy dot | Smooth-scroll the carousel to that slide. |
| Swipe carousel | Native scroll-snap. Active dot updates from scroll listener. |
| Type in search | Live filtering. No debounce needed (client-side, fast). |
| Tap "Filtros" button | Toggles `filtersOpen`. While open, filters apply live. |
| Tap a rarity / range / sort option | Applies/clears that filter. The "Ver N cimas" footer button updates the count live. |
| Tap a locked rarity (count=0) | No-op (button disabled). |
| Tap "Limpiar todo" | Resets query, tier, range, sort to defaults. Stays inside the panel. |
| Tap "Ver N cimas →" | Closes the panel (filters already applied). |
| Tap × on an active filter chip (when panel closed) | Clears just that one. |
| Tap a peak row | Navigate to `/ascents?peakId={peak.id}` (or `/ascents/[id]` of the most recent — match the existing peaks tab navigation). |
| Tap a photo tile | Navigate to `/ascents/{ascentId}`. |
| Empty filter result | Show centered card: "Ninguna carta encaja" / "Prueba con menos filtros." (i18n keys `profile_emptyFiltered_title` / `profile_emptyFiltered_body`). |

---

## i18n keys (add to all 5 locales: ca, en, es, fr, de)

```
profile_collection_title          → "Tu colección"
profile_collection_unique         → "únicas"
profile_collection_ascents        → "ascensiones"
profile_collection_rarities       → "rarezas"

profile_trophy_mostClimbed        → "Cima más subida"
profile_trophy_highest            → "Cima más alta"
profile_trophy_rarest             → "Rareza más rara"
profile_trophy_recent             → "Última cima"

profile_trophy_label_ascents      → "Ascensiones"
profile_trophy_label_altitude     → "Altitud"
profile_trophy_label_species      → "Especie"
profile_trophy_label_conquered    → "Conquistada"

profile_filter_button             → "Filtros"
profile_filter_searchPlaceholder  → "Buscar cima…"
profile_filter_title              → "Filtrar tus cimas"
profile_filter_rarity             → "Rareza"
profile_filter_range              → "Cordillera"
profile_filter_sort               → "Orden"
profile_filter_clearAll           → "Limpiar todo"
profile_filter_showN              → "Ver {n} {n,plural,=1{cima}other{cimas}}"

profile_sort_altDesc              → "Altitud ↓"
profile_sort_altAsc               → "Altitud ↑"
profile_sort_countDesc            → "Más subidas"
profile_sort_recent               → "Más recientes"
profile_sort_alpha                → "Alfabético"

profile_emptyFiltered_title       → "Ninguna carta encaja"
profile_emptyFiltered_body        → "Prueba con menos filtros."

profile_photos_searchPlaceholder       → "Buscar foto por cima…"
profile_photos_searchTaggedPlaceholder → "Buscar foto donde apareces…"
profile_photos_countLabel              → "{n} {n,plural,=1{foto}other{fotos}}"
profile_photos_tagAll                  → "Todas"
```

Use the existing `i()` plural syntax (`{n,plural,=1{singular}other{plural}}`) — see CLAUDE.md "i18n plural regex" warning. Already correctly implemented in `lib/i18n/index.ts`.

---

## Sticky positioning gotcha

The mobile header is 52 px (`--top-nav-h`). The profile tabs row is `~44 px` sticky below it. The new filter bar should be sticky at `top: calc(var(--top-nav-h, 52px) + 44px)` so it doesn't slide under the tabs.

In the mock the sticky top is `0` because the canvas frame strips chrome — adjust for the real app.

---

## What to skip / defer

- The mock includes a "tweakable density" toggle (compact/medium/cozy). Ship with **cozy only** (88px rows + 72px thumb + 96px photo). Density is not user-facing.
- The mock uses simplified 5-petal `RarityFlower` SVGs. In production use `RARITY_FLOWERS` from `components/brand/RarityFlowers.tsx`. The 3 missing flowers (Heather, Tundra, Draba) need to be created — they can be done in a follow-up PR; fallback to the `✿` icon tinted with `RARITY_COLORS[id]` until they land.
- The "filters open" snapshot artboard is just an alternate render state for review — there's only one filter panel implementation.

## Acceptance checklist

- [ ] All 9 rarity tiers render in the filter panel (locked when count=0).
- [ ] Trophy carousel shows 4 cards, snap-scrolls horizontally, dots stay in sync.
- [ ] Collection KPI strip uses `peaks.length`, `sum(count)`, `unique tiers count + "/9"`.
- [ ] Filter button shows badge when any of tier/range/sort is non-default.
- [ ] Active filter chips (panel closed) clear individually with their ×.
- [ ] "Limpiar todo" / "Ver N cimas" footer works as described.
- [ ] All copy is i18n'd in 5 locales.
- [ ] Sticky filter bar respects `--top-nav-h` and the tabs row.
- [ ] Foto and Etiquetado tabs both use the same `PhotosTabV2`, with `isTagged` flipping the search placeholder and the per-tile creator badge.
- [ ] Tier comes from `Peak.rarityId` (DB), not recomputed.
- [ ] No new color constants — everything sources from `lib/rarity.ts` + globals.css.
