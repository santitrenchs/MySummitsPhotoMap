# Peakadex — Design System

> Living reference for UI patterns. Add sections incrementally. Claude Design reads this as context.

---

## Brand Assets

### Logo

Full wordmark: **"peak[icon]adex"** — "peak" in navy `#0D2538`, icon in the center, "adex" in slate `#4E6178`.

```
Component:  components/brand/Logo.tsx → <PeakadexLogo />
Font:       Manrope 800, letterSpacing -0.02em
File:       /public/logo-icon.svg  (922×935 viewBox, embeds PNG)
```

The icon between the two text halves is a **green mountain inside a green circle** — the brand mark.
Spacing between text and icon: `height × 0.28` on each side.

Props:
| Prop | Default | Notes |
|---|---|---|
| `height` | 44 | Controls overall size |
| `iconScale` | 1.0 | Icon size relative to height |
| `peakColor` | `#0D2538` | "peak" text color |
| `adexColor` | `#4E6178` | "adex" text color |

### Icon Mark

The standalone brand icon — green mountain with snow cap inside a green circle. Used as favicon and app icon.

```
Favicon:    app/icon.png  (297×301 RGBA PNG, extracted from logo-icon.svg)
Source:     /public/logo-icon.svg  (base64-embedded PNG)
```

Colors in the icon mark:
- Circle stroke + mountain fill: `#4a8c5c` (brand green)
- Snow cap: white `#ffffff`
- Background: transparent

### Branch note

> **`develop` (staging) has the current logo.** `main` (production) still has the old red flower logo (`#DC2626`). Always read `Logo.tsx` and `public/logo-icon.svg` from `develop`.

### Email header

Emails use `renderBrandHeader()` in `lib/email.ts`. The icon is loaded as a remote image:

```html
<img src="${APP_URL}/logo-icon.svg" width="32" height="32" alt="">
```

- "peak": `font-size 28px · font-weight 800 · color #0D2538 · padding-right 9px`
- "adex": `font-size 28px · font-weight 800 · color #4E6178 · padding-left 9px`
- CTA buttons: `background #2F7A5F` (Green CTA, never `#0369a1`)

---

## Fonts

| Variable | Typeface | Used for |
|---|---|---|
| `--font-space-grotesk` | Space Grotesk | Headings, hero numbers, card titles |
| `--font-inter` | Inter | Body text, labels, buttons, UI copy |
| `--font-mono-landing` | Monospace (landing) | Numeric badges, counts, altitude values |

---

## Color Palette

### Base UI
| Token | Hex | Usage |
|---|---|---|
| Navy dark | `#0D2538` | Primary text, headings |
| Navy mid | `#5A6E84` | Secondary text |
| Navy light | `#94A3B8` | Muted / placeholder text |
| Border light | `#E5E7EB` | Card borders, dividers |
| Border softer | `#F1F5F9` | Inner dividers |
| Surface default | `#f9fafb` | Chip/pill inactive background |
| Surface subtle | `#F8FAFC` | Disabled / locked backgrounds |
| Page background | `#F4F7FA` | Profile tab background |

### Brand actions
| Token | Hex | Usage |
|---|---|---|
| Blue active | `#0369a1` | Filter active state, links, clear-all |
| Blue bg | `#eff6ff` | Filter chip active background |
| Blue border | `#bfdbfe` | Filter chip active border |
| Green CTA | `#2F7A5F` | Primary CTA buttons (show results) |

### Rarity colors

> **The rarity emoji is always `✿`** — the same symbol for all rarities, only the color changes. Never use a different emoji (mountain, star, etc.) for rarity indicators.

Each rarity has a vivid `color` and a darker `colorDark`. Used as:
- **Pill bg**: `color + "22"` (hex alpha ~13%)
- **Pill border active**: `color + "88"` (hex alpha ~53%)
- **Pill text**: `colorDark`
- **Emoji ✿**: `color` (vivid)

| id | color | colorDark |
|---|---|---|
| daisy | `#00995C` | `#00763d` |
| gentian | `#A855F7` | `#7c3aed` |
| edelweiss | `#3B82F6` | `#2563eb` |
| saxifrage | `#F97316` | `#c55e0a` |
| cinquefoil | `#EAB308` | `#a87e06` |
| snow_lotus | `#FFD700` | `#b8960c` |

---

## Filter System

Applies to: **Actividades**, **Profile** (Peaks + Photos), **Map sidebar**. All share the same visual language.

### Search + Filter Bar

The entry point for every filter surface. A flex row with two children.

```
container:  display flex · gap 8 · alignItems center
```

**Search input** (left, `flex: 1`):

```
wrapper:    position relative  (holds the SVG icon)

icon:       SVG magnifier 14×14 · stroke #94A3B8 · strokeWidth 2.2
            position absolute · left 10 · top 50% · translateY(-50%)
            pointerEvents none

input:      width 100% · padding 10px 12px 10px 32px · fontSize 16
            border 1px solid #E5E7EB · borderRadius 12
            background white · color #0D2538
            boxShadow 0 1px 2px rgba(13,37,56,0.04)
            outline none · boxSizing border-box
```

**Filter button** (right, `flexShrink: 0`):

```
padding:    10px 14px · borderRadius 12
border:     1px solid #0D2538 (open)  /  1px solid #E5E7EB (closed)
background: #0D2538 (open)  /  white (closed)
boxShadow:  0 1px 2px rgba(13,37,56,0.04)
position:   relative  (for the badge)

icon:       funnel SVG 14×12 · stroke white (open) / #374151 (closed)
            strokeWidth 1.8 · strokeLinecap round
            viewBox "0 0 14 12":  line (0,2)→(14,2)
                                  line (2,6)→(12,6)
                                  line (4,10)→(10,10)
label:      fontSize 13 · fontWeight 700 · color white (open) / #374151 (closed)
            i18n key: profile_filter_button
```

**Active badge** (shown when `hasActiveFilters`, positioned on the button):

```
position:   absolute · top -6 · right -6
size:       16×16 · borderRadius 50%
background: white (open) / #FF5D2D (closed)
count text: font-mono-landing · fontSize 10 · fontWeight 800
            color #0D2538 (open) / white (closed)
```

**Active chips row** (shown below the bar when panel is closed and filters are active):

```
display: flex · flexWrap wrap · gap 6 · marginTop 8

chip:       inline-flex · gap 4 · padding 4px 8px 4px 10px
            background white · border 1px solid color+"55" · borderRadius 999
label:      fontSize 12 · fontWeight 600 · color (filter color)
remove btn: 16×16 · borderRadius 50% · bg color+"1A"
            SVG ×  8×8 · stroke color · strokeWidth 1.8
```

