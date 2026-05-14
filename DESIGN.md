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

### Rarity Pills (emoji-only)

Compact icon+count pills — no label text, name in `title` tooltip only.

```
display: inline-flex · alignItems: center · gap: 5
padding: 7px 11px · borderRadius: 999

inactive:  border 1.5px #E5E7EB  · bg #f9fafb
active:    border 1.5px color+"88" · bg color+"22"
locked:    border 1.5px #F1F5F9  · bg #F8FAFC · opacity 0.55

✿ emoji:  fontSize 15 · color: rarity.color (or #CBD5E1 if locked)
count:     font-mono-landing · fontSize 11 · fontWeight 700
           active → rarity.colorDark · inactive → #9ca3af · locked → #CBD5E1
```

### Mythic Pill (⭐)

Same size as rarity pills, amber/gold theme:

```
inactive:  border 1.5px #E5E7EB  · bg #f9fafb
active:    border 1.5px #f59e0b88 · bg #fffbeb
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

## Empty State (no filter results)

When filters return zero results, show a centered ✿ instead of a magnifier.

```
✿ emoji:  fontSize 52 · color: active rarity color (or daisy #16a34a if no rarity filter)
title:    fontSize 15 · fontWeight 600 · color #374151
subtitle: fontSize 13 · color #9ca3af
container: textAlign center · padding 80px 0
```
