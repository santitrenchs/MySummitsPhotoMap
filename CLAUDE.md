# AziTracks — CLAUDE.md

## Project Overview

AziTracks is a mobile-first social app for mountain climbers and hikers to log their summit ascents, explore peaks on a map, track personal progress, and compete with friends. It sits at the intersection of outdoor activity tracking (like Strava) and summit-bagging culture, with a strong emphasis on visual storytelling and community motivation.

The product is designed for people who climb mountains regularly and want to:
- Keep a beautiful, photo-first record of their ascents
- See what summits their friends have conquered
- Feel motivated by progress metrics and rankings
- Discover new peaks to climb

The MVP focuses on the core loop: **log a climb → share it → see friends' activity → feel motivated to climb more**.

The codebase lives at `MySummitsPhotoMap/` and is built with **Next.js (App Router)**, **Prisma + PostgreSQL**, **AWS S3 / Cloudflare R2** for photo storage, and **maplibre-gl** for maps.

---

## Core Concepts

### Peak
A mountain summit. Global catalog, not user-owned. Has a name, altitude, coordinates, and optionally a mountain range and country. Peaks are the fixed reference points everything revolves around.

### Ascent
A user's documented climb of a specific Peak. Each ascent belongs to one user (via `createdBy`), references one peak, has a date, optional route description, optional Wikiloc embed URL, and zero or more photos. This is the primary content unit of the app.

### Photo
An image attached to an Ascent. Photos are the visual core of the product. Each photo can have face detections and person tags. Tagged persons are independent of the friendship model.

### User
An authenticated person. Has a profile and a personal collection of ascents.

### Tenant
The current multi-tenant abstraction. In practice, a group of users sharing the same data space (e.g., a family or climbing group). All tenants currently share the global DB; per-tenant dedicated DBs are supported via `Tenant.dbUrl`.

---

## Product Structure

The app has four main sections:

### Mi Progreso (Home)
The gamification dashboard. Entry point of the app (root `/` redirects here when authenticated). Shows:
- **Level system**: 10 gamified levels (Trail Seed → Apex Warden), defined in `LEVEL_DEFS` in `HomeClient.tsx`. Each level has `minAscents` and optional `altReqs` (altitude bracket requirements). See level definitions below.
- **Progression section**: collapses to 4 visible rows (1 done before + in-progress + 2 locked). Expand/collapse toggle. "In-progress" level = `levelState.next` (the next unachieved level), not the current achieved one.
- **Summit hero card**: primary metric (total ascents) displayed prominently + altitude distribution breakdown (zone names + count + range, only non-zero buckets shown).
- **Secondary KPIs**: photos, regions, friends as a 3-column row
- **Leaderboard** ("Tu posición en la cordada"): friend ranking with +/- diff badges showing gap vs current user
- **Dynamic motivation banner**: gold 🏆 if #1 with margin, orange ⚠️ if lead threatened (gap ≤ 3), green 🎯 if chasing someone — includes a direct CTA button to log an ascent
- **Recent ascents** ("Tus últimas cimas"): horizontal scroll cards with image overlay
- **Friends activity** ("Actividad de tu cordada"): minimal feed with dual CTAs when empty
- **Achievements**: 7 computed badges with SVG progress rings — gold ring + checkmark when earned, blue ring with `current/target` counter when in progress, gray when locked

Designed to make the user feel proud of their journey and motivated to keep climbing.

#### Level system (10 levels)

Defined as `LEVEL_DEFS: LevelDef[]` in `components/home/HomeClient.tsx`:

| idx | Emoji | Name | minAscents | altReqs |
|-----|-------|------|------------|---------|
| 1 | 🐣 | Trail Seed | 1 | — |
| 2 | 🌱 | Pathling | 3 | — |
| 3 | 🧭 | Ridge Scout | 10 | — |
| 4 | 🥾 | Peak Walker | 15 | — |
| 5 | ⛰️ | Summit Tamer | 25 | ≥1 peak >1000m |
| 6 | ❄️ | Sky Breaker | 40 | ≥1 peak >2000m |
| 7 | 👑 | Peak Master | 60 | ≥1 peak >3000m |
| 8 | 🔥 | Legend Ascender | 80 | ≥1 peak >4000m |
| 9 | 🌌 | Mythic Summiteer | 100 | ≥1 peak >5000m |
| 10 | 🏔️ | Apex Warden | 120 | ≥3 peaks >3000m, ≥1 >4000m, ≥1 >5000m |

`meetsLevel()` checks both `totalAscents >= minAscents` AND all `altReqs` (using `getAltCount()` which maps thresholds to the precomputed stats fields).

#### Altitude bucket stats

Computed in `lib/services/home.service.ts` from the already-fetched `myAscents` array — **no extra DB queries**:
```typescript
peaks1000plus = myAscents.filter(a => a.peak.altitudeM > 1000).length
peaks2000plus = ...  // same pattern up to peaks5000plus
maxAltitude   = Math.max(...myAscents.map(a => a.peak.altitudeM))
```
These 6 fields plus `maxAltitude` are part of `HomeData["stats"]`.