**NEVER use:**
- `borderRadius > 12` on these elements (24 = pill style, wrong for this pattern)
- `border > 1px` 
- Blue `#0369a1` / `#eff6ff` as the active button state (that's for fchips inside the panel, not the button itself)
- A hardcoded "Filtrar" string — always use `t.profile_filter_button`

**Reference implementations:** `components/profile/PeakFiltersBar.tsx`, `components/ascents/AscentsClient.tsx`, `components/map/MapPeaksSidebar.tsx`

---

Both **Ascents** and **Profile** filters share the same visual language.

### Bottom Sheet (mobile)

The filter panel slides up from the bottom as a fixed overlay.

```
position: fixed · left/right/bottom: 0 · zIndex: 301
borderRadius: 24px 24px 0 0
maxHeight: 92svh
boxShadow: 0 -4px 40px rgba(0,0,0,0.14)
paddingBottom: env(safe-area-inset-bottom)
animation: transform translateY(0) ↔ translateY(110%)
           cubic-bezier(0.32, 0.72, 0, 1) · 0.34s
```

**Backdrop:** `position: fixed · inset: 0 · zIndex: 300 · rgba(0,0,0,0.45)` — click closes sheet.

**Structure (top → bottom):**
1. Drag handle — `36×4px · bg #e5e7eb · borderRadius 2 · margin 12px auto 0`
2. Header — `padding: 14px 20px 12px · borderBottom: 1px solid #f3f4f6`
3. Scrollable body — `padding: 18px 20px · gap: 24px between sections · scrollbarWidth: none`
4. Footer CTA — `padding: 12px 20px 16px · borderTop: 1px solid #f3f4f6`

### Header

```
title:    fontSize 17 · fontWeight 800 · color #111827 · letterSpacing -0.3px
right:    when filters active → "Clear all" text button (13px 600 #0369a1)
          when no filters     → × icon button (color #9ca3af, 20×20)
```

### Section Labels

All filter section headings use the same style:

```
fontFamily: Inter
fontSize: 10 · fontWeight: 800 · letterSpacing: 0.1em
color: #9ca3af · textTransform: uppercase
margin-bottom: 8px
```

### Filter Chips (fchip) — generic

Used for: sort options, time range, view mode, mountain range.

```
display: inline-flex · alignItems: center · gap: 5
padding: 8px 14px · borderRadius: 20
fontSize: 13 · fontWeight: 600
whiteSpace: nowrap

inactive:  border 1.5px #e5e7eb  · bg #f9fafb   · color #6b7280
active:    border 1.5px #0369a1  · bg #eff6ff   · color #0369a1
```

Chip rows: `display: flex · flexWrap: wrap · gap: 8`

### Rarity Pills

Used inside filter panels (bottom sheet body). Responsive: emoji-only on mobile, emoji + name on desktop.

```
display: inline-flex · alignItems: center · gap: 5
padding: 7px 11px · borderRadius: 999

inactive:  border 1.5px #E5E7EB  · bg #f9fafb
active:    border 1.5px color+"88" · bg color+"22"
locked:    border 1.5px #F1F5F9  · bg #F8FAFC · opacity 0.55

✿ emoji:  fontSize 15 · color: rarity.color (or #CBD5E1 if locked)
name:      className="rarity-pill-name" · fontSize 11 · fontWeight 600
           active → rarity.colorDark · inactive → #6b7280 · locked → #CBD5E1
           hidden on mobile, visible on desktop via CSS:
             .rarity-pill-name { display: none }
             @media (min-width: 640px) { .rarity-pill-name { display: inline } }
count:     font-mono-landing · fontSize 11 · fontWeight 700
           active → rarity.colorDark · inactive → #9ca3af · locked → #CBD5E1
```

Always add the `<style>` block at the top of the panel component's return (inside the fragment). The `title` attribute on the button still holds the name for tooltip fallback.

### Mythic Pill (⭐)

Same size as rarity pills, amber/gold theme. Also shows "Mythic" label on desktop via `rarity-pill-name`.

```
inactive:  border 1.5px #E5E7EB  · bg #f9fafb
active:    border 1.5px #f59e0b88 · bg #fffbeb

⭐ emoji:  fontSize 13
name:      "Mythic" · className="rarity-pill-name" · same responsive rule
count text active: color #92400e
```

### Footer CTA Button

Full-width green button, primary action.

```
width: 100% · padding: 16px · borderRadius: 14
background: #2F7A5F · color: white
fontSize: 15 · fontWeight: 800
boxShadow: 0 4px 14px rgba(47,122,95,0.32)
```

---

## Loading State (Page Skeleton)

Peakadex uses a **rarity-cycling ✿ spinner** instead of grey block skeletons. Every route-level loading screen (`app/**/loading.tsx`) shares the same pattern.

### Layout

```
Full viewport height (minus nav bars), flex center
container: display flex · flexDirection column · alignItems center
           height: calc(100svh - var(--top-nav-h,0px) - var(--bottom-nav-h,0px))

inner (.loading-inner):
  display flex · flexDirection column · alignItems center · gap 12
  mobile offset: translateX(-3vw)  ← compensates for off-center visual weight of nav
```

### ✿ Flower spinner

```
fontSize: 56 · lineHeight: 1 · opacity: 0.5
animation: rarity-pulse 1.4s ease-in-out infinite
color transition: 0.3s ease  (smooth color crossfade between rarities)
```

```css
@keyframes rarity-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.15); }
}
```

### Rarity label

```
fontSize: 12 · fontWeight: 700 · letterSpacing: 0.04em
color: same rarity color · opacity: 0.45
transition: color 0.3s ease
```

### Cycling logic

Cycles through all 9 RARITIES (daisy → snow_lotus) at **700 ms/step** using `setInterval`.
Both color and label update simultaneously with a CSS `transition: color 0.3s ease`.

```ts
const [idx, setIdx] = useState(0);
useEffect(() => {
  const t = setInterval(() => setIdx((i) => (i + 1) % RARITIES.length), 700);
  return () => clearInterval(t);
}, []);
```

### Files

| Route | File |
|---|---|
| Mi Progreso | `app/(app)/home/loading.tsx` |
| Actividades | `app/(app)/ascents/loading.tsx` |
| Atlas (Map) | `app/(app)/map/loading.tsx` |

All three files are identical — copy any one as template for new routes.

---

## Empty State (no filter results)

When filters return zero results, show a centered ✿ instead of a magnifier.

```
✿ emoji:  fontSize 52 · color: active rarity color (or daisy #16a34a if no rarity filter)
title:    fontSize 15 · fontWeight 600 · color #374151
subtitle: fontSize 13 · color #9ca3af
container: textAlign center · padding 80px 0
```

---

## Home Screen — Mi Progreso

> **Authoritative spec for Android and iOS.** When building this screen on any mobile platform, follow this section exactly — do not improvise from CLAUDE.md's generic description or from old screenshots.

### Section order (top → bottom)

| # | Section | Show condition | Web | Android/iOS |
|---|---------|----------------|-----|-------------|
| 1 | HeroHeader | Always | ✅ | ✅ |
| 2 | OnboardingBanner | `totalAscents == 0` | ✅ | ✅ |
| 3 | ProgressionSection | Always | ❌ removed 2026-05-30 | ✅ |
| 4 | MonthlyChartSection | `totalAscents >= 1` AND `monthlyStats` not empty | ✅ | ✅ |
| 5 | RarityChartSection | `totalAscents >= 1` | ✅ | ✅ |
| 6 | LeaderboardCard | `leaderboard.size > 1` — title **"Tu cordada"** | ✅ | ✅ |
| 7 | NoFriendsCta | `totalFriends == 0` | ✅ | ✅ |
| 8 | RecentAscentsRow | `recentAscents` not empty — title **"Tus últimas cimas"** | ✅ | ✅ |

**Motivation banner (🏆 / ⚠️ / 🎯): removed from web (2026-05-30). Never render it on Android or iOS.**

---

### 1 — HeroHeader

Full-width card with `12dp` margin on all sides, `16dp` rounded corners.

**Background**: `public/brand/hero.png` (1774×887 px) — `ContentScale.Crop`, aligned slightly above center (`backgroundPosition: center 60%` / `BiasAlignment(0f, -0.2f)` in Compose). Fallback fill color `#1C2D3F`. Dark gradient overlay on top:

```
vertical gradient:
  0%   → rgba(10, 20, 35, 0.15)
  55%  → rgba(10, 20, 35, 0.45)
  100% → rgba(10, 20, 35, 0.85)
```

**Content column** (centered, padding `28dp` top / `24dp` sides+bottom, gap `10dp`):

**Avatar** — 68dp circle, `2.5dp` white border at 55% opacity, blue gradient fallback `#3A7BD5 → #1A4A8A`. If `avatarUrl` available: crop-fill. Else: 2-letter initials in white 24sp bold. **Resolution order**: `user.avatarUrl ?? leaderboardEntry.avatarUrl`.

**Name** — 20sp bold white, letterSpacing −0.03em. **Resolution order**: `user.name ?? leaderboardEntry.name ?? ""`.

**Level name** — shown inline after the user name (`· LevelName`). Resolved from `stats.levelIdx` (pre-computed server-side in `user_stats`): `LEVEL_DEFS[stats.levelIdx - 1].name`. Minimum `"Scout"` (idx=1, base level). **Never compute locally** — always use `stats.levelIdx` from the API response.

**Metrics row** — three cells separated by 1dp white-15%-opacity dividers:

| Cell | Value | Label |
|------|-------|-------|
| 1 | `stats.totalAscents` | "ascensiones" |
| 2 | `stats.uniquePeaks` | "cimas" |
| 3 | `stats.maxAltitude` (or "—" if 0) + small superscript "m" | "alt. máx" |

Value: 18sp bold white, letterSpacing −0.04em. Label: 10.5sp white 65% opacity.

**Cairns + EP pill** — shown only when leaderboard contains the current user. Rounded full, bg `rgba(255,255,255,0.15)`, padding `5dp × 14dp`:
- `△` icon, amber `#FBBF24`, 12sp bold
- `{cairns} Cairns` — amber `#FBBF24`, 12.5sp semibold
- `·` separator — white 35% opacity, 16sp
- `+{ep} EP` — white, 12.5sp bold

---

### 2 — OnboardingBanner

Shown when `totalAscents == 0`. Green gradient card.

```
background: linear-gradient(135deg, #F0FDF4 → #DCFCE7)
border:     1.5dp solid #86EFAC
radius:     16dp
padding:    20dp
alignment:  center
```

- Title: `"Cada cima guarda una historia."` — 18sp extrabold `#14532D`, letterSpacing −0.02em
- Subtitle: `"Captura tu primera ascensión y empieza a escribir la tuya."` — 14sp `#166534`, lineHeight 1.5
- CTA button: `"Capturar primera ascensión"` — bg `#16A34A`, white text 14sp bold, radius 8dp, shadow `rgba(22,163,74,0.35) 0 4px 12px`. Tap → open new ascent modal/flow.

---

### 3 — ProgressionSection (Android/iOS only — removed from web 2026-05-30)

> **Level source of truth**: `lib/level-utils.ts` → `LEVEL_DEFS`. Android reads `stats.levelIdx` from the API and converts to 0-based index: `(stats.levelIdx - 1).coerceIn(0, LEVEL_DEFS.lastIndex)`. **Never compute level locally.**

Current level thresholds (all based on **unique peaks**, not total ascents):

| idx | Name | Unique peaks | Alt req |
|-----|------|--------------|---------|
| 1 | Scout | — (base) | — |
| 2 | Guide | ≥ 20 | ≥1 peak > 2000m |
| 3 | Explorer | ≥ 50 | ≥1 peak > 3000m |
| 4 | Alpinist | ≥ 100 | ≥1 peak > 4000m |
| 5 | Master | ≥ 150 | ≥1 peak > 5000m |
| 6 | Zenith | ≥ 220 | ≥1 peak > 6500m |

Container: `16dp` horizontal padding, `20dp` top padding, `animateContentSize`.

**Collapsed state**: shows only the single in-progress level (= `currentLevelIdx + 1`, or last level if already maxed).

**Expanded state**: shows all 6 levels.

**Toggle button**: `TextButton`, full width. Text:
- Collapsed: `"Ver todos los niveles →"` — primary color, 13sp semibold
- Expanded: `"Ver menos"` — `onSurfaceVariant`, 13sp semibold

#### LevelCard

Row with `IntrinsicSize.Min` height. `12dp` rounded corners.

| State | bg | border |
|-------|----|--------|
| In-progress | `#EFF6FF` | `#BFDBFE` 1.5dp |
| Done | `#F9FAFB` | `#E5E7EB` 1.5dp |
| Locked | `#F9FAFB` | `#E5E7EB` 1.5dp, **50% alpha** |

**Left accent bar**: `4dp` wide, full height. Color `#0369A1` for in-progress only; transparent otherwise.

**Status badge** — 28dp circle:
- Done: green `#16A34A`, white `"✓"` 11sp extrabold
- In-progress: blue `#0369A1`, white level index number 11sp extrabold
- Locked: gray `#D1D5DB`, white `"🔒"` 9sp

**Name** — level name text only, no emoji. 15sp extrabold. In-progress: `#0369A1`. Others: `#111827`. Single line, ellipsis overflow.

**Pills** (right side, `Row`, gap 4dp):
- `"{N} cimas"` — gray pill `#F3F4F6` bg, `#374151` text, 11sp semibold, 6dp radius
- `"Superar los {threshold}m"` — same style for each altReq

**Progress bar** (in-progress level only): 6dp tall, `#DBEAFE` track, blue gradient fill `#0369A1 → #0EA5E9`, `3dp` radius. Below: `"{uniquePeaks} / {target} cimas"` left + `"{pct}%"` right in `#0369A1` 13sp bold. Below that: `"→ {N} cima(s) más"` in `#6B7280` 12sp.

---

### 4 — MonthlyChartSection

Shared `ChartCard` wrapper (white surface, 1dp `outlineVariant` border, 16dp radius, 16dp padding). Title: `"Últimos 6 meses"`. Subtitle row: total summits in blue + total meters ascended in dark gray.

Bar chart: one column per month, `verticalAlignment = Bottom`, gap `6dp`. For each bar:
- Count label above bar: 10sp bold blue (hidden if 0 summits). **Tappable/clickable** → filters by that month (`?month=YYYY-MM&view=mine`).
- Stacked bar (`Column`, segments **reversed** so last segment is drawn at bottom, total max height `64dp`, min height `3dp` for zero-month). Each segment colored by rarity (`RARITIES[i].color`). Top corners `3dp` radius. **Each segment is individually tappable** → filters by that rarity + mine view (`?rarity=<rarityId>&view=mine`).
- Month label below: 3-letter abbreviated month, 10sp `#94A3B8`. **Tappable** → filters by that month.

Empty month bar: solid `#E5E7EB` fill. **Not tappable** (no summits to filter).

**Counts**: `rarityBreakdown` in `MonthlyBar` counts **all ascents** (including repeat climbs of the same peak) — no deduplication.

**Implementation:**
- **Web** (`MonthlyChart` in `HomeClient.tsx`): outer container is a `<div>`, count label and month label are `<Link href="?month=...">`, each stacked segment is a `<Link href="?rarity=...&view=mine" display="block">`.
- **Android** (`MonthlyChartSection` in `HomeScreen.kt`): each segment `Box` has `Modifier.clickable(indication=null, interactionSource=remember{MutableInteractionSource()})` → calls `onNavigateToCardsWithRarity(seg.rarityId)`. `BarSegment(rarityId, color, heightDp)` data class carries the rarity ID through.

---

### 5 — RarityChartSection

Same `ChartCard` wrapper. Title: `"Cimas por rareza"`.

9 columns (one per rarity), `verticalAlignment = Bottom`, gap `4dp`. For each rarity:
- Count label: 10sp bold, rarity color (hidden if 0)
- Bar: max height `96dp`, min height `3dp`. Color = `RARITIES[i].color` if count > 0, else `#E5E7EB`. Top corners `3dp` radius.
- `"✿"` icon below: 14sp, rarity color if active, `#E5E7EB` if inactive.

**Active bars (count > 0) are tappable** → filters Cards/Ascensiones by that rarity + mine view (`?rarity=<rarityId>&view=mine`). Inactive bars (count = 0) are not tappable.

**Counts**: shows **unique peaks** per rarity (peaks deduped by `peakId` in `home.service.ts`). This intentionally differs from the monthly chart — clicking a bar may reveal more cards in the filtered view, since the filter shows all ascents (including repeat climbs).

**Implementation:**
- **Web** (`RarityChart` in `HomeClient.tsx`): active column wrapped in `<Link href="?rarity=<rarityId>&view=mine">`, inactive column stays as a plain `<div>`.
- **Android** (`RarityChartSection` in `HomeScreen.kt`): `Modifier.clickable(indication=null)` applied only when `isActive`, via `.then(if (isActive) Modifier.clickable(...) else Modifier)` on the `Column`.

---

### 6 — LeaderboardCard

Container: `16dp` horizontal padding, `16dp` rounded corners, 1dp `outlineVariant` border, white surface.

**Column header row** (inside the card, above the divider):
- Padding start `19dp` (16 outer + 3 for the left border slot of the current user row), end `16dp`, vertical `10dp/4dp`
- `22dp` spacer (rank column) + `weight(1f)` spacer (name) + `"Cimas"` w:52dp + `"Cairns"` w:52dp + `"EP"` w:44dp
- Header text: 10sp semibold `#94A3B8`, centered

`HorizontalDivider` between headers and rows.

#### Current user row

`IntrinsicSize.Min` row. Background: horizontal gradient `#EFF6FF → #F0F9FF`.

Left blue border strip: `3dp` wide, full height, `#0369A1`.

Inner padding: start 16dp, end 16dp, top 16dp, bottom 14dp.

- **Rank**: 22dp wide, 13sp bold `#0369A1`
- **Name column** (`weight(1f)`):
  - Row: name text (14sp bold `#0F172A`, ellipsis) + `" (tú)"` (12sp `#64748B`)
  - Below: level pill (see below)
- **Cimas**: `#0369A1`
- **Cairns**: `#D97706` (amber — always amber, regardless of user)
- **EP**: `#0369A1`

#### Other user rows

Padding: `horizontal 16dp, vertical 12dp`.

- **Rank**: 22dp wide, 13sp bold `#D1D5DB` (light gray — no medals)
- **Name column** (`weight(1f)`):
  - Name: 13sp semibold `#111827`
  - Below: level pill
- **Cimas**: `#374151`
- **Cairns**: `#D97706`
- **EP**: `#374151`

#### Level pill (inside leaderboard rows)

```
bg: #F3F4F6, text: #374151, 10sp bold, 4dp radius, padding 6dp×2dp
text = entry.levelIdx >= 1 ? LEVEL_DEFS[entry.levelIdx - 1].name : "—"
```

`entry.levelIdx` = number of completed levels from `user_stats` (0 = none, 1 = Scout done, …, 6 = Zenith done). **Never use `% LEVEL_DEFS.length`** — it maps `levelIdx=0` to Zenith incorrectly.

#### Metric column

`14sp extrabold`, centered, column width as above. No label below the number (labels are in the header row).

---

### 7 — NoFriendsCta

```
background: linear-gradient(135deg, #EFF6FF → #F0F9FF)
border:     1.5dp DASHED #BFDBFE
radius:     12dp
padding:    22dp
alignment:  center
```

- Emoji `"👥"` 36sp
- Title: `"El camino se disfruta más acompañado."` — 15sp bold `#111827`
- Subtitle: `"Encuentra tu cordada, revive cada ascensión y creced juntos en la montaña."` — 13sp `#6B7280`
- CTA: `"Invitar amigos"` — bg `#0369A1`, white text, `8dp` radius. Tap → navigate to friends/invite screen.

---

### 8 — RecentAscentsRow

Horizontal scroll row, `16dp` horizontal content padding, `12dp` gap between cards.

**RecentAscentCard** — 150dp wide, 12dp radius, 1dp `outlineVariant` border:
- Photo area: 120dp tall, `ContentScale.Crop`. Placeholder: `🏔️` emoji 40sp on `surfaceVariant` bg.
- Bottom gradient overlay (transparent → `rgba(0,0,0,0.65)`): peak name 12sp bold white + altitude 10sp white 80% opacity.

---

### Shared components

**ChartCard**: Column with 16dp margin, 8dp vertical, 16dp radius, 1dp `outlineVariant` border, white bg, 16dp inner padding. Title: `titleMedium` bold. Optional subtitle row. 16dp space before content.

**SectionTitle**: `titleMedium` bold, `onBackground` color, `16dp` horizontal + `20dp` vertical padding.

**Pill**: `#F3F4F6` bg, `#374151` text, 11sp semibold, 6dp radius, `10dp×4dp` padding.

---

### Rarity color palette (for charts)

Order matches `RarityBreakdown.toList()` (index 0–8):

| # | Name | Color |
|---|------|-------|
| 0 | Daisy | `#00995C` |
| 1 | Heather | `#06B6D4` |
| 2 | Gentian | `#1E40AF` |
| 3 | Tundra | `#0E7490` |
| 4 | Edelweiss | `#A855F7` |
| 5 | Draba | `#EC4899` |
| 6 | Saxifrage | `#F97316` |
| 7 | Cinquefoil | `#EAB308` |
| 8 | Snow Lotus | `#94A3B8` |

---

## Logbook Screen — Bitácora

> **Authoritative spec for Android and iOS.** When building the Logbook/Bitácora screen on any mobile platform, follow this section exactly. The Android implementation in `mobile/android/.../feature/logbook/` is the reference.

---

### Behaviour & data contract

- **API endpoint**: `GET /api/v1/ascents` — returns own + friends ascents combined.
- **Default view**: **Friends only** (`viewFilter = Friends`). Never "All". Never "Mine".
- **Friends is the baseline**: it does NOT count as an active filter — no chip shown for it, `isDirty = false` while Friends is selected.
- **Server-side canonical sort**: the API already sorted correctly — unseen friends first by altitude desc, then own + seen friends by date desc. `SortOrder.DateDesc` on the client means **preserve API order, do not re-sort**.
- **mark-as-seen**: after successful load, collect IDs where `!isOwn && isUnseen`, wait **3 seconds**, then `POST /api/v1/feed/seen` with `{ ascentIds: [string] }`. Fire-and-forget — failures are non-critical.

### Filter state (exact spec)

```
ViewFilter  : All | Mine | Friends   — default: Friends
TimeRange   : All | Month | Year     — default: All
SortOrder   : DateDesc | ElevDesc    — default: DateDesc

isDirty = viewFilter ≠ Friends
       || rarityId ≠ null
       || mythic = true
       || timeRange ≠ All
       || sort ≠ DateDesc

clearFilters() → resets everything EXCEPT search text
```

---

### Unseen indicator

`ascent.isUnseen = true` means a friend logged this ascent and the current user has never seen it (no `FeedSeen` row for this user + ascent pair).

Visual: **green dot `#22C55E`, 9dp diameter**, overlaid on the **top-right corner** of the card avatar. Do not show a dot on own ascents.

---

### Flip card — anatomy

The card flips on tap (Y-axis rotation, 700 ms). Front shows the photo; back shows stats.

**Front side:**

| Layer | Spec |
|-------|------|
| Header row | Avatar 32dp circle (+ unseen dot top-right if isUnseen) · user name 13sp bold · date 11sp muted |
| Photo | `4:5` aspect ratio · 18dp radius · ContentScale.Crop · placeholder 🏔️ 52sp |
| Gradient overlay | bottom 55% of photo: transparent → `rgba(7,18,31,0.42)` → `rgba(7,18,31,0.82)` |
| Peak name | 24sp extrabold white, letterSpacing −0.035em, 1 line ellipsis |
| Route | 13sp white 80% opacity, 1 line ellipsis (hidden if null) |
| Range · altitude | 10sp white 60% opacity, 1 line ellipsis |
| Stats band (3 equal cells) | **RAREZA** `✿ {label}` (rarity color) · **ALTITUD** `{n} m` (dark) · **EP** `+{n}` (rarity color) |

**Back side:**

| Layer | Spec |
|-------|------|
| Card background | vertical gradient `#0A1929 → #1A3A55 → #0F2233` + radial `rgba(255,255,255,0.08)` overlay |
| Bottom gradient overlay | transparent → `rgba(0,7,18,0.63)` → `rgba(0,7,18,0.94)` (bottom 70%) |
| Coordinates | top-right · 10sp white 70% |
| Mountain range | 11sp white 70% |
| Peak name | 22sp black white, letterSpacing −0.04em, 1 line |
| Altitude | 28sp black white, letterSpacing −0.04em |
| Rarity progress bar | 4dp tall · `rgba(255,255,255,0.25)` track · rarity.color fill · width = `altitudeM / 8849` |
| Stats row (2 cells) | **ASCENSIONES** `—` · **ALPINISTAS** `—` (placeholder until future endpoint) |
| Persons byline | `{name} con {persons…}` · 13sp · 2-line clamp |
| Description | 13sp muted · 2-line clamp |

---

### Filter bottom sheet — sections

Four sections, always in this order:

#### 1 — EXPLORAR

Three chips: **Todos** · **Mis cimas** · **Amigos**. Default selected: **Amigos**.

Uses the generic fchip style (blue active: `#0369A1` bg `#EFF6FF` border `#0369A1`).

#### 2 — RAREZA

Nine rarity chips (✿ emoji only — no label) + one Mythic chip (⭐ Mythic, amber theme).

**Critical coloring rule — never use gray for unselected rarity chips:**

| State | ✿ text color | chip bg | chip border |
|-------|--------------|---------|-------------|
| Unselected | `rarity.color` @ **50% alpha** | `rarity.color` @ **7% alpha** | `rarity.color` @ **30% alpha** |
| Selected | `rarity.color` @ **100%** | `rarity.color` @ **15% alpha** | `rarity.color` solid |

This makes every rarity visually distinct before the user taps it. Daisy = green, Heather = cyan, Gentian = dark blue, Tundra = teal, Edelweiss = purple, Draba = pink, Saxifrage = orange, Cinquefoil = yellow, Snow Lotus = slate.

**Mythic chip:**

| State | bg | border |
|-------|----|--------|
| Unselected | `#F9FAFB` | `#E5E7EB` |
| Selected | `#FFFBEB` | `#F59E0B` (amber) |

#### 3 — CUÁNDO

Three chips: **Último mes** · **Este año** · **Siempre**. Default: **Siempre**.

`Month` = last 30 days. `Year` = current calendar year (not last 365 days).

#### 4 — ORDENAR POR

Two chips: **Más reciente** (default) · **Mayor altitud**.

`Más reciente` → preserve API order (do not sort client-side).  
`Mayor altitud` → sort client-side by `peak.altitudeM` descending.

---

### Filter sheet — footer CTA

Full-width green button: `"Ver {n} resultado{s}"`.

```
bg: #2F7A5F · color: white · 15sp extrabold · 14dp radius · shadow rgba(47,122,95,0.32) 0 4dp 14dp
```

Tap → close sheet. Result count comes from the already-filtered list (reactive).

---

### Active chips row

Shown below the search bar when `isDirty = true`. Horizontal scroll. Each chip has an ✕ to remove just that filter.

| Active filter | Chip label | Colors |
|---------------|-----------|--------|
| ViewFilter.All | `👁 Todos` | blue (`#EFF6FF` bg, `#BFDBFE` border, `#1D4ED8` text) |
| ViewFilter.Mine | `👤 Mis cimas` | blue (same) |
| mythic | `⭐ Mythic` | amber (`#FFFBEB` bg, `#F59E0B` border, `#92400E` text) |
| rarityId | `✿ {rarity.label}` | rarity color (bg @ 12%, border @ 35%) |
| Month | `📅 Último mes` | neutral (`#F3F4F6` bg, `#E5E7EB` border, `#374151` text) |
| Year | `📅 {currentYear}` | neutral |
| ElevDesc | `⛰ Mayor altitud` | green (`#F0FDF4` bg, `#BBF7D0` border, `#15803D` text) |

**Friends chip is NEVER shown** — it's the default state, not a filter deviation.

`clearFilters()` removes all active filters but keeps the search text intact.

---

### Empty states

| Condition | Emoji | Title | Subtitle |
|-----------|-------|-------|---------|
| Friends view + no data (default on first load) | 👥 52sp | "Sin actividad de amigos" | "Cuando tus amigos registren cimas aparecerán aquí.\nUsa el filtro para ver tus propias ascensiones." |
| Mine view + no ascents at all | 🏔️ 52sp | "Tu bitácora está vacía" | "Registra tu primera ascensión para empezar." |
| Any filter combination → 0 results | ✿ 48sp (`#0369A1`) | "Sin resultados" | "Prueba a ajustar la búsqueda o los filtros." |

---

### Rarity definitions (canonical — 9 rarities)

Use these exact values. `minAlt` is the lower bound (inclusive). `ep` is the experience points awarded.

| id | label | color | minAlt | ep |
|----|-------|-------|--------|----|
| daisy | Daisy | `#00995C` | 0 | 10 |
| heather | Heather | `#06B6D4` | 1000 | 20 |
| gentian | Gentian | `#1E40AF` | 2000 | 30 |
| tundra | Tundra | `#0E7490` | 3000 | 60 |
| edelweiss | Edelweiss | `#A855F7` | 4000 | 120 |
| draba | Draba | `#EC4899` | 5000 | 250 |
| saxifrage | Saxifrage | `#F97316` | 6000 | 500 |
| cinquefoil | Cinquefoil | `#EAB308` | 7000 | 1000 |
| snow_lotus | Snow Lotus | `#94A3B8` | 8000 | 2000 |

`getRarityForAltitude(m)` → last rarity in the list where `m >= minAlt`.  
Example: 2500 m → gentian. 3999 m → tundra. 4000 m → edelweiss.

---

## Back-to-top — two complementary patterns

Long feeds (Bitácora and any future scrollable list) provide two ways to return to top.

### 1. Tap active tab → scroll to top (iOS-native convention)

Tapping the bottom nav tab that is **already active** scrolls the page to top instead of re-navigating. Lives in `NavBar.tsx` `handleTabClick`:

```ts
function handleTabClick(href: string) {
  if (pathname === href) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  setPendingPath(href);
}
```

This matches what iPhone users instinctively try. Works on all tabs (Mi Progreso, Atlas, Bitácora, Social).

### 2. Floating Action Button (FAB)

Reusable component: `components/ui/ScrollToTopButton.tsx`. Drop it inline anywhere a long scroll exists. Currently mounted in `AscentsClient`.

```
size:        44 × 44 px circle
background:  rgba(13, 37, 56, 0.92)   (--brand-ink with 8% transparency)
icon:        ↑ arrow, 18 × 18, stroke 2.5, white
shadow:      0 4px 14px rgba(13, 37, 56, 0.25)
position:    fixed · right 16px · bottom calc(var(--bottom-nav-h, 0px) + 16px + env(safe-area-inset-bottom))
z-index:     90
visibility:  fade + slide 8px when scrollY crosses 1500px
transition:  opacity 0.18s, transform 0.18s
behavior:    onClick → window.scrollTo({ top: 0, behavior: "smooth" })
```

---

## Login Screen — Android (rediseño 2026-05-27)

> **Authoritative spec for Android (and future iOS).** Follow this section exactly — do not revert to a generic form layout.

### Concept

Premium / emotional / collectible. The login screen is the first impression of the app — it should feel like opening a collectible cards product, not a utility form. Three visual zones:

1. **Logo** — centered wordmark at 46dp, generous breathing room above the card
2. **Login card** — white elevated card, no visible border, rounded 24dp corners
3. **Brand closer** — fan of collectible cards (70% screen width) + two-color tagline below

---

### Background

```
Color: #F2F5F8   (LoginBg — warm neutral, slightly cooler than white)
```

---

### Logo

```
Component:  PeakadexLogo(height = 46.dp)
Position:   centered, 24dp below status bar, 20dp above card
```

---

### Login card

```
Shape:       RoundedCornerShape(24.dp)
Background:  Color.White
Elevation:   10dp (default + pressed + focused), 12dp hovered
Border:      none — elevation creates depth without a hard edge
Padding:     horizontal 24dp, vertical 28dp
```

#### Card contents (top → bottom)

| Element | Spec |
|---|---|
| "¿No tienes cuenta?" row | `Row + heightIn(48dp) + clickable`, full line = tap target, 14sp |
| Space between label and "Créala" | `Spacer(width = 4.dp)` — NOT a trailing space in XML |
| Email field | `OutlinedTextField`, green focus border (`PeakGreenCTA`), 15sp |
| Password field | Same + show/hide `IconButton` (EyeIcon / EyeOffIcon inline SVGs) |
| Forgot password | Right-aligned `TextButton`, default Material padding, 13sp `PeakNavyMid` |
| Error pill | Red `Surface` + `BorderStroke(1dp, #FECACA)`, bg `#FEF2F2`, text `#DC2626` |
| Sign-in button | 50dp height, `PeakGreenCTA` bg, ExtraBold 15sp white, `CircularProgressIndicator` when loading |
| Divider | Two `HorizontalDivider` + center "o" label, 12sp `PeakNavyLight` |
| Google button | `OutlinedButton`, multicolor G icon (`tint = Color.Unspecified`), "Continuar con Google" 14sp Medium |

---

### Collectible cards image

```
Asset:       R.drawable.login_cards_preview  (fan of 3 cards, 1038×918 px PNG)
Width:       fillMaxWidth(0.70f)   ← 70% of screen width
Scale:       ContentScale.FillWidth
Position:    20dp below the login card, centered
```

The image must never be cropped or resized — `FillWidth` preserves the natural fan/shadow perspective.

---

### Tagline (brand closer)

```
Position:   16dp below the cards image, centered
Font:       20sp SemiBold
Alignment:  TextAlign.Center
Colors:     navy (#0D2538) for p1 · gold (#F5C842, --ld-gold) for p2
```

Pattern: **setup in navy + payoff in gold** — matches the landing page visual grammar.

```
"Convierte tus cimas"         ← PeakNavyDark
"en cartas coleccionables."   ← #F5C842 (TaglineGold)
```

The space between p1 and p2 is appended in Kotlin (`"$p1 "`) — never in the string resource (Android strips trailing whitespace from XML).

---

### Safe areas

```
Top:    statusBarsPadding()
Bottom: Spacer(navigationBarsPadding()) + Spacer(16dp)
IME:    imePadding() on the outer Column — keyboard pushes content up correctly
```

---

### Touch targets (Material Design compliance)

- **"¿No tienes cuenta? Créala"**: `Row.heightIn(min=48.dp)` — full row is tappable, not just "Créala"
- **Forgot password**: `TextButton` with default Material padding (no override) → ~48dp tap height
- **Sign-in**: 50dp explicit height ✓
- **Google**: 48dp explicit height ✓
- **Password toggle**: `IconButton` default 48×48dp ✓

**Never use `contentPadding = PaddingValues(0.dp)` on a TextButton** — this strips the touch target below 48dp and violates Android accessibility guidelines.

---

## Profile Screen — Bitácora tabs (Cimas / Fotos / Etiquetado)

### PhotoTile — rarity flower badge

Each photo tile in the Fotos and Etiquetado 3-column grid has a rarity flower badge pinned to the **top-left corner**:

```
┌──────────────────────┐
│ ●✿                   │  ← white circle 22dp, top-left offset 5dp
│                      │
│   [photo]            │
│                      │
│ @creator (tagged tab)│  ← bottom gradient overlay
└──────────────────────┘
```

| Property | Value |
|---|---|
| Position | `Alignment.TopStart`, offset `x=5.dp, y=5.dp` |
| Circle size | 22dp |
| Circle bg | `Color.White.copy(alpha = 0.95f)` |
| Icon | `"✿"`, 13sp, `lineHeight = 13.sp` |
| Icon color | `rarityColor` (from `rarity.color` hex) |
| Fallback color | `PeakClimbedGreen` |

**Web** (`PhotosTabV2.tsx`): identical layout — 20px white circle at `top:5; left:5` wrapping `<RarityFlower size={14} />`.

---

### PeakRowCard — repeat count pill (Cimas tab)

When a peak has been climbed more than once (`peak.count > 1`), a compact pill appears to the right of the peak name:

```
┌────────────────────────────────────────┐
│  [photo]  │ Pica d'Estats    ┌────┐    │
│           │                  │ ×3 │    │  ← rarity-tinted pill
│           │ ✿ Snow Lotus     └────┘    │
│           │ Última: 12 ene '24         │
└────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Shape | `RoundedCornerShape(6.dp)` |
| Background | `rarityColor.copy(alpha = 0.13f)` |
| Border | 1dp, `rarityColor.copy(alpha = 0.30f)` |
| Text | `"×{count}"`, 10sp, `FontWeight.Bold` |
| Text color | `rarityColorDark` |
| Shown when | `peak.count > 1` only — single ascents show nothing |

**Web** (`CaptureStack.tsx`): stacked-squares visual for count > 1 (up to 4 squares in rarity color, overflow badge `+N`). Returns `null` for `count ≤ 1` — the `×1` plain-text case was removed to avoid noise.

**Why both patterns**: tap-active-tab is iOS convention but invisible to users who don't know it; FAB is discoverable but adds visual weight. Coexist without conflict.

---

## Atlas Screen — Map & List (Android)

> **Authoritative spec for Android (and future iOS).** Implementation lives in `AtlasScreen.kt` + `AtlasViewModel.kt`.

### Map view — peak dots

Unclimbed peaks are rendered as colored circle dots (rarity color, radius 7dp). Climbed peaks are circular photo markers (88dp bitmap, rarity-colored ring). The map dots are **viewport-culled** using a composite score to avoid saturating the screen at low zoom levels.

**Zoom ramp** (linear, no abrupt jumps):

| Zoom | What the user sees | % of viewport peaks shown |
|---|---|---|
| ≤ 5 | Continent / country | 5% — only the most significant landmarks |
| 8 | Mountain range | ~38% |
| 11 | Region / valley | ~86% |
| ≥ 13 | Valley / town | 100% — no culling |

Score formula per peak: `normAlt × 0.5 + rarityWeight × 0.3 + normDist × 0.2`  
(`normDist` = proximity to viewport center, closer = higher score)

### List view — data source

The list panel is **decoupled from the map zoom**. When the user taps "Lista":
- A fresh API query fires with a **fixed ~50 km radius bbox** around the map center (zoom=12 → up to 500 peaks).
- The list always shows the same density regardless of how zoomed in or out the map is.
- A `CircularProgressIndicator` shows while loading (typically < 200ms on a good connection).
- On close, `listPeaks` is cleared to free memory.
- If the map center is not yet available (camera still settling), the list falls back to `lastBounds` center so it always loads data.

### List row anatomy (Android)

```
┌────────────────────────────────────────┐
│ [44dp photo/dot]  Peak Name      300 m │
│                   Massís · ES    1.2km │
└────────────────────────────────────────┘
```

| Element | Climbed peak | Unclimbed peak |
|---|---|---|
| Left visual | 44dp thumbnail, `RoundedCornerShape(8dp)`, rarity-colored 1.5dp border | 9dp blue dot (centered in 44dp box) |
| Peak name | 15sp SemiBold | 15sp SemiBold |
| Subtitle | mountainRange · country | mountainRange · country |
| Right: altitude | 13sp SemiBold, `PeakNavyDark` | 13sp SemiBold, `PeakNavyDark` |
| Right: distance | 11sp, `PeakSubtle` (km or m) | 11sp, `PeakSubtle` |
| Row divider | `HorizontalDivider` 1dp `PeakBorderLight` | same |
| Row padding | `horizontal=16dp, vertical=10dp` | same |

---

## Cards Screen — View filter (Android, 2026-05-29)

The view filter uses `SecondaryTabRow` (M3), replacing the previous `SingleChoiceSegmentedButtonRow`. Tabs are 48dp tall with no extra vertical padding — saves ~12dp vs the segmented button.

```
┌──────────────────────────────────────┐
│  Mis Cards  │  Mi Cordada            │  ← SecondaryTabRow, 48dp
│─────────────│                        │     underline indicator, PeakBlueActive
└──────────────────────────────────────┘
```

| Tab | Filter | Behavior |
|-----|--------|----------|
| Mis Cards (index 0) | `ViewFilter.Mine` | Own ascents, date desc |
| Mi Cordada (index 1) | `ViewFilter.Friends` | Friends only (`isOwn == false`), server canonical sort |

Active tab: `PeakBlueActive` text + `FontWeight.SemiBold` + underline indicator.  
Inactive tab: `PeakMuted` text + `FontWeight.Normal`.  
`containerColor = Color.White`, `contentColor = PeakBlueActive`.

---

## Bottom Navigation Bar — Hide on scroll (Android, 2026-05-29)

The bottom nav bar hides on downward scroll and reappears on upward scroll. Applies to **Home, Bitácora, and Cards** screens. **Atlas is excluded** — MapLibre's `AndroidView` does not dispatch Compose nestedScroll events so the bar never hides on the map.

**Behavior:**
- Scroll **down** (content moving up, `available.y < -3f`) → bar slides out downward in 220ms
- Scroll **up** (content moving down, `available.y > 3f`) → bar slides back up in 220ms
- **Tab switch** → bar immediately resets to visible (no animation needed, instant state reset)

**Animation:** `slideInVertically` / `slideOutVertically` with `tween(220)`. The `AnimatedVisibility` wrapper affects layout — when the bar is hidden, `innerPadding` bottom padding drops to the system inset value only, and the content gains the extra space.

**The FAB moves with the bar** — when the bar hides, the FAB repositions to near the screen bottom. This is standard Android behavior (YouTube, Gmail).

---

## Auth Gate Loading Screen — SplashScreen (Android, 2026-05-29)

**File:** `feature/splash/SplashScreen.kt`

> Not to be confused with the OS Splash Screen (the one with the app icon, ~200ms, handled by `Theme.Peakadex.Splash`). This screen is shown while the app resolves auth state (typically 500–1000ms).

**Design:** full white screen, `PeakadexLogo(height = 44.dp)` centered.

```
background: #FFFFFF
logo:       PeakadexLogo at 44dp height, centered horizontally and vertically
duration:   1000ms minimum, then navigates to Login or Home
```

**Rationale:** the OS splash screen already shows the app icon on a white background, so this creates a seamless white → white → app transition. The wordmark at 44dp is slightly larger than the top bar (32dp) to read well on a full screen. No animation — clean and fast.

**Previous design (removed):** animated `✿` emoji cycling through rarity colors (`RARITIES` list) with scale pulse, on a `#0D2538` navy background. Replaced because the navy background created a jarring color transition to the white login screen.

---

## Top Bar — Avatar + Profile Menu Sheet (cross-platform, 2026-06-02)

The shared `MainTopBar` (logo centered, avatar right) is present on all root tabs. The avatar is the entry point to the profile menu.

**Avatar:** 34dp circle. Always render the user's **photo** (`avatarUrl`) with initials only as fallback. On Android use the shared `UserAvatar(name, size, avatarUrl)` component (Coil `AsyncImage` + initials fallback) — never a hand-rolled circle that only shows initials. A red count badge (`#EF4444`, "9+" cap) overlays the top-right corner for pending **friend requests**.

**Tap → bottom sheet, not a dropdown.** A small dropdown menu reads cramped and un-premium. Use a bottom sheet (Gmail/Spotify/Instagram pattern):

```
┌─────────────────────────────────────┐
│  ◯  Santi                            │  52dp avatar + name 16sp bold
│     santi@gmail.com                  │  email 13sp #6B7280 (hidden if blank)
├─────────────────────────────────────┤
│  👤  Perfil                          │  icon 22dp + label 15sp medium
│  ⚙   Ajustes                         │
└─────────────────────────────────────┘
```

- White surface, no drag handle, `skipPartiallyExpanded`, safe-area bottom padding.
- Header: avatar + name + email. Rows: icon `size 22` + 14dp gap + label 15sp medium `#374151`, row padding 20/16.
- **Logout is NOT here — it lives in Ajustes.** The avatar menu is navigation-only; destructive/rare actions don't belong in a quick-access surface.

**Avatar must survive app restart.** Persist `name` + `avatarUrl` locally next to the auth token and restore them synchronously on launch, so the avatar shows immediately without waiting for a network call. Refresh via the user/me endpoint when the cached `avatarUrl` is null (or to pick up a changed photo).

**Inline-icon alignment rule.** When icons are drawn as vector paths (not bitmaps), center the path content around the viewport center — do NOT rely on the layout box alone. Two glyphs of equal box size but off-center content (e.g. one hugging the left edge, one the right) will look misaligned in a vertical list even though their Rows are identical.

---

## Cordadas + Amigos — Unified Social Screen (Android, updated 2026-06-02)

> **Authoritative cross-platform spec.** This is the reference for rebuilding the Amigos + Cordadas section on **web** and **iOS**. The Android implementation in `mobile/android/.../feature/friends/` is the reference. Follow the navigation, layout, behaviours, Material patterns and data contracts below exactly. See `CLAUDE.md → "Cordadas — Climbing Groups"` for the data model + API and the deeper rationale of every fix.

WhatsApp-style **single screen** (Option B — friends and cordadas intermixed in one list). **No Amigos/Cordadas sub-tabs.**

**Files:** `feature/friends/FriendsScreen.kt` (host, friend rows, search, solicitudes, FAB speed-dial, shared row helpers/tokens) · `feature/friends/CordadasTab.kt` (`CordadaCard`, `InviteCard`, create/invite sheets, **`CordadaDetailRoute` + `CordadaDetailScreen`**) · `FriendsViewModel.kt` + `CordadasViewModel.kt`.

### Navigation — it is a root tab, NOT a dropdown/secondary screen

- Reached via a **bottom-nav tab "Cordada"** (two-users icon) sitting **between Stats and Bitácola**. It lives inside the main tab `NavHost`, so it **shares the app's `MainTopBar` (logo + avatar menu) and the bottom nav**, exactly like the other root tabs.
- It is **NOT** in the avatar dropdown anymore (removed) and is **NOT** a standalone full-screen route.
- **No own header.** The screen content starts directly at the search bar. (On Android the nested `Scaffold` sets `contentWindowInsets = WindowInsets(0,0,0,0)` so there is no white gap under `MainTopBar` — on web/iOS just don't render a second header.)
- The global **"new ascent" `+` FAB is hidden on this tab**; the screen renders its own green `+` FAB instead.

### Tab badge (pending-invite indicator)

The **Cordada bottom-nav tab shows a red count badge** (`BadgedBox`+`Badge`, `#EF4444`, "9+" cap) when there are pending **cordada invites**. The host (`MainScaffold`) refetches `getFriendsData().incoming.size` (friend-request badge on the avatar) **and** `getCordadas().pendingInvites.size` (cordada tab badge) on **every tab change**. The friend-request avatar badge counts friend requests only; the cordada tab badge counts cordada invites only.

### Screen layout (single `LazyColumn`, top → bottom)

```
┌─────────────────────────────────────┐
│  peakadex                        ◯   │  shared MainTopBar (logo + avatar)
├─────────────────────────────────────┤
│  🔍  search (friends + cordadas)     │  ← STICKY header (stays pinned)
├─────────────────────────────────────┤
│  [search results — only if q ≥ 2]    │
│  SOLICITUDES · N                      │  friend requests + cordada invites
│    👥 Cordada · Invitación de {owner}   [Aceptar][Rechazar]
│    🙂 Persona · solicitud de amistad    [Aceptar][Rechazar]
│  AMIGOS n · CORDADAS m                 │  one neutral count subheader
│    … unified rows, sorted A→Z …       │
│  [empty state if nothing & no query]  │
│                                  (+)  │  green FAB → speed-dial
```

1. **Search** — pinned **sticky header** (white). One box searches both: cordadas filtered locally by name + users via `searchUsers` (remote). Stays reachable while scrolling.
2. **Search results** (only when query ≥ 2 chars): cordada matches under a "Cordadas" label + user matches under a "Amigos/Personas" label; combined "Sin resultados" fallback.
3. **Solicitudes · N** (only if N>0) — friend requests + cordada invites **combined** under one count.
4. **Amigos n · Cordadas m** — friends + cordadas **intermixed, sorted alphabetically** (WhatsApp style). One neutral count subheader.
5. **Empty state** — only when no friends, no cordadas, no requests and the search box is blank.

### Unified row style (THE key Option-B rule)

Friends and cordadas render as **the same flat list row** so they read as one list:
- **Leading 48dp avatar** (`ListRowAvatar = 48`), **16dp horizontal / 8dp vertical padding**, 12dp gap.
- **A cordada is distinguished by its avatar + a member-avatar stack in the subtitle — NOT by a card, border or different background.** (The old mint `#F6FAF8` rounded card was removed.)
- **Inset dividers** between rows (`InsetRule` = `HorizontalDivider` with `start = 76.dp` = 16 + 48 + 12), none after the last item.
- **Friend row** subtitle: `level · {uniquePeaks} Cimas · 🪨{totalCairns} · {totalEp} EP`. Trailing = `⋮` overflow menu (48dp) → **Eliminar** (destructive). **Friend rows are NOT tappable** — there is no friend detail/stats sheet (removed).
- **Cordada row** (`CordadaCard`) subtitle: member-avatar stack + "{n} miembros". Trailing = chevron-right. **Tapping opens the full-screen cordada detail.**

### Solicitudes — accept/reject buttons

All row actions use the shared Material **`RowActionButton`** (≥40dp touch height — never hand-rolled `Box`+`clickable`):
- **Aceptar** = `FilledTonalButton`, **tonal green** (`containerColor #DCFCE7`, `contentColor #16A34A`) — deliberately tonal so it does **not** compete with the solid-green `+` FAB.
- **Rechazar** = `OutlinedButton` (gray border `#E5E7EB`, secondary text).
- Same buttons are reused for friend-request accept/reject, cordada invite accept/reject, search "Añadir", and the invite-member "Invitar".

### FAB speed-dial (`ActionSpeedDialSheet`)

Green circular `+` FAB (bottom-end) → bottom sheet with two rows:
- **Invitar a un amigo** (person-add icon) → `InviteFriendSheet`
- **Crear una cordada** (group-add icon) → `CreateCordadaSheet`

### Accept / reject behaviours (must match on every platform)

- **Accept friend** → optimistic (drop from incoming, append friend) **then `load()` reload** so the new friend shows with **full `user_stats`** (cimas/EP/nivel) instead of zeros.
- **Accept cordada invite** → optimistic remove from `pendingInvites` **then `load()`** → the cordada appears in the unified list with full data.
- **Reject cordada invite** → **deletes** the PENDING membership row (so the user can be cleanly re-invited later).
- Returning to this screen **reloads cordadas on resume** (a member may have left / been expelled / cordada deleted while you were in the detail).

### Friend/member stats source — **read `user_stats`, never recompute**

All friend & cordada-member stats (`levelIdx`, `uniquePeaks`, `totalEp`, `totalCairns`) are read from the **pre-computed `user_stats` table** (`friendship.service.ts` → `prisma.userStats.findMany`, same source as the home leaderboard). They are **not** recomputed by scanning ascents on each load. Missing row → zeros fallback. The table is refreshed by `recomputeUserStats(userId)` after ascent CRUD only.

### Invite friend by email (`InviteFriendSheet`)

`POST /api/v1/invitations`. UI driven by `InviteState { IDLE, SENDING, INVITED, ALREADY_REGISTERED, CANNOT_INVITE_SELF, ERROR }`. Sheet stays open, disables field/button while sending, shows colored feedback, auto-closes ~1.4s after success. (Friend invitations to non-registered emails send a Resend email — existing behaviour.)

### Create cordada (`CreateCordadaSheet`)

`onCreate(name, description, memberIds, avatarBytes)`:
- Circular **84dp photo picker** → square center-crop to 512px JPEG 0.85. Uploaded via `POST /api/v1/cordadas/{id}/avatar` **after** creation (best-effort, wrapped so a photo failure doesn't break creation).
- Name (≤60) + optional description.
- **Member selection** — scrollable accepted-friends list with checkboxes. `memberIds` → `POST /api/v1/cordadas` (server drops non-friend ids).

### Cordada DETAIL — full-screen destination (NOT a sheet)

> **Material list→detail.** The cordada detail is a **full-screen route** (`Screen.CordadaDetail = "cordada/{id}"`) on the **outer** navController — `CordadaDetailRoute`. It is **NOT** an in-tab overlay or a bottom sheet. As a drill-down it **loses the `MainTopBar` and the bottom nav** (correct Material behaviour — bottom nav is only for top-level destinations).

- Opened from a cordada row via `onOpenCordada(id)` → outer `navController.navigate("cordada/$id")`.
- **One single `TopAppBar`** (start-aligned, white): **back arrow on the LEFT** + **title = cordada name** (`R.string.action_back` for the back contentDescription). A `BackHandler` makes the system back close the detail (returns to the list), same as the arrow.
- **No second/empty top bar, no white gap** (the earlier bug of stacking a near-empty bar under `MainTopBar` is fixed by making it a real full-screen destination).
- `CordadaDetailRoute` owns its **own `CordadasViewModel`**, loads the cordada by id (`openDetail(id)`), shows a centered spinner until loaded.
- Body (vertical scroll): full-width **cover image** (120dp; owner sees a 44dp edit-photo FAB overlaid) → **member count** (the name lives in the top bar, not duplicated in the body) → **member-avatar cluster + add-member button** (owner) → **RÀNQUING** member leaderboard (rank badge + 52dp avatar + name/"Tú"/Fundador + level + uniquePeaks · 🪨 · EP, sorted `uniquePeaks` desc then `totalEp` desc; per-member expel for owner) → **Invitaciones pendientes** (owner) → destructive footer.
- Footer: owner → **"Eliminar cordada"** (destructive); member → **"Salir de la cordada"**. **Never both** (owner can't leave; on leave/delete the route calls `onBack()`).

### Invite-member sheet (inside detail)

Title "Invitar", search `BasicTextField`; results = `searchUsers` minus current members; each row has **Invitar** (`RowActionButton`) → becomes **Invitado** (`inviteSentIds`).

### Email notification on cordada invite

`inviteToCordada()` (server) sends `sendCordadaInviteEmail(to, inviterName, cordadaName, locale)` — **all 5 locales**, branded template (CTA → `/friends`). **Best-effort** (a send failure never blocks the invite) and **gated on the recipient's `emailNotifications`** master kill-switch.

### Avatars, colors & shared tokens (single source in `FriendsScreen.kt`)

- `CordadaAvatar`: circle, `linearGradient(#059669 → #34D399)`, white bold initials (≤2).
- Tokens: `FriendsTextPrimary #111827`, `FriendsTextSecondary #6B7280`, `FriendsTextMuted #9CA3AF`, `FriendsDivider #F3F4F6`, `FriendsDanger #EF4444`, `FriendsAccept #16A34A`, `FriendsAcceptBg #DCFCE7`. Layout consts `ListRowAvatar = 48`, `ListRowInset = 76`. **Use tokens, not inline hex.**
- All user-visible strings come from `R.string.*` and are translated in **all 5 locales** (es/ca/en/fr/de); back-button contentDescription uses `R.string.action_back`.

### ⚠️ Bottom sheets — nav-bar inset (still applies to Create/Invite/InviteFriend)

Sheets use the shared `CordadaModalSheet` wrapper around Material 3 `ModalBottomSheet`, matching the Atlas `LayersPanel` pattern:
- `rememberModalBottomSheetState(skipPartiallyExpanded = true)` is **mandatory** (otherwise closing the keyboard can settle the sheet at a too-low anchor with the CTA behind the 3-button nav bar).
- Do **not** override `contentWindowInsets`; do **not** thread a manual `bottomInset`.
- Apply `.navigationBarsPadding()` + `.imePadding()` inside the sheet content.

### Not yet implemented (for full parity later)

- **Push notifications (FCM)** for cordada invites / friend requests — pending (only the tab badge + email exist today).
- The tab badge refreshes on tab change, **not** in real time.
