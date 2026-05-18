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