The altitude distribution in the hero card shows 6 named zones (🌿 Baja montaña, ⛰️ Media montaña, 🏔️ Alta montaña, ❄️ Alta montaña técnica, 🔥 Expedición, 🌌 Expedición extrema), each derived as the difference between adjacent bracket counts. Only non-zero buckets are shown.

### Mapa
Interactive map (maplibre-gl + Carto tiles + hillshade terrain) showing all peaks. Users can:
- Browse the full peak catalog
- See climbed peaks as circular photo markers (green ring) vs unclimbed as blue clustered dots
- Filter: All / Climbed / Not yet
- Tap a peak to open a detail panel (hero photo, altitude, date, route, CTA)
- Discover unclimbed peaks

### Ascensiones
The user's personal climb log. Image-first list of their own ascents. Each card shows the hero photo, peak name, altitude, and date. Tapping opens the full ascent detail with photos, route, Wikiloc embed, and tagged persons.

### Social
An activity feed showing **friends' recent ascents only**. No algorithmic content, no strangers. Pure friends-only feed designed to spark motivation through seeing what your circle has been doing.

---

## UX Principles

1. **Image-first**: Photos lead every card, every screen. Data supports the image, not the other way around.
2. **Emotion over data**: The app should make users feel something — pride, inspiration, competitiveness. Metrics serve emotion, not the reverse.
3. **Avoid empty states**: Always show something meaningful. Use placeholder visuals, onboarding nudges, or seed content before the user has their own data.
4. **Mobile-first**: All layouts, interactions, and visual hierarchy are designed for phone screens first.
5. **Clear hierarchy**: One primary action per screen. Navigation is simple and consistent.
6. **Ascent card anatomy**: Hero image fills the card. Peak name and altitude overlay the image (bottom or top gradient). Route and date are secondary. Map thumbnail (if any) is tertiary.

---

## Data Model (High-Level)

```
User
  ├── id
  ├── name
  ├── email
  ├── username?
  ├── passwordHash
  ├── avatarUrl?     (Cloudflare R2 public URL, key: avatars/{userId}.jpg)
  └── memberships: Membership[]

Tenant
  ├── id
  ├── slug
  ├── dbUrl?         (null = shared DB)
  └── members: Membership[]

Peak                 (global catalog, shared across all tenants)
  ├── id
  ├── name
  ├── latitude
  ├── longitude
  ├── altitudeM
  ├── mountainRange?
  └── country

Ascent              (tenant-scoped)
  ├── id
  ├── tenantId
  ├── peakId         (FK → Peak)
  ├── createdBy      (FK → User)
  ├── date
  ├── route?
  ├── description?
  ├── wikiloc?       (embed src URL)
  └── photos: Photo[]

Photo               (tenant-scoped)
  ├── id
  ├── tenantId
  ├── ascentId       (FK → Ascent)
  ├── storageKey     (R2 object key)
  ├── url            (public CDN URL)
  └── faceDetections: FaceDetection[]

Person              (tenant-scoped, for face tagging)
  ├── id
  ├── tenantId
  ├── name
  └── email?

FaceDetection / FaceTag
  └── links Photo → Person via bounding box + descriptor
```

---

## Key Rules

### Social & Privacy
- The **Social feed shows only accepted friends' activity** — never strangers, never everyone.
- Sending/accepting friend requests is the only way to create a friendship. No auto-follow.
- **Tagging a user in a photo does NOT make them a friend.** These are independent concepts.
- A user can be tagged in an ascent photo without any friendship relationship with the author.

### Friendships
- A friendship has two states: `PENDING` (request sent) and `ACCEPTED`.
- Only `ACCEPTED` friendships appear in ranking comparisons and the Social feed.
- Friendship is bidirectional — both users see each other's ascents once accepted.

### Gamification
- Rankings are always **relative to the user's friend circle**, not global leaderboards.
- The primary metric is **total ascent count** (all ascents, including repeat climbs of the same peak).
- Secondary metrics (total altitude, mountain ranges completed, etc.) may be added later — do not over-engineer upfront.
- Gamification should feel personal and motivating, not punishing.

### Content Model
- One ascent = one peak + one date. A user can have multiple ascents of the same peak.
- Photos belong to ascents, not to peaks directly.
- The "canonical" photo for a peak on the map is derived from the user's **most recent ascent** of that peak (first photo by `createdAt asc`), not a global peak photo.
- Peak coordinates are stored as `latitude` / `longitude` floats (WGS84). Map positioning always uses `[longitude, latitude]` order (GeoJSON / maplibre-gl convention).

### Map
- The map shows the global peak catalog.
- Climbed peaks: circular 42px photo markers with green ring, rendered as HTML markers via maplibre-gl.
- Unclimbed peaks: blue clustered dots via GeoJSON source with `cluster: true`.
- Both types use `[peak.longitude, peak.latitude]` for positioning — never swap the order.

### Architecture
- Tenant-scoped DB queries should go through `getTenantConnection(tenantId)`. However, some services (e.g. `home.service.ts`) import `prisma` directly for cross-tenant or user-level queries — this is acceptable for user/friendship/leaderboard data.
- The `Peak` table is global (no `tenantId`). Everything else is tenant-scoped.
- Services live in `lib/services/`. Never put business logic in API route handlers.

