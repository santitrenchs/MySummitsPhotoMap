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

| # | Section | Show condition |
|---|---------|----------------|
| 1 | HeroHeader | Always |
| 2 | OnboardingBanner | `totalAscents == 0` |
| 3 | ProgressionSection | Always |
| 4 | MonthlyChartSection | `totalAscents >= 1` AND `monthlyStats` not empty |
| 5 | RarityChartSection | `totalAscents >= 1` |
| 6 | LeaderboardCard | `leaderboard.size > 1` — title **"Tu cordada"** |
| 7 | NoFriendsCta | `totalFriends == 0` |
| 8 | RecentAscentsRow | `recentAscents` not empty — title **"Tus últimas cimas"** |

**Motivation banner (🏆 / ⚠️ / 🎯): web only. Never render it on Android or iOS.**

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

**Level pill** — rounded full, bg `#EFF6FF`, text `#0369A1` 12sp bold. Text = `currentLevel.name` (from API) fallback `"Scout"`.

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

### 3 — ProgressionSection

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
- Count label above bar: 10sp bold blue (hidden if 0 summits)
- Stacked bar (`Column`, segments **reversed** so last segment is drawn at bottom, total max height `64dp`, min height `3dp` for zero-month). Each segment colored by rarity (`RARITIES[i].color`). Top corners `3dp` radius.
- Month label below: 3-letter abbreviated month, 10sp `#94A3B8`

Empty month bar: solid `#E5E7EB` fill.

---

### 5 — RarityChartSection

Same `ChartCard` wrapper. Title: `"Cimas por rareza"`.

9 columns (one per rarity), `verticalAlignment = Bottom`, gap `4dp`. For each rarity:
- Count label: 10sp bold, rarity color (hidden if 0)
- Bar: max height `96dp`, min height `3dp`. Color = `RARITIES[i].color` if count > 0, else `#E5E7EB`. Top corners `3dp` radius.
- `"✿"` icon below: 14sp, rarity color if active, `#E5E7EB` if inactive.

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
text = levelNameForIdx(entry.levelIdx)  ← maps 1→"Scout" … 6→"Zenith"
```

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

**Why both patterns**: tap-active-tab is iOS convention but invisible to users who don't know it; FAB is discoverable but adds visual weight. Coexist without conflict.