### Navigation
- Mobile bottom tab bar: **Mi Progreso · Mapa · + (log ascent, center CTA) · Ascensiones · Social** (5 zones, profile accessible from Mi Progreso header).
- Desktop top nav: Mi Progreso · Mapa · Ascensiones · Social + avatar button.
- Home tab = Mi Progreso (gamification dashboard). Root `/` redirects to `/home` when authenticated.
- **Mobile header** (`components/nav/NavBar.tsx`): sticky 52px bar shown only on mobile (`<640px`). Contains the AziTracks logo **absolutely centered** (`position: absolute; left: 50%; transform: translateX(-50%)`) so it stays visually centered regardless of avatar width. The avatar div uses `justify-content: flex-end` on the header.
- **`--top-nav-h` CSS variable**: set to `52px` on mobile (in `app/(app)/layout.tsx`) to match the mobile header height. Map and other full-height containers use `calc(100svh - var(--top-nav-h) - var(--bottom-nav-h))` — this variable must stay in sync with the actual `.mobile-header` height (currently `52px`).
- **Login redirects to `/home`**: after successful login, `app/(auth)/login/page.tsx` pushes to `/home` (Mi Progreso), not `/map`.
- **Bottom tab bar instant feedback**: `NavBar.tsx` uses a `pendingPath` state to highlight the tapped tab immediately, before Next.js completes navigation. `handleTabClick(href)` sets `pendingPath`; a `useEffect` on `pathname` resets it once navigation completes. `tabActive(href)` checks `pendingPath` first, then falls back to `isActive`. **Do not call `router.push` inside `handleTabClick`** — the `Link` component handles navigation; calling push too causes double navigation and blanks the tab bar.

---

## Deployment

- **Production URL**: [www.azitracks.com](https://www.azitracks.com) (custom domain via GoDaddy CNAME → Railway)
- **Platform**: Railway (auto-deploys on push to `main`)
- **Databases**: Two Railway PostgreSQL instances — sandbox (port 40040) and production (port 10046 / internal `postgres-52e3.railway.internal:5432`)
- **File storage**: Cloudflare R2, public base URL `https://pub-e648f9ddf0d74df1b67853b9453fbca5.r2.dev`
  - Avatar key pattern: `avatars/{userId}.jpg`
- **Email**: Resend (`resend` npm package), domain `mail.azitracks.com` (subdomain configured in GoDaddy via Resend auto-setup), region `eu-west-1`. From address: `AziTracks <noreply@mail.azitracks.com>`. API key in env var `RESEND_API_KEY`, from address in `RESEND_FROM`. Email logic in `lib/email.ts`.

---

## Avatar Upload Flow

1. User selects image in Edit Profile modal → `AvatarCropModal` opens
2. Crop/zoom/center UI (circular clip, drag + pinch + scroll wheel, 400×400px output)
3. On confirm: `canvas.toBlob` → POST to `/api/settings/avatar` as `multipart/form-data`
4. API route: validates file (JPEG/PNG/WebP, max 5MB) → deletes old R2 object → uploads new → updates `user.avatarUrl` in DB
5. Client: appends `?v=${Date.now()}` to bust browser cache, calls `router.refresh()` via `useTransition`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth v5 |
| Storage | Cloudflare R2 (S3-compatible) |
| Map | maplibre-gl v4 + Carto tiles + Terrarium hillshade |
| Styling | Inline styles + Tailwind CSS |
| Language | TypeScript |

---

## Ascent Detail Page (`/ascents/[id]`)

The detail page is a fully inline-editable view — there is **no separate edit page**. The deprecated `app/(app)/ascents/[id]/edit/page.tsx` and `components/ascents/AscentEditForm.tsx` have been deleted.

### Component: `AscentDetailClient.tsx`

**Inline editing patterns:**
- **Route / Description**: tapping opens a textarea/input. On `onBlur` → autosave via PATCH. On `Escape` keydown: `cancelRef.current = true` → blur fires → ref is checked and save is skipped → ref reset. Uses `useRef<boolean>` (not state) for the cancel flag so it's synchronous.
- **Date**: tapping the date text (dotted underline) opens `DatePickerSheet`. Selecting a date autosaves via PATCH and closes the sheet.
- **Photos**: tapping a photo opens `ImageCropModal` → on crop done → sets `tagBlob` state → `PhotoTagStep` renders full-screen → on done/skip → `uploadPhotoWithFaces()` (uploads, saves face tags, deletes old photo). This matches the exact same flow as new ascent creation.

**Toast system:**
```typescript
const [toast, setToast] = useState<string | null>(null);
const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
function showToast(msg: string) {
  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  setToast(msg);
  toastTimerRef.current = setTimeout(() => setToast(null), 2500);
}
```
`ToastNotification` renders as a fixed pill at bottom-center with `pointerEvents: "none"`.

**Delete flow:**
- Red button at the very bottom of the page, separated by a top border (`borderTop: "1px solid #f3f4f6"`).
- Tapping opens a confirmation bottom sheet (`showDeleteConfirm` state).
- Sheet has Cancel + red Delete button. On confirm → DELETE `/api/ascents/[id]` → `router.push("/ascents")`.

**`DatePickerSheet` component (inline at bottom of `AscentDetailClient.tsx`):**
- Full-screen bottom sheet with backdrop, drag-to-close (downward swipe > 60px), tap outside to close.
- Always renders exactly **42 cells (6×7 grid)** with trailing empty divs — height never changes between months.
- Day buttons: `height: 36px` fixed (NOT `aspectRatio: "1"`).
- Future dates are disabled (today is the max selectable date).
- Year picker: a scrollable grid view (toggled from the month/year header). Auto-scrolls to selected year via `data-year` attribute on `useEffect`.
- Swipe-to-close: `dragY` state + `touchStartY` ref + `isDragging` ref. Positive delta only (downward). On release: if `dragY > 60` → close, else snap back via `transition: "transform 0.2s ease"`.

---

## PATCH API — Field Isolation Pattern

**Critical:** `app/api/ascents/[id]/route.ts` uses an explicit field-in-body guard. Without this, `undefined ?? null` wipes fields that weren't intended to be updated.

```typescript
const data: Record<string, unknown> = {};
if ("route"       in body) data.route       = body.route ?? null;
if ("description" in body) data.description = body.description ?? null;
if ("wikiloc"     in body) data.wikiloc     = body.wikiloc ?? null;
if ("date"        in body) data.date        = body.date ? new Date(body.date) : null;
const updated = await db.ascent.update({ where: { id }, data });
```

Always use this pattern for any PATCH endpoint that updates a subset of fields.

---

## Photo Flow

### New ascent & editing an existing ascent photo — same flow

Both flows share the same component pipeline:

1. **`ImageCropModal`**: crop to 1:1 or 4:5 (16:9 has been removed). Outputs a `Blob`.
2. **`PhotoTagStep`** (from `components/photos/PhotoTagStep.tsx`): renders full-screen at `zIndex: 1100`, handles face detection, tagging, skip. Calls `onDone(blob, faces)`.
3. **`uploadPhotoWithFaces(blob, faces)`**: uploads photo → if faces → save face tags → (if editing) delete old photo.

Do NOT use `PhotoFaceTagger` for this flow — it's a lower-level component used only for standalone face management on existing photos (the "tag people" UI on the detail page photo grid).

### `ImageCropModal` ratios
Only two ratios are offered: **1:1** and **4:5**. The 16:9 ratio was removed. Both work correctly with the 4:5 feed cards and the detail page hero.

### `ImageCropModal` rotation (implemented 2026-04-20)
A "↻ Girar 90°" button below the zoom slider allows rotating the photo in 90° CW increments before cropping.

**Key implementation details:**
- `rotation: 0 | 90 | 180 | 270` state, initialized from `initialRotation` prop (used for re-crop to restore previous rotation).
- `effectiveDims(rot)` — swaps `naturalWidth`/`naturalHeight` for 90°/270° so `minS` and `clamp()` work correctly on rotated images.
- `applyCrop()` uses `ctx.translate → ctx.rotate → ctx.translate(offset) → ctx.drawImage` to produce the rotated display JPEG, mirroring the CSS `translate + rotate` transform on the `<img>`.
- `CropMeta` now includes `rotation: 0|90|180|270`. Persisted as `cropRotation Int?` on `Photo` model in Prisma.
- `touchmove` is registered as a **native non-passive listener** (`{ passive: false }`) via `useEffect` on `containerRef` so `e.preventDefault()` works. React's `onTouchMove` prop is passive by default and would throw a warning. The handler is kept in a `touchMoveRef` that updates every render so it always sees fresh state.
- `onTouchStart` / `onTouchEnd` remain as React event handlers (they don't call `preventDefault`).

---

## Feed Card Caption Format

`AscentCard` (both `social` and `profile` variants) shows below the image:

```tsx
<p style={{ fontSize: 14, color: "#111827", lineHeight: 1.5, margin: 0 }}>
  <span style={{ fontWeight: 700 }}>{ascent.user.name}</span>
  {ascent.persons.length > 0 && (
    <span style={{ fontWeight: 400 }}>
      {" "}{t.detail_with.toLowerCase()}{" "}
      {ascent.persons.map((p, i) => (
        <span key={p.id}>
          {i > 0 && (i === ascent.persons.length - 1 ? ` ${t.detail_and} ` : ", ")}
          <span style={{ fontWeight: 600 }}>{p.name}</span>
        </span>
      ))}
    </span>
  )}
</p>
{ascent.description && (
  <p style={{ fontSize: 13, color: "#374151", margin: "4px 0 0", lineHeight: 1.5,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
    {ascent.description}
  </p>
)}
```

This matches the exact format used on the detail page. The ⋮ menu on profile cards navigates to `/ascents/[id]` (edit mode). Delete was moved off the card and onto the detail page itself.

---

## i18n Keys

All 5 locales (`ca`, `en`, `es`, `fr`, `de`) must have these keys in `lib/i18n/`:

| Key | ca | en | es | fr | de |
|---|---|---|---|---|---|
| `detail_and` | i | and | y | et | und |
| `date_today` | Avui | Today | Hoy | Aujourd'hui | Heute |
| `date_selectYear` | Selecciona l'any | Select year | Selecciona el año | Choisir l'année | Jahr wählen |
| `home_progression` | Progressió | Progression | Progresión | Progression | Aufstieg |
| `home_altReq` | Superar els {m}m | Reach {m}m | Superar los {m}m | Dépasser {m}m | Über {m}m |
| `home_altReqMulti` | {n} cimes sobre {m}m | {n} peaks over {m}m | {n} cimas sobre {m}m | {n} sommets sur {m}m | {n} Gipfel über {m}m |
| `home_levelProgress` | {current} / {total} cimes | {current} / {total} summits | {current} / {total} cimas | {current} / {total} sommets | {current} / {total} Gipfel |
| `home_levelNeedSummits` | {n} cima{n,plural,=1{}other{s}} més | {n} more summit{n,plural,=1{}other{s}} | {n} cima{n,plural,=1{}other{s}} más | encore {n} sommet{n,plural,=1{}other{s}} | noch {n} Gipfel |
| `home_seeAllLevels` | Veure tots els nivells → | See all levels → | Ver todos los niveles → | Voir tous les niveaux → | Alle Level → |
| `home_hideLevels` | Veure menys | See less | Ver menos | Voir moins | Weniger |
| `home_altZone1`–`home_altZone6` | — | low/mid/high/tech/expedition/extreme | Baja/Media/Alta montaña/Alta técnica/Expedición/Expedición extrema | — | — |

The `detail_with` key (also in all locales) is used in the caption as `t.detail_with.toLowerCase()` — so it can be "Amb" / "With" / "Con" / "Avec" / "Mit" stored in any case.

---

## Photo Storage Architecture

### Display crop + resized original (implemented 2026-04-16)

Every new photo upload stores **two files in R2**:

| File | Key pattern | Format | Max size | Purpose |
|------|-------------|--------|----------|---------|
| Display crop | `tenant/{tenantId}/photos/{photoId}.jpg` | JPEG 0.85 | 1080×1350 | Shown everywhere in the app |
| Resized original | `tenant/{tenantId}/photos/{photoId}_original.jpg` | JPEG 0.85 | max 3000px long side | Re-crop, future reprints |

**`Photo` model new fields** (all nullable — legacy photos have them null):
```prisma
originalStorageKey String?   // null = legacy photo, no re-crop available
cropX      Float?            // normalized [0-1] fraction of original width
cropY      Float?
cropW      Float?
cropH      Float?
cropAspect String?           // "4:5" | "1:1"
```

**Key files:**
- `lib/storage/r2.ts` — `photoStorageKey()` (display) + `photoOriginalStorageKey()` (original)
- `lib/services/photo.service.ts` — `uploadPhoto()` accepts `originalBuffer?` + `cropMeta?` + `reuseOriginalStorageKey?`
- `components/photos/ImageCropModal.tsx` — `resizeForStorage(file)` exported util (max 3000px, JPEG 0.85); `onCrop(blob, cropMeta)` signature
- `app/api/photos/upload/route.ts` — accepts `originalFile`, `cropMeta`, `reuseOriginalPhotoId` in FormData
- `app/api/photos/[id]/original/route.ts` — serves the original via proxy (private, 1h cache)
- `app/api/photos/[id]/route.ts` — DELETE accepts `?keepOriginal=1` to preserve original during re-crop

**Re-crop flow** (`AscentDetailClient`):
- "Editar foto" button: if `photo.originalStorageKey` exists → fetches original + existing face tags → opens `ImageCropModal` → re-crop → new display JPEG uploaded, original reused via `reuseOriginalPhotoId`, old photo deleted with `?keepOriginal=1`
- If no `originalStorageKey` (legacy photo) → opens file picker for full replacement
- Re-crop uses fresh face detection (no initialFaces merge) — crop coordinates changed

**face-api / TF.js backend:**
- `faceApiSingleton.ts` forces `tf.setBackend("cpu")` before loading models
- **Why:** maplibre-gl exhausts Chrome's WebGL context limit (~16 contexts). TF.js defaults to WebGL and fails silently. CPU backend is ~1-2s slower but reliable.

**`NewAscentForm` flow:**
- Always starts at `"pick"` step (photo-first) regardless of `defaultPeakId`
- If `defaultPeakId` present (e.g. from map), GPS peak suggestion from EXIF is skipped — pre-selected peak is preserved
- `cropMeta` and `originalFile` flow through crop→tag→submit pipeline same as `PhotoUploader`

---

## Navigation Labels

| Tab | es | ca | en | fr | de |
|-----|----|----|----|----|-----|
| Home | Mi Progreso | Mi Progrés | My Progress | Ma Progression | Mein Fortschritt |
| Map | **Atlas** | **Atlas** | **Atlas** | **Atlas** | **Atlas** |
| Ascents | **Bitácora** | **Bitàcola** | **Logbook** | **Carnet** | **Logbuch** |
| Social | Social | Social | Social | Social | Social |

Note: "Atlas" is intentionally not translated — it's a brand name aligned with the potential app rename to AziAtlas.

---

## Map Panel — Unclimbed Peaks

When tapping an unclimbed peak in the map, the panel shows:
- **No illustration placeholder** — clean white panel only
- Peak name + altitude in the title (`Penyes Altes · 2276 m`)
- Mountain range subtitle
- "Aún sin subir" status
- "+ Registrar ascensión" CTA → navigates to `/ascents/new?peakId=xxx`

When tapping a climbed peak, the panel shows the hero photo (if any) with altitude badge overlaid.

---

## Known Gotchas

- **`toLocaleString()` without locale**: causes hydration mismatch between Node.js server and browser. Always pass an explicit locale string, or skip formatting entirely for short numbers (e.g. `{altitudeM} m` not `{altitudeM.toLocaleString()} m`).
- **Array guard on face detections**: API endpoints that return face detections can return non-arrays on edge cases. Always guard with `Array.isArray(data) ? data : []` before calling `.some()`, `.map()`, etc.
- **Peak coordinates order**: maplibre-gl uses `[longitude, latitude]`. The DB stores `latitude` and `longitude` as separate fields. Always write `[peak.longitude, peak.latitude]` — never swap.
- **i18n plural regex — use `[^{}]`, not `[^}]`**: The `i()` function in `lib/i18n/index.ts` handles plural blocks like `{n,plural,=1{}other{s}}`. The inner content of `=1{}` is empty, which breaks patterns that use `[^}]` (because `{` is then a valid non-`}` char, making brace nesting ambiguous). The correct pattern is `((?:[^{}]|\{[^{}]*\})*)` — `[^{}]` excludes both brace types, alternated with `\{[^{}]*\}` for explicit pairs. **Never change this regex without verifying empty inner blocks still work.**
- **`--top-nav-h` must match mobile header height**: The CSS variable `--top-nav-h` in `app/(app)/layout.tsx` is set to `52px` on mobile to match the `.mobile-header` height in `NavBar.tsx`. If the header height changes, update both in sync — otherwise the map overflows and the sticky header covers the filter panel.
- **Middleware (`proxy.ts`) — public auth routes**: Any new unauthenticated page (e.g. `/forgot-password`, `/reset-password`) must be added to the `isAuthPage` check in `proxy.ts`, otherwise the middleware redirects unauthenticated users to `/login` before they can reach it.
- **`npm install` must save to `package.json`**: Always use `npm install <pkg> --save`. Running `npm install` without `--save` in a local dev session installs the package locally but doesn't add it to `package.json` — the Railway build will then fail with "Module not found".
- **Prisma schema changes require two steps**: This project uses `prisma db push` (no migrations). After adding a model to `schema.prisma`, run `npx prisma db push` (to create the table) **and** `npx prisma generate` (to regenerate the client). Then restart the dev server — otherwise the new model will be `undefined` at runtime even though the table exists.
- **Resend returns errors silently**: `resend.emails.send()` does not throw on API errors — it returns `{ data, error }`. Always destructure and check: `const { data, error } = await resend.emails.send(...); if (error) throw new Error(...)`. Otherwise failed sends appear as successes with no logs.
- **iOS Safari — viewport meta tag required**: Without `<meta name="viewport" content="width=device-width, initial-scale=1">` (exported as `viewport` in `app/layout.tsx`), iOS Safari renders at 980px and scales down — CSS media queries never fire, so `--top-nav-h`/`--bottom-nav-h` stay at desktop values and the bottom tab bar never appears. This is already set in `app/layout.tsx` via `export const viewport: Viewport`.
- **iOS Safari — maplibre HTML markers need `position:absolute` inline**: `maplibre-gl.css` sets `position: absolute` on `.maplibregl-marker` via a CSS class, but iOS Safari does not reliably apply this rule to dynamically created elements. `getComputedStyle().position` returns `'auto'`, causing markers to flow as static elements below the canvas instead of overlaying it. **Always set `position: absolute` directly in `el.style.cssText`** when creating custom marker elements — never rely on the CSS class alone.
- **iOS Safari — map marker positions wrong on first load**: Even with `position:absolute`, maplibre calculates marker transforms using the canvas size at the moment markers are added. If `map.resize()` fires before iOS has finished laying out the canvas (which happens inside `map.once('load')`), the internal map height is 0 or incorrect — markers end up offset downward by exactly the canvas height. Fix: call `map.once('idle', () => map.resize())` after adding all markers so the resize happens after the first complete render. The `ResizeObserver` on the container handles subsequent resizes.
- **iOS Safari — pinch-zoom displaces HTML markers via ResizeObserver**: The `ResizeObserver` on the map container calls `map.resize()` whenever the container changes size. On iOS Safari, pinch-zooming causes the browser chrome (address bar) to show/hide, which changes the viewport height mid-gesture. This triggers `map.resize()` with transient/incorrect canvas dimensions, repositioning all HTML markers in the wrong place. Fix: suppress `map.resize()` while a touch gesture is active, and do a final resize on `touchend`. Use a `touchActive` boolean flag: set it in `touchstart`, clear it in `touchend`/`touchcancel` (with a 50ms `setTimeout` before calling `resize()`). The `ResizeObserver` checks `!touchActive` before resizing. See `MapView.tsx`.
- **iOS Safari — `isMobile` and map state must initialize from `window` directly**: `useState(false)` for `isMobile` or `terrain3d` causes a desktop→mobile flash and incorrect initial map pitch. Use lazy initializers: `useState(() => window.innerWidth < 640)`. This is safe in `MapView.tsx` because the component is loaded with `dynamic(..., { ssr: false })`.
- **Login redirect must be a full page load**: After `signIn()`, use `window.location.href = '/home'` instead of `router.push('/home') + router.refresh()`. Client-side navigation after auth can cause CSS styles injected by server components (like the NavBar `<style>` block) to not apply correctly on first render in iOS Safari.
- **iOS Safari — keyboard hides input in PhotoTagStep bottom sheet**: The tag search bottom sheet (`position: fixed; bottom: 0`) does not reposition when the soft keyboard opens — iOS Safari doesn't adjust `fixed` elements for the virtual keyboard. The search `<input>` ends up hidden behind the keyboard. Fix: use the `visualViewport` API to detect keyboard height and shift the sheet's `bottom` offset dynamically. Component: `components/photos/PhotoTagStep.tsx`, bottom sheet at zIndex 1200. **Pending fix.**
- **face-api + maplibre WebGL context exhaustion**: maplibre-gl creates a WebGL context per map mount. After navigating to/from the map several times, Chrome hits the ~16 context limit. TF.js (used by face-api) defaults to WebGL backend and fails silently — 0 faces detected, no error logged. Fix: force CPU backend in `faceApiSingleton.ts` via `tf.setBackend("cpu")` before loading models. `tf` is typed as a namespace without `setBackend` in face-api types — cast with `api.tf as unknown as { setBackend, ready }`.
- **PhotoTagStep body scroll lock — iOS position:fixed pattern required**: `PhotoTagStep` locks body scroll on mount. `overflow: hidden` alone is NOT enough on iOS Safari — the page can still jump scroll position when applied, which repositions `position: fixed` elements and makes the overlay appear at the wrong size/place. The correct pattern: save `scrollY`, then set `overflow: hidden` + `position: fixed` + `top: -${scrollY}px` + `width: 100%` on the body; on unmount, clear all and call `window.scrollTo(0, scrollY)`. If you add another fullscreen modal, use this same pattern — not just `overflow: hidden`.
- **iOS Safari — search inputs must have font-size ≥ 16px**: Any `<input>` with `fontSize < 16px` triggers iOS Safari auto-zoom on focus, making the viewport appear to jump/resize. Always use `fontSize: 16` (or higher) for search/text inputs in modals. The PhotoTagStep search input was fixed from 14 → 16px.
- **iOS Safari — `input[type="date"]` overflows its container without `-webkit-appearance: none`**: iOS Safari renders date inputs as a native button that ignores the element's `width` style, causing it to expand beyond its container. Always add `WebkitAppearance: "none", appearance: "none"` to date inputs. The native date picker wheel still opens correctly — only the visual rendering changes. Fixed in `NewAscentForm.tsx`.
- **`ImageCropModal.onCrop` signature**: `onCrop(blob: Blob, cropMeta: CropMeta)` — second parameter added. TypeScript allows consumers with `(blob: Blob) => void` (extra params ignored), but `NewAscentForm`, `PhotoUploader`, and `AscentDetailClient` all use `cropMeta` — never remove it.
- **Display crop aspect ratio is always 4:5**: `ImageCropModal` only offers 4:5. Landscape photos (4:3, 16:9) get cropped heavily. This is a known limitation — adding a 4:3 ratio option is deferred. Users can manually zoom out and center to minimize crop loss.
- **Prisma client cache after `db push`**: After running `prisma db push`, the dev server must be restarted. If you only run `prisma generate` without restarting, the running server still uses the old client from memory — new fields will appear as `Unknown argument` errors at runtime even though the DB is correct.
- **`Person.userId` is NOT globally unique**: Changed from `@unique` to `@@unique([tenantId, userId])`. One User can have one linked Person per tenant. This is intentional — the same user can appear as a tag in multiple tenants. Never revert to global `@unique`.
- **Self-tagging always ACCEPTED**: `setFaceTag()` in `face-detection.service.ts` accepts a `taggerUserId` param. If `taggerUserId === person.userId`, the tag is created as ACCEPTED regardless of `reviewTagsBeforePost`. Always pass `session.user.id` when calling `setFaceTag` from API routes.
- **Invitations use Vouchers, not a separate model**: Friend invitations create a standard `Voucher` record with `maxUses: 1`, `inviterId`, and `inviteeEmail` set. Admin-created vouchers have these fields null. The invitation flow does NOT create any new token model — it reuses the existing voucher system.
- **Email before voucher creation**: In `POST /api/invitations`, the email is sent BEFORE creating the Voucher in the DB. This ensures no orphaned vouchers if the email fails. If you reorder this, a failed email will leave an active voucher that blocks re-invitation.
- **PhotoTagStep header must be outside the zIndex 1100 stacking context**: The face-selection bottom sheet backdrop renders as `position:fixed; inset:0; zIndex:1200`. If the header (skip/done buttons) is inside the `zIndex:1100` container, the backdrop covers it and touches on the buttons are intercepted by the backdrop — the button feels unresponsive. Fix: render the header as a separate `position:fixed; zIndex:1300` div at the top of the JSX, outside the main container. Use a `headerRef` + `useEffect` to measure its height and apply it as `paddingTop` on the main container so the photo area starts below the header.
- **`ImageCropModal` touchmove must be non-passive**: React registers `onTouchMove` as a passive event listener, so calling `e.preventDefault()` inside it has no effect and logs a warning. Register the touchmove handler as a native listener with `{ passive: false }` via `useEffect` on the container ref. Keep the handler logic in a `useRef` that is reassigned every render (not a dependency of the effect) so the native listener always reads fresh React state without needing to be re-registered.

---

## Auth & Email Flows

### Forgot Password / Reset Password

- **`PasswordResetToken` model**: `token` (32-byte hex, unique), `email`, `expiresAt` (1h), `usedAt` (set on use). Table: `password_reset_tokens`.
- **`POST /api/auth/forgot-password`**: looks up user by email, always returns 200 (never reveals if email exists), deletes previous tokens for that email, creates new token, calls `sendPasswordResetEmail()`.
- **`POST /api/auth/reset-password`**: validates token exists + not used + not expired, updates `user.passwordHash`, marks token `usedAt`.
- **`lib/email.ts`**: Resend client wrapper. `sendPasswordResetEmail(to, token)` sends branded HTML email with reset link `{APP_URL}/reset-password?token={token}`.
- **Pages**: `/forgot-password` (email form), `/reset-password` (new password + confirm form, reads `?token=` from query). Both are in `app/(auth)/` group and listed as public in `proxy.ts`.
- **Login page**: "¿Olvidaste tu contraseña?" link (`auth_forgotPassword` i18n key) appears inline next to the password label, links to `/forgot-password`.

### Friend Invitations

- **`POST /api/invitations`**: Creates a single-use `Voucher` (7-day expiry) and sends `sendFriendInvitationEmail()`. Checks:
  - Email already registered → `{ status: "already_registered" }` (no voucher created)
  - Active invitation exists for same `{inviterId, email}` → `{ status: "already_invited" }` (reuses existing)
  - Otherwise → creates voucher + sends email → `{ status: "invited" }`
- **`GET /api/invitations`**: Returns all vouchers where `inviterId = currentUser.id` with status (pending/used/expired).
- **`lib/email.ts`**: `sendFriendInvitationEmail(to, inviterName, voucherCode)` — branded HTML with voucher code in a highlighted box. Text instructs the invitee to search for the inviter in Amigos after registering.
- **Voucher model extended**: `inviterId String?` (FK → User), `inviteeEmail String?`. Admin-created vouchers have both null. `@@index([inviterId])` added.
- **UI in `/friends`**: "Invitar a un amigo" section at the bottom — email input + send button + list of sent invitations with status badges (Pendiente / Registrado / Expirada).

### Tag Reconciliation (Person → registered User)

- **`POST /api/persons/[id]/reconcile`** with `{ userId }`:
  - Validates `userId` is an accepted friend of the current user
  - **Case A** (no canonical Person for that userId in tenant): sets `person.userId = userId`, `person.name = friend.username ?? friend.name`
  - **Case B** (canonical Person already exists): reassigns all FaceTags to canonical (skipping conflicts on `@@unique([faceDetectionId, personId])`), deletes the old Person
  - Returns the canonical Person
- **Logic in `reconcilePersonToUser()`** in `lib/services/person.service.ts`
- **UI in `/friends`**: "Personas etiquetadas" section shows only unlinked Persons (no `userId`). Reconcile button opens a modal with friend selector + search input. On success the Person disappears from the list.
- **`/persons` page**: Still exists as a full catalog (linked + unlinked). The `/friends` section only shows actionable (unlinked) persons.
- **Linked Persons**: Show a "✓ Vinculado" badge in PersonsClient. No reconcile button shown.

### What's still missing (not yet implemented)
- Email verification on register
- Rate limiting on login
- OAuth (Google / Apple)
- Registering with an invitation voucher doesn't auto-create the friendship or link the Person — the invitee must find the inviter manually in Amigos and send a friend request

---

## Future Direction

Keep these in mind but do not over-engineer for them in the MVP:

- **Email verification**: send verification link on register, block or warn until verified
- **Friend system**: User search, friend requests, accepted friends feed — core friendship flow is complete. Pending: auto-link Person when invitee registers with invitation voucher
- **Challenges**: Time-limited goals (e.g., "Climb 3 peaks this month") to drive retention
- **Collections / Lists**: Curated peak lists (e.g., "100 Pyrenean 3000ers") a user can work through
- **Notifications**: Friend activity alerts, milestone celebrations
- **Explore evolution**: Filter peaks by range, altitude, country; suggested peaks based on history
- **Profile page**: Public-facing summary of a user's ascents and stats
- **Per-tenant DBs**: `Tenant.dbUrl` is already wired; migration path exists when needed
