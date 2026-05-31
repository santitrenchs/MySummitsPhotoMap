# Peakadex — CLAUDE.md

## Project Overview

Peakadex is a mobile-first social app for mountain climbers and hikers to log their summit ascents, explore peaks on a map, track personal progress, and compete with friends. It sits at the intersection of outdoor activity tracking (like Strava) and summit-bagging culture, with a strong emphasis on visual storytelling and community motivation.

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
The gamification dashboard. Entry point of the app (root `/` redirects here when authenticated). Web and Android share the same section order and data model; iOS follows the same spec.

**Section order (web + Android, top → bottom):**
1. **HeroHeader** — always shown
2. **OnboardingBanner** — only when `totalAscents == 0`
3. **ProgressionSection** — level cards (Android/iOS only; removed from web as of 2026-05-30)
4. **MonthlyChartSection** — "Últimos 6 meses", shown when `totalAscents >= 1` and data non-empty
5. **RarityChartSection** — "Cimas por rareza", shown when `totalAscents >= 1`
6. **LeaderboardCard** — "Tu cordada", shown when `leaderboard.size > 1`
7. **NoFriendsCta** — shown when `totalFriends == 0`
8. **RecentAscentsRow** — "Tus últimas cimas", shown when `recentAscents` non-empty

**Web hero layout** (`components/home/HomeClient.tsx`): horizontal row — avatar (56px circle) + name in bold white + `· AchievedLevelName` at 55% opacity (right of name) + CS pill + EP pill. Below: horizontal divider. Below: 3-metric row (ascensiones / cimas / alt. máx). Below: solid-black progress strip with green gradient bar and label `"{uniquePeaks} / {total} cimas · para {NextLevelName}"` (or alt-req variant). The **Progression section** (level cards) and the **motivation banner** have been removed from web — they remain on Android/iOS only.

**Level logic in web hero:**
- `achievedLevel` = `LEVEL_DEFS[levelState.currentIdx - 1]` — the LAST met level, shown in the name row
- `heroInProgress` = `levelState.current` — the NEXT unmet level, shown in the progress strip
- Progress fraction uses `uniquePeaks` vs `heroInProgress.targetAscents`
- Level names in the **leaderboard**: `entry.levelIdx >= 1 ? LEVEL_DEFS[entry.levelIdx - 1].name : "—"` — never use modulo wrap (it maps `levelIdx=0` → Zenith incorrectly)

**Dynamic motivation banner**: removed from web (2026-05-30). Was gold 🏆 / orange ⚠️ / green 🎯. Never render on Android or iOS.

- **Level system**: 6 gamified levels (Scout → Zenith). **Single source of truth**: `lib/level-utils.ts` → `LEVEL_DEFS`. `stats.service.ts` → `recomputeUserStats()` uses `LEVEL_DEFS` to compute `levelIdx` and store it in `user_stats`. Both web and Android read `levelIdx` from the API — **no platform computes the level locally**. Android's local `LEVEL_DEFS` in `HomeScreen.kt` is only used for UI display (level names, progression section); the actual computed level always comes from `stats.levelIdx` in the API response.
- **Monthly chart** ("Últimos 6 meses"): stacked bar chart, one column per month. Each individual color segment is clickable → navigates to Ascensiones/Cards filtered by that rarity + `view=mine`. The month count label and month label below each bar link to the month filter (`?month=YYYY-MM&view=mine`). Empty months are not clickable.
- **Rarity chart** ("Cimas por rareza"): 9-column bar chart, one per rarity tier. Each **active** bar (count > 0) is clickable → navigates to Ascensiones/Cards filtered by that rarity + `view=mine`. Inactive bars (count = 0) are not clickable.
  - **Web** (`components/home/HomeClient.tsx`): active bars wrapped in `<Link href="/ascents?rarity=<rarityId>&view=mine">`. Monthly segments wrapped in individual `<Link>` within the bar container.
  - **Android** (`HomeScreen.kt`): `Modifier.clickable(indication=null)` on each active `Column` / bar segment. Navigates via `onNavigateToCardsWithRarity(rarityId)` callback → `MainScaffold` sets `pendingRarityId` → `LogbookScreen` applies `clearFilters() + setRarityId() + setViewFilter(Mine)`.
  - **Rarity counts**: the rarity chart shows **unique peaks** per rarity (deduped by `peakId` in `home.service.ts`). The monthly chart shows **all ascents** (no dedup). These intentionally differ — clicking a rarity bar in the chart may show more cards in the filtered view (because the filter shows all ascents of that rarity, including repeats).
- **Recent ascents** ("Tus últimas cimas"): horizontal scroll cards with image overlay

Designed to make the user feel proud of their journey and motivated to keep climbing.

#### Level system (6 levels) — single source of truth

Canonical definition: **`lib/level-utils.ts` → `LEVEL_DEFS`**. Never duplicate thresholds elsewhere.

Levels are **ranges**, not entry gates. Scout is the base level — everyone starts here.

| idx | Emoji | Name | Unique peaks | Alt req |
|-----|-------|------|--------------|---------|
| 1 | 🌱 | Scout | — (base, always met) | — |
| 2 | 🥾 | Guide | ≥ 20 | ≥1 peak > 2000m |
| 3 | 🧭 | Explorer | ≥ 50 | ≥1 peak > 3000m |
| 4 | ⛰️ | Alpinist | ≥ 100 | ≥1 peak > 4000m |
| 5 | 🏔️ | Master | ≥ 150 | ≥1 peak > 5000m |
| 6 | 👑 | Zenith | ≥ 220 | ≥1 peak > 6500m |

`meetsLevel()` in `level-utils.ts` checks both `uniquePeaks >= targetAscents` AND all `altReqs`. Scout has no `targetAscents` so it always returns `true`.

**`computeLevelIdx()` in `stats.service.ts`** uses `LEVEL_DEFS + meetsLevel()` — never hardcode thresholds separately. Returns `1` (Scout) minimum for everyone.

**Leaderboard "Cimas" column** shows `uniquePeaks` (not `totalAscents`). Level pill: `entry.levelIdx >= 1 ? LEVEL_DEFS[entry.levelIdx - 1].name : "—"` — never use `% LEVEL_DEFS.length` (maps `idx=0` → Zenith).

#### `user_stats` — pre-computed stats table

**Schema** (`prisma/schema.prisma` → table `user_stats`):
```prisma
model UserStats {
  userId       String   @id
  totalAscents Int      @default(0)   // all ascents including repeats
  uniquePeaks  Int      @default(0)   // distinct peakIds
  maxAltitudeM Int      @default(0)   // highest peak ever climbed
  totalEp      Int      @default(0)   // sum of rarity.ep across all ascents
  totalCairns  Int      @default(0)   // count of isMythic ascents
  levelIdx     Int      @default(1)   // pre-computed level index (1=Scout base, …, 6=Zenith)
  updatedAt    DateTime @updatedAt
}
```

**Why it exists:** the home endpoint used to fetch ALL ascents for the current user AND all their friends on every page load to compute stats and the leaderboard. With many friends each having hundreds of ascents, this meant thousands of rows per request. `user_stats` stores pre-computed values so the leaderboard becomes a simple `findMany` of N rows (one per person) instead of scanning all their ascents.

**What comes from `user_stats` vs computed live:**

| Field | Source |
|---|---|
| `totalAscents`, `uniquePeaks`, `maxAltitude` | `user_stats` (with fallback to in-memory if row missing) |
| `totalEp`, `totalCairns` (CS), `levelIdx` | `user_stats` (leaderboard reads these directly) |
| `rarityBreakdown`, `monthlyStats`, `totalMetersAscended` | Still computed in-memory from `myAscents` query |
| `totalRegions`, `totalPhotos`, `recentAscents` | Still computed/queried live |

**Invalidation — `lib/services/stats.service.ts` → `recomputeUserStats(userId)`:**

Call this after every ascent CRUD that changes the user's stats. It fetches all ascents for the user (light select: only `peakId`, `peak.altitudeM`, `peak.isMythic`, `peak.rarity.ep`) and upserts the computed values into `user_stats`.

| Operation | When to recompute |
|---|---|
| CREATE ascent | Always |
| UPDATE (PATCH) ascent | Only if `peakId` changed — changing peak changes altitude, rarity, EP |
| DELETE ascent | Always |

**Endpoints where invalidation is wired (both web and v1 mobile):**

| Endpoint | Trigger |
|---|---|
| `POST /api/ascents` | after `createAscent()` |
| `DELETE /api/ascents/[id]` | after `deleteAscent()` |
| `PATCH /api/ascents/[id]` | if `"peakId" in input` |
| `POST /api/v1/ascents` | after `createAscent()` |
| `DELETE /api/v1/ascents/[id]` | after `deleteAscent()` |
| `PATCH /api/v1/ascents/[id]` | if `"peakId" in input` |

**Fallback:** if a user has no `user_stats` row yet (existing users before first CRUD), `home.service.ts` falls back to computing `totalAscents`, `uniquePeaks`, `maxAltitude` from the in-memory `myAscents` array. The leaderboard shows 0s for friends without a row.

**Backfill:** completed (2026-05-30) on both staging and production via `scripts/backfill-user-stats.ts`. All existing users have `user_stats` rows. The fallback path in `home.service.ts` remains for safety.


### Mapa
Interactive map (maplibre-gl + Carto tiles + hillshade terrain) showing all peaks. Users can:
- Browse the full peak catalog
- See climbed peaks as circular photo markers (green ring) vs unclimbed as blue clustered dots
- Filter: All / Climbed / Not yet
- Tap a peak to open a detail panel (hero photo, altitude, date, route, CTA)
- Discover unclimbed peaks

### Ascensiones (web) / Bitácora (mobile)
A combined social + personal climb log. Shows **friends' ascents by default** (same as web's default filter `"friends"`). Own ascents visible via filter. Each card shows the hero photo, peak name, altitude, date, and rarity. Tapping opens the full ascent detail with photos, route, Wikiloc embed, and tagged persons.

**Key behaviour (web + Android + iOS — all identical):**
- Default view = friends only (`isOwn = false`). "Friends" is the baseline, not a dirty filter.
- Sort order = server-side canonical: unseen friends first (by altitude desc), then own + seen friends (by date desc).
- `SortOrder.DateDesc` on the client = preserve API order. Never re-sort client-side for this case.
- mark-as-seen: after load, collect `!isOwn && isUnseen` IDs → wait 3s → `POST /api/v1/feed/seen`. Fire-and-forget.
- `FeedSeen { userId, ascentId }` table is the single source of truth for seen/unseen state across all clients.

**`listAscents(tenantId, userId, friendUserIds)` in `lib/services/ascent.service.ts`:**
- Two parallel queries: own (tenant DB, no feedSeens) + friends (shared prisma, with feedSeens).
- Merges and applies canonical sort server-side.
- `GET /api/v1/ascents` passes accepted friend IDs; `GET /api/ascents` (web) passes `[]`.

**Card actions — own ascents only (`ascent.isOwn`):**
- Share icon + edit icon appear only on the user's own ascents. On web: `variant === "profile"` in `AscentCard`. On Android: `ascent.isOwn`. On iOS (planned): same `isOwn` check.
- **Share flow (all platforms):**
  1. Call share endpoint to set `Ascent.isPublic = true` (fire-and-forget — no UI error if it fails).
  2. Show platform-native share UI with the share URL `https://www.peakadex.com/ascent/{ascentId}`.
  - **Web — share endpoint**: `POST /api/ascents/{id}/share` + warms OG image cache with `GET /api/og/{ascentId}`. Component: `components/cards/AscentCard.tsx` → `activatePublicShare()`.
  - **Web mobile**: `navigator.share({ url, title: "Peakadex" })` — native OS sheet.
  - **Web desktop**: custom dark popover (`#0D2538` bg, `zIndex: 1100`) with two options: WhatsApp (`wa.me/?text=encodeURIComponent(url)`) + copy link (clipboard API, ✓ feedback after copy).
  - **Android**: `Intent.ACTION_SEND` + type `"text/plain"` + `Intent.createChooser(intent, null)`. API call via `vm.shareAscent(ascentId)`. File: `LogbookScreen.kt` + `LogbookViewModel.shareAscent()`.
  - **Mobile v1 endpoint**: `POST /api/v1/ascents/{id}/share` (owner-only, sets `isPublic = true`). File: `app/api/v1/ascents/[id]/share/route.ts`.
  - **iOS (planned)**: `UIActivityViewController` with the URL + call `POST /api/v1/ascents/{id}/share` first.
- **Edit flow:**
  - **Web**: dispatches `CustomEvent("open-ascent-modal", { detail: { editAscent: {...} } })` — opens the edit modal in-place. `NavBar.tsx` listens for this event.
  - **Android / iOS**: navigates to `AscentDetailScreen` / equivalent detail view (full inline edit, no separate edit screen).

**`Ascent.isPublic` Prisma field:**
- `isPublic Boolean @default(false)` — controls whether `/ascent/{id}` (OG share page at `app/(share)/ascent/[id]/`) is publicly accessible without authentication.
- Set to `true` by `POST /api/ascents/{id}/share` or `POST /api/v1/ascents/{id}/share`. Never automatically reset to `false`.
- The share page at `/ascent/{id}` uses `?lang=` query param for i18n. OG image generated by `app/api/og/[id]/route.ts` (Sharp + opentype, cached).

**Filter spec for mobile** → see `DESIGN.md` "Logbook Screen — Bitácora" and `mobile/ios/PLAN.md` Fase 3.

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

### Ascents & Privacy
- Sending/accepting friend requests is the only way to create a friendship. No auto-follow.
- **Tagging a user in a photo does NOT make them a friend.** These are independent concepts.
- A user can be tagged in an ascent photo without any friendship relationship with the author.

### Friendships
- A friendship has two states: `PENDING` (request sent) and `ACCEPTED`.
- Only `ACCEPTED` friendships appear in ranking comparisons and the ascents feed.
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
- Mobile bottom tab bar: **Mi Progreso · Mapa · + (log ascent, center CTA) · Ascensiones** (5 zones, profile accessible from Mi Progreso header).
- Desktop top nav: Mi Progreso · Mapa · Ascensiones + avatar button.
- Home tab = Mi Progreso (gamification dashboard). Root `/` redirects to `/home` when authenticated.
- **Mobile header** (`components/nav/NavBar.tsx`): sticky 52px bar shown only on mobile (`<640px`). Contains the Peakadex logo **absolutely centered** (`position: absolute; left: 50%; transform: translateX(-50%)`) so it stays visually centered regardless of avatar width. The avatar div uses `justify-content: flex-end` on the header.
- **`--top-nav-h` CSS variable**: set to `52px` on mobile (in `app/(app)/layout.tsx`) to match the mobile header height. Map and other full-height containers use `calc(100svh - var(--top-nav-h) - var(--bottom-nav-h))` — this variable must stay in sync with the actual `.mobile-header` height (currently `52px`).
- **Login redirects to `/home`**: after successful login, `app/(auth)/login/page.tsx` pushes to `/home` (Mi Progreso), not `/map`.
- **Bottom tab bar instant feedback**: `NavBar.tsx` uses a `pendingPath` state to highlight the tapped tab immediately, before Next.js completes navigation. `handleTabClick(href)` sets `pendingPath`; a `useEffect` on `pathname` resets it once navigation completes. `tabActive(href)` checks `pendingPath` first, then falls back to `isActive`. **Do not call `router.push` inside `handleTabClick`** — the `Link` component handles navigation; calling push too causes double navigation and blanks the tab bar.
- **Desktop sidebar hover-expand** (`components/nav/Sidebar.tsx`): sidebar expands on `mouseenter` and collapses on `mouseleave` — no toggle button. `collapsed = !hovered && !userMenuOpen`. The user menu keeps the sidebar expanded while open. Main content (`azi-main`) always has `margin-left: 68px` — the sidebar overlays on top when expanded. No localStorage persistence. The old collapse button and `LS_KEY` have been removed.

---

## Deployment

- **Production URL**: [www.peakadex.com](https://www.peakadex.com) (custom domain via GoDaddy CNAME → Railway)
- **Platform**: Railway (auto-deploys on push to `main`)
- **Databases**: Two Railway PostgreSQL instances — sandbox (port 40040) and production (port 10046 / internal `postgres-52e3.railway.internal:5432`)
- **File storage**: Cloudflare R2, public base URL `https://pub-e648f9ddf0d74df1b67853b9453fbca5.r2.dev`
  - Avatar key pattern: `avatars/{userId}.jpg`
- **Email**: Resend (`resend` npm package), domain `mail.peakadex.com` (configured via Resend + Cloudflare integration), region `eu-west-1`. From address: `Peakadex <noreply@mail.peakadex.com>`. API key in env var `RESEND_API_KEY`, from address in `RESEND_FROM`. Email logic in `lib/email.ts`.

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

`AscentCard`  shows below the image:

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
| Home | **Stats** | **Stats** | **Stats** | **Stats** | **Stats** |
| Map | **Atlas** | **Atlas** | **Atlas** | **Atlas** | **Atlas** |
| Ascents | **Bitácora** | **Bitàcola** | **Logbook** | **Carnet** | **Logbuch** |
| New ascent | **+** | **+** | **+** | **+** | **+** |

Note: "Atlas" is intentionally not translated — it's a brand name kept across all locales. The Home tab was renamed from "Peakadex stats" to "Stats" (2026-05-28) for brevity.

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
- **iOS Safari — pinch-zoom displaces HTML markers via ResizeObserver**: The `ResizeObserver` on the map container calls `map.resize()` whenever the container changes size. On iOS Safari, pinch-zooming causes the browser chrome (address bar) to show/hide, which changes the viewport height mid-gesture. This triggers `map.resize()` with transient/incorrect canvas dimensions, repositioning all HTML markers in the wrong place. Fix: suppress `map.resize()` while a touch gesture is active, and do a final resize on `touchend`. Use a `touchActive` boolean flag: set it in `touchstart`, clear it in `touchend`/`touchcancel` (with a 50ms `setTimeout` before calling `resize()`). The `ResizeObserver` checks `!touchActive` before resizing. **Critical detail**: `touchend` fires once per finger lifted, not once per gesture. With a 2-finger pinch, the first `touchend` fires while the second finger is still on screen — `e.touches.length` is still `> 0`. Only clear `touchActive` and call `resize()` when `e.touches.length === 0` (last finger lifted). Using a plain `() => {}` signature loses access to the event, causing `touchActive` to be cleared too early and the bug to reappear. Always type the handler as `(e: TouchEvent) => void`. See `MapView.tsx`.
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
- **All face tags are always ACCEPTED**: `reviewTagsBeforePost` feature was removed (2026-04-21). `setFaceTag()` always creates tags with `status: "ACCEPTED"`. The only remaining check is `allowOthersToTag` — if the tagged user has it disabled, `setFaceTag` returns `null`. Always pass `session.user.id` as `taggerUserId` when calling `setFaceTag` from API routes (self-tagging bypasses the `allowOthersToTag` check).
- **Invitations use Vouchers, not a separate model**: Friend invitations create a standard `Voucher` record with `maxUses: 1`, `inviterId`, and `inviteeEmail` set. Admin-created vouchers have these fields null. The invitation flow does NOT create any new token model — it reuses the existing voucher system.
- **Email before voucher creation**: In `POST /api/invitations`, the email is sent BEFORE creating the Voucher in the DB. This ensures no orphaned vouchers if the email fails. If you reorder this, a failed email will leave an active voucher that blocks re-invitation.
- **PhotoTagStep header must be outside the zIndex 1100 stacking context**: The face-selection bottom sheet backdrop renders as `position:fixed; inset:0; zIndex:1200`. If the header (skip/done buttons) is inside the `zIndex:1100` container, the backdrop covers it and touches on the buttons are intercepted by the backdrop — the button feels unresponsive. Fix: render the header as a separate `position:fixed; zIndex:1300` div at the top of the JSX, outside the main container. Use a `headerRef` + `useEffect` to measure its height and apply it as `paddingTop` on the main container so the photo area starts below the header.
- **`ImageCropModal` touchmove and wheel must be non-passive**: React registers `onTouchMove` and `onWheel` as passive event listeners, so calling `e.preventDefault()` inside them has no effect and logs a warning. Register both handlers as native listeners with `{ passive: false }` via `useEffect` on the container ref. Keep each handler logic in a `useRef` that is reassigned every render (not a dependency of the effect) so the native listener always reads fresh React state without needing to be re-registered.

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
- Apple Sign-In (Google Sign-In already implemented)
- Registering with an invitation voucher doesn't auto-create the friendship or link the Person — the invitee must find the inviter manually in Amigos and send a friend request

---

## Create / Edit Ascent Flow — Contract

This section is the authoritative specification for the create and edit ascent flow. Any change to `NewAscentModalContent`, `PeakPicker`, `PickStep`, or related API routes must remain consistent with this contract.

### Components involved
- `components/ascents/NewAscentModalContent.tsx` — main state machine, form, submit logic
- `components/ascents/PeakPicker.tsx` — peak search input with keyboard navigation
- `components/ascents/PickStep.tsx` — photo upload/drag-drop step
- `components/photos/ImageCropModal.tsx` — crop + rotate step
- `components/nav/NavBar.tsx` — hosts the modal; listens for `open-ascent-modal` custom DOM event

### State machine

```
CREATE mode:  pick → crop → form → (submit) → /ascents?highlight={id}
EDIT mode:    form  (starts here directly)    → (submit) → router.refresh() + onClose()
```

- **`pick`**: PickStep. User selects ≥1 image. Validates size ≤ 10 MB. Triggers EXIF extraction for date + GPS peak suggestion (skipped if `defaultPeakId` is present).
- **`crop`**: ImageCropModal for each queued file. Ratios: 1:1 or 4:5. Supports 90° rotation. Produces `{ blob, cropMeta, originalFile }` per photo. In edit mode re-crop fetches the original via `GET /api/photos/{id}/original`.
- **`form`**: Fields: peak (required), date (required, default today or EXIF date), route (optional, max 500), notes (optional, max 2000), persons (optional), wikiloc (edit mode only, optional).

### Validation rules (enforced before any API call)

| Rule | Create | Edit |
|---|---|---|
| Peak selected | ✅ required | ✅ required |
| Photo present | ✅ ≥1 readyItem required | ✅ existing photo OR pending new photo required |
| Photo size | ≤ 10 MB per file | ≤ 10 MB if replacing |
| Date format | YYYY-MM-DD | YYYY-MM-DD |

### Create submit sequence (handleSubmit)

1. `POST /api/ascents` — creates the ascent record
2. For each photo: `POST /api/photos/upload` with `file` + `originalFile` + `cropMeta` + `ascentId`
3. If persons selected: `POST /api/photos/{id}/faces` with manual bounding box covering full image
4. On success: `window.location.href = /ascents?highlight={ascentId}` (full reload to reset state)
5. On photo upload failure: show error, close modal, refresh list (ascent record already created)

### Edit submit sequence (handleEditSubmit)

1. `PATCH /api/ascents/{id}` — updates peakId, date, route, description, wikiloc
2. **If new photo pending**: `POST /api/photos/upload` → `POST /api/photos/{id}/faces` → delete old photo
   - If old photo had `originalStorageKey`: delete with `?keepOriginal=1`, pass `reuseOriginalPhotoId`
   - If old photo had no `originalStorageKey` (legacy): delete normally
3. **If no new photo**: `POST /api/photos/{existingPhotoId}/faces` to update person tags in place
4. On success: `router.refresh()` + `onClose()` (no full reload — modal closes, list refreshes in background)

### PeakPicker contract

- Hidden input `name="peakId"` holds the selected peak ID.
- While `peaks` array is still loading (async), falls back to `defaultPeakId` in the hidden input **unless** user has explicitly cleared the field (`userCleared = true`).
- `defaultPeakName` pre-fills the query text immediately so the field isn't blank while peaks load.
- Keyboard: ArrowUp/Down navigate, Enter selects, Escape closes dropdown.
- Suggestion chip (blue): shown when `suggested=true` and a peak was pre-selected from GPS. User can dismiss it.
- Dropdown: max 60 results shown; footer shows count of hidden results.
- Empty state: `t.peak_notFound` (i18n, all 5 locales).

### Open-from-map integration

The map fires a custom DOM event to open the modal with a pre-selected peak:
```ts
document.dispatchEvent(new CustomEvent("open-ascent-modal", {
  detail: { peakId: string, peakName: string }
}));
```
`NavBar.tsx` listens for this event and sets `defaultPeakId` + `defaultPeakName` on the modal. The `pick` step GPS suggestion is **skipped** when `defaultPeakId` is present.

### i18n

All visible strings use `t.*` keys — no hardcoded text in any language. Keys used:
`ascents_logTitle`, `ascents_editTitle`, `field_peak`, `field_selectPeak`, `field_date`, `field_route`, `field_routePlaceholder`, `field_notes`, `field_notesPlaceholder`, `tag_tagPeople`, `tag_searchOrType`, `optional`, `crop_title`, `crop_next`, `newAscent_save`, `newAscent_saveChanges`, `newAscent_delete`, `newAscent_discardTitle`, `newAscent_discardMessage`, `newAscent_discard`, `newAscent_clickOrDrag`, `newAscent_maxSize`, `newAscent_selectFiles`, `photo_tooLarge`, `newAscent_photoFailed`, `ascents_delete_title`, `ascents_delete_body`, `delete`, `deleting`, `cancel`, `detail_editPhoto`, `edit_failedToSave`, `peak_notFound`, `peak_moreResults`.

### What must NOT change without updating this contract

- The `pick → crop → form` step order in create mode
- Photo being required in both create and edit mode
- The `userCleared` guard in PeakPicker (prevents wiping `defaultPeakId` during async load)
- The `open-ascent-modal` custom event signature (`{ peakId, peakName }`)
- The edit submit calling faces API even when no new photo is uploaded (updates person tags)
- `window.location.href` for create success (full reload) vs `router.refresh()` for edit (soft refresh)

---

## Android App — Fase 5: Atlas (MapLibre Android)

**Files:** `mobile/android/app/src/main/java/com/peakadex/app/feature/atlas/AtlasScreen.kt` + `AtlasViewModel.kt`  
**SDK:** MapLibre Android SDK **11.8.2** (`org.maplibre.gl:android-sdk:11.8.2`)

This is a **complete, shipped feature**. The notes below are the authoritative spec so future sessions implement it correctly from scratch without iterating.

---

### Map library

**MapLibre Android SDK** — NOT Google Maps, NOT maplibre-gl (JavaScript). The Android SDK uses `MapView`, `AndroidView`, `GeoJsonSource`, `SymbolLayer`, `CircleLayer`, etc. from `org.maplibre.android.*`.

**Basemap:** Carto Voyager raster tiles — `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png` (max zoom 19).  
**MapView options:** `compassEnabled(false)`, `logoEnabled(false)`, `attributionEnabled(false)`.

---

### MapView lifecycle inside a Compose tab

Because the Activity is already STARTED/RESUMED when the user navigates to the Atlas tab, the standard `LifecycleEventObserver` pattern misses the initial `ON_START`/`ON_RESUME` events. Fix: call `mv.onCreate(null)`, `mv.onStart()`, `mv.onResume()` **immediately inside the `factory` lambda** of `AndroidView`. The `LifecycleEventObserver` then only handles app-to-background events.

**Critical `onDispose` fix (2026-05-28):** `onDispose` fires while the Activity is still RESUMED (tab navigation), so the lifecycle observer never delivers `ON_PAUSE`/`ON_STOP` — the GL queue is not flushed and the context becomes corrupted. Always call them explicitly in `onDispose`:

```kotlin
onDispose {
    lifecycleOwner.lifecycle.removeObserver(observer)
    mapViewRef.value?.let { mv ->
        runCatching { mv.onPause() }
        runCatching { mv.onStop() }
        runCatching { mv.onDestroy() }
    }
}
```

`runCatching` on each call prevents a crash in one step from blocking the others.

---

### Base style JSON + 3D terrain

The style is initialised with a JSON string passed to `Style.Builder().fromJson(baseStyleJson)`. The JSON declares the terrain DEM source and enables **3D terrain extrusion**. Additional sources/layers are added with `.withSource()` / `.withLayer()` on the builder, or programmatically in `setupSources()` / `setupLayers()` after style load.

```json
{
  "version": 8,
  "sources": {
    "terrain-dem": {
      "type": "raster-dem",
      "tiles": ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      "encoding": "terrarium",
      "maxzoom": 15
    }
  },
  "terrain": { "source": "terrain-dem", "exaggeration": 1.0 },
  "layers": []
}
```

- `encoding: "terrarium"` matches the AWS elevation-tiles-prod tile format.
- `exaggeration: 1.0` — no artificial scaling, real Alpine terrain is dramatic enough (matches the MapLibre official hybrid-satellite example).
- **Do NOT add `SRC_TERRAIN_DEM` in `setupSources()`** — it is already declared in the JSON. Re-adding it causes a "Source already exists" crash.
- The `LYR_HILLSHADE` layer still uses `SRC_TERRAIN_DEM` (same source ID `"terrain-dem"`); it resolves correctly.
- Pressing the **3D button** tilts the camera to **70°** pitch (matching the MapLibre hybrid-satellite example), making the terrain extrusion fully visible. Tapping again restores 0°.

---

### Source / layer constants

```kotlin
enum class MapType { NORMAL, TERRAIN, SATELLITE }   // in AtlasScreen.kt, UI-only

private const val SRC_CLIMBED             = "climbed-source"
private const val SRC_UNCLIMBED           = "unclimbed-source"
private const val LYR_CLIMBED             = "climbed-layer"
private const val LYR_UNCLIMBED_CLUSTER   = "unclimbed-cluster-layer"
private const val LYR_UNCLIMBED_SINGLE    = "unclimbed-single-layer"
private const val LYR_CLUSTER_COUNT       = "cluster-count-layer"
private const val DEFAULT_RARITY_COLOR    = "#22C55E"   // green-500
private const val UNCLIMBED_COLOR         = "#3B82F6"   // blue-500 (fallback only)

private const val SRC_TERRAIN_DEM         = "terrain-dem"   // declared in base JSON
private const val SRC_TRAILS              = "trails-source"
private const val SRC_SATELLITE           = "satellite-source"
private const val LYR_HILLSHADE           = "hillshade-layer"
private const val LYR_TRAILS              = "trails-layer"
private const val LYR_SATELLITE           = "satellite-layer"

private const val SRC_SELECTED            = "selected-source"
private const val LYR_SELECTED_GLOW       = "selected-glow-layer"
```

---

### Sources setup (`setupSources`)

**Do NOT add terrain-dem here** — it is in the base JSON.

```
RasterSource(SRC_SATELLITE)   → ESRI World Imagery, path {z}/{y}/{x} (row/col order), max zoom 19
RasterSource(SRC_TRAILS)      → WaymarkedTrails hiking tiles, max zoom 17
GeoJsonSource(SRC_CLIMBED)    → empty FeatureCollection, updated via updateMapSources()
GeoJsonSource(SRC_SELECTED)   → empty FeatureCollection, updated by glow-ring DisposableEffect
GeoJsonSource(SRC_UNCLIMBED)  → clustering enabled (maxZoom=12, radius=50)
```

**ESRI satellite URL:** `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`  
Note the `{z}/{y}/{x}` path order (ESRI row/col) — MapLibre substitutes its `{z}`, `{y}`, `{x}` variables correctly.  
No API key required.

---

### Layers setup (`setupLayers`)

Layer order (bottom → top):

| Layer | Type | Source | Initially |
|---|---|---|---|
| `LYR_SATELLITE` | RasterLayer (opacity 1.0) | SRC_SATELLITE | Hidden (NONE) |
| `LYR_HILLSHADE` | HillshadeLayer | SRC_TERRAIN_DEM | Hidden (NONE) |
| `LYR_TRAILS` | RasterLayer (opacity 0.75) | SRC_TRAILS | Hidden (NONE) |
| `LYR_UNCLIMBED_CLUSTER` | CircleLayer — filter: `has("point_count")` | SRC_UNCLIMBED | Visible |
| `LYR_UNCLIMBED_SINGLE` | CircleLayer — filter: `not(has("point_count"))` | SRC_UNCLIMBED | Visible |
| `LYR_CLUSTER_COUNT` | SymbolLayer — filter: `has("point_count")` | SRC_UNCLIMBED | Visible |
| `LYR_CLIMBED` | SymbolLayer — `iconImage(get("iconImage"))` | SRC_CLIMBED | Visible |
| `LYR_SELECTED_GLOW` | CircleLayer (amber pulse) | SRC_SELECTED | Hidden (NONE) |

**Cluster circles:** radius = step(point_count, 18, 10→22, 50→26); color `#3B82F6`; opacity 0.85; stroke 2dp white.  
**Single unclimbed:** radius 7dp; color = `circleColor(get("rarityColor"))` (data-driven from GeoJSON property); opacity 0.85; stroke 1.5dp white.  
**Cluster count label:** `{point_count_abbreviated}`, size 12, white, `textIgnorePlacement=true`, `textAllowOverlap=true`.  
**Climbed SymbolLayer:** `iconImage(get("iconImage"))`, `iconSize(1.0)`, `iconAllowOverlap=true`, `iconIgnorePlacement=true`.  
**Hillshade:** `hillshadeExaggeration(0.7f)`, `hillshadeHighlightColor("rgba(255,255,255,0.4)")`, `hillshadeShadowColor("rgba(0,0,0,0.5)")`.  
**Selected glow:** `circleRadius(22f)`, `circleColor("#FBBF24")` (amber), `circleOpacity(0f)`, initially NONE.

---

### GeoJSON feature properties

**Climbed feature:**
```
"id"        → ascent.peakId (String)
"name"      → ascent.peak.name
"altitudeM" → ascent.peak.altitudeM (Number)
"iconImage" → "peak-photo-{peakId}"  ← must match the image key registered in the style
```

**Unclimbed feature:**
```
"id"          → peak.id (String)
"name"        → peak.name
"altitudeM"   → peak.altitudeM (Number)
"rarityColor" → peak.rarityId?.let { rarityColorMap[it]?.color } ?: UNCLIMBED_COLOR
```

`rarityColor` is embedded at data-update time in `updateMapSources()` using `rarities.associateBy { it.id }`. The `LYR_UNCLIMBED_SINGLE` layer uses `circleColor(get("rarityColor"))` to render each dot in its rarity colour.

**Coordinates:** always `Point.fromLngLat(peak.longitude, peak.latitude)` — longitude first (GeoJSON convention).

---

### Selected peak glow ring (`LYR_SELECTED_GLOW`)

A pulsing amber ring rendered with a `ValueAnimator` (Choreographer-driven — coroutine delay loops do NOT reliably trigger MapLibre GL repaints):

```kotlin
DisposableEffect(selected, styleReady.value) {
    // ...
    val animator = ValueAnimator.ofFloat(0f, 1f).apply {
        duration     = 1600
        repeatCount  = ValueAnimator.INFINITE
        interpolator = DecelerateInterpolator()   // import android.view.animation.DecelerateInterpolator
        addUpdateListener { anim ->
            val t = anim.animatedValue as Float
            glow.setProperties(circleRadius(22f + t * 30f), circleOpacity((1f - t) * 0.45f))
        }
    }
    animator.start()
    onDispose { animator.cancel() }
}
```

**Import:** `android.view.animation.DecelerateInterpolator` — NOT `android.animation.DecelerateInterpolator` (compile error).

---

### Photo bitmap markers (incremental loading)

`loadedMarkerIds: MutableSet<String>` tracks which peaks are already in the style.  
On each `LaunchedEffect(styleReady, climbed, rarities)` invocation, only **new** peaks (not in `loadedMarkerIds`) are processed.  
**When `rarities` first arrive** (list goes from empty to non-empty), `loadedMarkerIds.clear()` + `loadedWithRarities.value = true` to force a full reload with correct ring colors.

```kotlin
fun createCircularMarkerBitmap(source: Bitmap, ringColorHex: String, sizePx: Int = 88): Bitmap
```
- Ring width = `sizePx * 0.07f` (7%)
- Photo radius = `cx - ringW - 1f`
- Uses `BitmapShader(CLAMP)` to clip the photo to a circle
- Draws a solid stroke ring at `cx - ringW/2f` with the rarity color

```kotlin
fun createFallbackMarkerBitmap(ringColorHex: String, sizePx: Int): Bitmap
```
- Used when `ascent.photoUrl == null`
- `sizePx = 48` (smaller than photo markers at 88)
- White fill + colored ring (ringW = `sizePx * 0.12f`)

Bitmaps are registered on the main thread via `withContext(Dispatchers.Main) { map.style?.addImage("peak-photo-$peakId", bitmap, false) }`.

---

### Viewport culling (`applyViewportScore`)

Smooth linear ramp — no abrupt step changes:
```
zoom ≤ 5  →  5% of peaks shown
zoom 13   → 100% (no culling at street/valley level)
```
Score per peak (3-component composite):
- `normAlt * 0.5` — higher peaks are more significant landmarks
- `rarityWeight * 0.3` — rarer peaks deserve more visibility
- `normDist * 0.2` — peaks near viewport center are more relevant

`normAlt = peak.altitudeM / maxAlt`; `rarityWeight` from `rarities.associate { it.id to it.scoreWeight }` (fallback `0.1`); `normDist = 1.0 - (distKm / maxDist).coerceIn(0, 1)`.

Result: at least 1 peak always shown. `zoom >= 13.0` short-circuits and returns the full list.

**Server `take` limits by zoom** (`app/api/v1/peaks/route.ts`):
| zoom | server limit |
|------|-------------|
| < 6  | 50 peaks |
| 6–7  | 150 peaks |
| 8–10 | 300 peaks |
| ≥ 11 | 500 peaks |
| (not sent) | 300 peaks (fallback) |

---

### ViewModel state (`AtlasUiState`)

```kotlin
enum class AtlasFilter { ALL, CLIMBED, NOT_YET }
enum class SortMode    { DISTANCE, RELEVANCE, ALTITUDE }
data class SelectedPeakUi(val peak: Peak, val ascent: MapAscent?)  // ascent=null → unclimbed

data class AtlasUiState(
    val isLoadingAscents:   Boolean                  = true,
    val climbedByPeakId:    Map<String, MapAscent>   = emptyMap(),
    val viewportPeaks:      List<Peak>               = emptyList(),   // unclimbed peaks for map dots
    val listPeaks:          List<Peak>               = emptyList(),   // fixed-radius peaks for list view
    val isLoadingList:      Boolean                  = false,
    val filter:             AtlasFilter              = AtlasFilter.ALL,
    val selectedRarityIds:  Set<String>              = emptySet(),
    val sortMode:           SortMode                 = SortMode.DISTANCE,
    val rarities:           List<Rarity>             = emptyList(),
    val selected:           SelectedPeakUi?          = null,
    val searchQuery:        String                   = "",
    val searchResults:      List<Peak>               = emptyList(),
    val placeResults:       List<GeocodedPlace>      = emptyList(),
    val isSearchActive:     Boolean                  = false,
    val showList:           Boolean                  = false,
    val error:              String?                  = null,
)
```

**API calls:**
- `api.getConfig()` → loads `config.rarities` into state
- `api.getMapAscents()` → populates `climbedByPeakId` (associatedBy `a.peakId`)
- `api.getViewportPeaks(north, south, east, west, zoom)` → fetched in `onMapIdle()` (debounced 500ms); skipped entirely if `filter == CLIMBED`
- `api.searchPeaks(query)` → debounced 300ms, `take(20)` results
- `loadListPeaks(lat, lon)` → fixed ~50km bbox around map center (zoom=12, up to 500 peaks); called when opening the list. Managed by a dedicated `loadListJob: Job?` — cancelled before starting a new one.

**`onToggleList` fallback (fix 2026-05-28):** `cameraCenter` can be null when the list is opened before the camera has settled. `onToggleList` falls back to `lastBounds` center so the list always loads:
```kotlin
val lat = centerLat ?: lastBounds?.let { (it.north + it.south) / 2 }
val lon = centerLon ?: lastBounds?.let { (it.east + it.west) / 2 }
```
`loadListPeaks` is a `private suspend fun` — `onToggleList` owns the Job via `loadListJob`.

**Debounce constants:**
- `VIEWPORT_DEBOUNCE_MS = 500L` — viewport queries (longer to avoid mid-animation firing)
- `SEARCH_DEBOUNCE_MS = 300L` — text search

`onMapIdle()` receives `zoom: Double`, saves bounds in `lastBounds`, computes center, passes to `applyViewportScore()`. Unclimbed only — already-climbed peaks are filtered out of `viewportPeaks`.

**`lastBounds` re-fetch:** when switching from CLIMBED filter back to ALL/NOT_YET, `viewportPeaks` is empty (queries were skipped). `onFilterChanged` re-calls `onMapIdle(lastBounds)` to repopulate immediately.

**Initial viewport fetch:** `addOnCameraIdleListener` does NOT fire for the initial resting position. Trigger `vm.onMapIdle(...)` once manually after style loads (inside `map.setStyle { style -> ... }`).

**`AppConfig` deserialization note:** `AppConfig` only contains `val rarities: List<Rarity>`. Do NOT add a `levelDefs` / `LevelDef` field — the JSON `"levels"` array has a different schema and causes `MissingFieldException` which silently breaks rarity loading. `ignoreUnknownKeys = true` in the Kotlinx JSON config handles it automatically.

---

### Camera values

| Event | Zoom | Pitch | Duration |
|---|---|---|---|
| Initial load — most recent ascent | 9.0 | 0° | 800ms |
| Initial load — no ascents (Barcelona fallback) | 8.0 | 0° | 800ms |
| Peak selected (map tap or search) | 13.0 | 0° | 600ms |
| 3D button ON | — | **70°** | 600ms |
| 3D button OFF | — | 0° | 600ms |
| Geolocate found | 14.0 | 0° | instant |

Initial camera only flies once (`hasInitialFlown: MutableState<Boolean>`) after both `styleReady == true` AND `isLoadingAscents == false`.

---

### MapType — basemap toggle

`var mapType by rememberSaveable { mutableStateOf(MapType.NORMAL) }` replaces the old `hillshade: Boolean`.

`LaunchedEffect(styleReady.value, mapType)` handles all three modes:

```kotlin
// Basemap: carto OR satellite (mutually exclusive)
style.getLayer("carto-basemap-layer")
    ?.setProperties(visibility(if (mapType == MapType.SATELLITE) NONE else VISIBLE))
style.getLayer(LYR_SATELLITE)
    ?.setProperties(visibility(if (mapType == MapType.SATELLITE) VISIBLE else NONE))
// Hillshade: only for TERRAIN. SATELLITE = pure imagery (hillshade darkens satellite tiles).
style.getLayer(LYR_HILLSHADE)
    ?.setProperties(visibility(if (mapType == MapType.TERRAIN) VISIBLE else NONE))
```

`hasActiveLayers = mapType != MapType.NORMAL || trails` — lights up the blue dot badge on the Layers button.

---

### ⚠️ CRITICAL: PeakDetailSheet rarity accent band

**Do NOT use `containerColor = rarityColor`** — it paints the entire sheet surface including the system navigation bar area at the bottom, causing a coloured strip below the content on gesture-nav phones.

**Correct pattern:** `containerColor = Color.White` always. The dragHandle Box draws the rarity colour explicitly via its own `.background()`. The sheet's `shape` clips the dragHandle to rounded top corners automatically.

```kotlin
ModalBottomSheet(
    onDismissRequest = onDismiss,
    sheetState       = sheetState,
    containerColor   = Color.White,                                   // ← always white
    shape            = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
    dragHandle = {
        // 7dp band — the sheet's shape clips the top corners automatically.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(7.dp)
                .background(rarityColor ?: Color.Transparent),        // ← explicit rarity bg
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .width(32.dp).height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(
                        if (rarityColor != null) Color.White.copy(alpha = 0.6f)
                        else PeakBorderLight,
                    ),
            )
        }
    },
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .navigationBarsPadding()
            .padding(bottom = 20.dp),
    ) { /* header, photo, buttons */ }
}
```

**Band geometry:** 7dp dragHandle height, 12dp corner radius. At y=7dp the arc inset is <0.1dp → no colour bleed past the drag band.

**Rarity color parsing:**
```kotlin
val rarityColor = rarity?.let {
    runCatching {
        androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(it.color))
    }.getOrNull()
}
```

---

### PeakDetailSheet — header & button spec

**Header layout (inside the white Column):**
```
Row:   [peak.name (weight 1f)]  [altitudeM m]
if mountainRange non-null:
       Text(mountainRange, 12sp, PeakSubtle)   ← comarca on its own line
Row (end-aligned):
       [✿ rarity.label badge]   ← only if rarity != null
```

**Hero photo:** full-width `AsyncImage`, `aspectRatio(3f/2f)`, only if `ascent?.photoUrl != null`.

**No "Aún sin escalar" text** — removed. Unclimbed peaks show no status text.

**Action buttons:**
- Climbed: `OutlinedButton("Ver capturas")` (weight 1f) + `Button("Capturar")` (weight 1f, PeakSlate)
- Unclimbed: single full-width `Button("Capturar")` (PeakSlate) — **no `+` prefix**

---

### Geolocation (`geoLocateNow`)

Permission: `ACCESS_COARSE_LOCATION` (not FINE — coarse is enough for city-level map centering).  
Flow:
1. Check permission. If not granted → launch `ActivityResultContracts.RequestPermission()`.
2. Try `getLastKnownLocation(GPS) ?: NETWORK ?: PASSIVE`. If found → animate camera to zoom 14.
3. If no cached location and API ≥ 30 → `lm.getCurrentLocation(provider, null, mainExecutor, callback)`.
4. If API < 30 → `@Suppress("DEPRECATION") lm.requestSingleUpdate(...)`.
5. On any failure → `runCatching { }.onFailure { onDone() }` — never crashes.

`geoLocating: Boolean` local state shows a `CircularProgressIndicator` inside the geolocate `MapControlBtn`.

---

### List data source (`PeaksListPanel`)

The list is **decoupled from the map viewport**. When the user opens the list:
1. `onToggleList(centerLat, centerLon)` is called with the current map center coordinates.
2. `loadListPeaks(lat, lon)` fires a fresh API query with a fixed ~50 km radius bbox (±0.45° lat, ±0.60° lon) and `zoom=12` (500-peak server limit).
3. The list shows peaks from `listPeaks` (fixed radius) not from `viewportPeaks` (zoom-culled).

This means: even if the user is at zoom 6 (showing a whole mountain range), the list shows all peaks within ~50 km of the map center — not the tiny zoom-culled subset visible on the map.

Climbed peaks always come from `climbedByPeakId` (the full user ascent set, no radius restriction).

A `CircularProgressIndicator` shows while `isLoadingList = true`. When the list closes, `listPeaks` is cleared to free memory.

### List sort modes (`PeaksListPanel`)

| Mode | Logic |
|---|---|
| `DISTANCE` | `haversineKm(center, peak)` ascending; falls back to altitude desc if `center == null` |
| `ALTITUDE` | `altitudeM` descending |
| `RELEVANCE` | `distScore * 0.5 + rarityWeight * 0.3 + normAlt * 0.2` descending; `distScore = 1.0 / (distKm + 0.1)` |

`haversineKm` uses the standard formula (R = 6371 km).

---

### UI components summary

| Component | Description |
|---|---|
| `SearchBarOverlay` | White pill with search icon + `OutlinedTextField` (transparent border) + `X` dismiss; `Filtros` pill turns navy (`PeakSlate`) when active; blue 8dp dot badge when filters active but panel closed |
| `SearchResultsList` | `LazyColumn` in white rounded card; colored 8dp status dot (green=climbed, blue=unclimbed); name + range/altitude sub |
| `PeakDetailSheet` | `ModalBottomSheet` containerColor=White; 7dp rarity band in dragHandle (explicit bg); 12dp corner radius; header = name+altitude / comarca / rarity badge; 3:2 hero photo; "Capturar" button (no + for unclimbed) |
| `MapControlsColumn` | Bottom-right `Column` with 48dp circular buttons (shadow 4dp); Search / Layers / 3D / Geolocate; active state = `PeakSlate` background |
| `MapControlBtn` | 48dp circle, shadow 4dp, `PeakSlate` when active |
| `ListaMapaButton` | Bottom-center pill; green `PeakClimbedGreen` when showing map, navy `PeakSlate` when showing list; list icon / map outline icon |
| `PeaksListPanel` | Full-screen white overlay with `statusBarsPadding()`; spinner while `isLoadingList`; `LazyColumn`; each row has 44dp photo thumbnail (climbed, rarity border) or 9dp blue dot (unclimbed) + name + range/country + altitude + distance from center |
| `LayersPanel` | `ModalBottomSheet` white; **3-column** `LayerCard` grid (Normal / Terrain / Satélite) + Trails toggle row; active card has blue border + checkmark badge |
| `LayerCard` | 44dp icon box, checkmark badge on active, `PeakBlueActive` border/text when active |
| `FiltersPanel` | `ModalBottomSheet` white; header with "Limpiar todo" when dirty; `FlowRow` of `RarityPill`s; `FilterChip` for status (ALL/CLIMBED/NOT_YET) and sort (DISTANCE/RELEVANCE/ALTITUDE); footer "Ver N cimas" green CTA button |
| `RarityPill` | Toggle pill; colored border + background tint when selected; `✿ label (N)` format |

---

### Local UI state

`rememberSaveable` (persists on rotation): `showTopBar`, `terrain3d`, `mapType` (MapType enum), `trails`.  
`remember` (reset on rotation is fine): `layersOpen`, `filtersOpen`, `geoLocating`.  
`remember { mutableStateOf<MapView?>(null) }` etc. for map references — NOT `rememberSaveable` (not serializable).

---

### Navigation contract

`AtlasScreen` receives two lambdas:
- `onNavigateToLogbook: (peakId: String, peakName: String) -> Unit` — from "Ver capturas" on a climbed peak detail
- `onNavigateToNewAscent: (peakId: String, peakName: String) -> Unit` — from "Capturar" buttons; navigates to `NewAscentScreen` with pre-selected peak

---

### All icons are inline `ImageVector.Builder`

**No Material Icons dependency.** All icons in `AtlasScreen.kt` are defined as private `val` using `ImageVector.Builder` + path DSL. Icon names: `SearchIcon`, `CloseIcon`, `FiltersIcon`, `LayersIcon`, `LocationIcon`, `MapOutlineIcon`, `ListIcon`, `TerrainIcon`, `TrailsIcon`, `CheckIcon`, **`SatelliteIcon`** (rounded square frame + 2×2 grid lines).

`SatelliteIcon` uses `curveTo()` for bezier curves — NOT `cubicTo()` (that name does not exist in Compose `PathBuilder` and causes a compile error).

---

### RSC serialization rule (web — critical gotcha)

When a Next.js **Server Component** passes props to a `"use client"` component, ALL props must be serializable (strings, numbers, booleans, plain objects/arrays). **Functions are NOT serializable.** If the `t` i18n object contains a function (e.g. `catalog_count: (n: number) => string`) and you pass the full `t` to a client component, Next.js production RSC will crash with a digest error (not visible locally in dev mode). **Always pass only the specific string/number keys the client component needs** — never pass the full `t` object if it contains functions.

---

## Android App — New Ascent Flow (Fase 3: crear ascensión)

This section is the **authoritative spec** for the Android new-ascent flow. Every detail here was learned through implementation and debugging in session `f3e9cb9d`. Future sessions must implement this correctly from scratch without iterating.

**Files involved:**
- `feature/newascent/NewAscentSheet.kt` — 3-step bottom sheet UI
- `feature/newascent/NewAscentViewModel.kt` — state machine + API calls
- `core/model/Models.kt` — data classes
- `core/api/ApiService.kt` — Retrofit interfaces
- `core/navigation/MainScaffold.kt` — orchestrates trigger state
- `feature/logbook/LogbookScreen.kt` — receives refresh/highlight, scrolls to new ascent
- `feature/logbook/LogbookViewModel.kt` — `refresh()` + filter mutation

---

### Step machine: PICK → CROP → FORM

```
PICK  → user taps anywhere to open photo picker
CROP  → crop 4:5, zoom slider, rule-of-thirds grid, rotate 90°
FORM  → peak search, date, route (optional), notes (optional), person tags
         ↓ submit
onSuccess(ascentId) → close sheet → navigate to Logbook + scroll to + highlight
```

`NewAscentStep` enum: `PICK`, `CROP`, `FORM`.

---

### CROP step implementation (PhotoCropStep)

Always 4:5 — **no aspect ratio toggle**. Output mirrors web `OUTPUT_W = 1080`.

```kotlin
val cropW    = containerW * 0.92f
val cropH    = cropW * 5f / 4f   // always 4:5

val minScale = maxOf(cropW / bitmapW, cropH / bitmapH)  // fit-cover
val maxScale = minScale * 4f

// Compress output — mirrors web:
val targetW = 1080
val scaled  = if (bitmap.width > targetW) {
    val r = targetW.toFloat() / bitmap.width
    Bitmap.createScaledBitmap(bitmap, targetW, (bitmap.height * r).toInt(), true)
} else bitmap
ByteArrayOutputStream().also { scaled.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
// Result: 1080×1350px JPEG 0.85
```

- Rule-of-thirds grid: draw 4 lines at 1/3 and 2/3 of crop width/height, ~50% alpha white, 0.5dp stroke.
- Rotate 90° CW button (↻): `rotation = (rotation + 90) % 360` state, swap `bitmapW`/`bitmapH` when computing `minScale` at 90°/270°.
- Pinch-zoom: `rememberTransformableState`. Clamp scale to `[minScale, maxScale]`, clamp offset so photo always covers crop frame.

---

### API contract gotchas — MUST follow exactly

#### 1. `CreateAscentRequest` must be a data class

`Map<String, String?>` **crashes** at runtime. Kotlinx Serialization's `StringSerializer` is non-null and cannot handle nullable map values.

```kotlin
// core/model/Models.kt
@Serializable
data class CreateAscentRequest(
    val peakId: String,
    val date: String,
    val route: String? = null,
    val description: String? = null,
)
```

#### 2. `createAscent` returns a wrapper — NOT the Ascent directly

Server response: `{ "ascent": { ... } }`. Use `AscentResponse` wrapper + unwrap `.ascent`.

```kotlin
@Serializable data class AscentResponse(val ascent: Ascent)
// ApiService:
@POST("ascents")
suspend fun createAscent(@Body body: CreateAscentRequest): AscentResponse
// Usage in ViewModel:
val ascent = api.createAscent(CreateAscentRequest(...)).ascent
```

#### 3. `uploadPhoto` returns a wrapper — NOT the Photo directly

Server response: `{ "photo": { ... } }`. Use `PhotoResponse` wrapper + unwrap `.photo`.

```kotlin
@Serializable data class PhotoResponse(val photo: Photo)
// ApiService:
@Multipart @POST("photos/upload")
suspend fun uploadPhoto(
    @Part file: MultipartBody.Part,
    @Part("ascentId") ascentId: RequestBody,
): PhotoResponse
// Usage:
val photo = api.uploadPhoto(filePart, ascentIdBody).photo
```

#### 4. `Peak` model needs `= 0.0` defaults for lat/lon

The `createAscent` and `uploadPhoto` responses do NOT include `latitude`/`longitude` on the nested `Peak`. Without defaults the deserialization crashes.

```kotlin
@Serializable
data class Peak(
    val id: String,
    val name: String,
    val altitudeM: Int,
    val latitude: Double = 0.0,   // absent in create/upload responses
    val longitude: Double = 0.0,  // absent in create/upload responses
    // ... other fields with defaults
)
```

#### 5. `submit()` sequence — always in this order

**Signature (updated 2026-05-25):** `onSuccess` now carries a `taggingWarning: String?` for blocked tags.

```kotlin
fun submit(onSuccess: (ascentId: String, taggingWarning: String?) -> Unit) {
    val s = _state.value
    if (s.selectedPeak == null) { error("Selecciona una cima"); return }
    val bitmap = s.croppedBitmap ?: run { error("La foto es obligatoria"); return }
    viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        try {
            // 1 — Create ascent record
            val ascent = api.createAscent(CreateAscentRequest(
                peakId      = s.selectedPeak.id,
                date        = s.date,
                route       = s.route.ifBlank { null },
                description = s.notes.ifBlank { null },
            )).ascent

            // 2 — Upload photo
            val jpegBytes = withContext(Dispatchers.IO) { compressBitmap(bitmap) }
            val filePart  = MultipartBody.Part.createFormData(
                "file", "photo.jpg",
                jpegBytes.toRequestBody("image/jpeg".toMediaType()),
            )
            val photo = api.uploadPhoto(filePart, ascent.id.toRequestBody("text/plain".toMediaType())).photo

            // 3 — Tag persons: skip unlinked (no userId), surface 403 allowOthersToTag blocks
            val blockedNames = mutableListOf<String>()
            for (person in s.selectedPersons) {
                val uid = person.userId ?: continue   // unlinked person — skip silently
                runCatching {
                    api.addPhotoPerson(photo.id, mapOf("userId" to uid))
                }.onFailure { e ->
                    if (e is HttpException && e.code() == 403) blockedNames.add(person.name)
                }
            }

            val warning = if (blockedNames.isNotEmpty())
                blockedNames.joinToString(", ") + " no permite que le etiqueten"
            else null

            _state.update { it.copy(isLoading = false) }
            onSuccess(ascent.id, warning)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            _state.update { it.copy(isLoading = false, error = "Error al guardar: ${e.localizedMessage}") }
        }
    }
}
```

---

### CancellationException — MUST re-throw

In every `suspend fun` that catches `Exception`, always add this **before** the generic catch:

```kotlin
} catch (e: CancellationException) {
    throw e   // never swallow — structured concurrency requires it
} catch (e: HttpException) {
    ...
} catch (e: IOException) {
    ...
} catch (e: Exception) {
    ...
}
```

Swallowing `CancellationException` causes a brief error state flash when the ViewModel cancels an in-flight job on navigation (e.g. `vm.refresh()` in `refreshTrigger LaunchedEffect` cancels the previous `load()` job — without this fix, the Logbook briefly shows "Error inesperado" for ~100ms before the success response arrives).

---

### Post-creation UX — MainScaffold state machine

After `onSuccess(ascentId)` fires from `NewAscentSheet`, `MainScaffold` must:
1. Store the new ascent ID for highlighting
2. Increment a trigger counter to force a data reload
3. Navigate to Logbook with `restoreState = false` so a fresh ViewModel is created

```kotlin
// MainScaffold.kt — state vars:
var logbookRefreshTrigger by remember { mutableIntStateOf(0) }
var logbookHighlightId    by remember { mutableStateOf<String?>(null) }
var atlasRefreshTrigger   by remember { mutableIntStateOf(0) }   // reloads climbedByPeakId after new ascent

// MainScaffold.kt also has: val snackbarHostState = remember { SnackbarHostState() }
//                            val scope = rememberCoroutineScope()
// and Scaffold has: snackbarHost = { SnackbarHost(snackbarHostState) }

// NewAscentSheet onSuccess (signature updated 2026-05-25 to carry taggingWarning):
onSuccess = { ascentId, taggingWarning ->
    showNewAscent      = false
    logbookHighlightId = ascentId
    logbookRefreshTrigger++
    atlasRefreshTrigger++   // reload Atlas climbedByPeakId so new ascent appears on map
    tabNavController.navigate(Screen.Logbook.route) {
        popUpTo(Screen.Home.route) { saveState = true }
        launchSingleTop = true
        restoreState    = false   // CRITICAL: force fresh ViewModel so LaunchedEffect fires
    }
    if (taggingWarning != null) {
        scope.launch { snackbarHostState.showSnackbar(taggingWarning) }
    }
},

// LogbookScreen composable:
composable(Screen.Logbook.route) {
    LogbookScreen(
        ...
        refreshTrigger      = logbookRefreshTrigger,
        highlightId         = logbookHighlightId,
        onHighlightConsumed = { logbookHighlightId = null },
    )
}
```

`restoreState = false` is critical: with `restoreState = true` the existing ViewModel is reused and `LaunchedEffect(refreshTrigger)` doesn't fire because the trigger value is the same as when the screen was last shown.

---

### Post-creation UX — LogbookScreen scroll-to-new-ascent

**Two separate problems to solve:**

**Problem 1: `snapshotFlow { filteredAscents }` fires before Compose recomposes.**  
At the instant the StateFlow changes, `LazyColumn` hasn't been placed in the composition tree yet. `animateScrollToItem` is silently a no-op on an unattached `LazyListState`. The correct wait is on the layout info.

**Problem 2: New ascent is NOT always at index 0.**  
Server canonical sort: unseen friends first (by altitude desc), then own + seen friends (by date desc). After switching to Mine filter, own ascents preserve this order — the new ascent may be at index 5, 10, or any position.

```kotlin
// LogbookScreen.kt — hoist listState so LaunchedEffect can scroll it:
val listState = rememberLazyListState()

LaunchedEffect(refreshTrigger) {
    if (refreshTrigger > 0) {
        vm.setViewFilter(ViewFilter.Mine)  // switch to "Mine" after creation
        vm.refresh()                        // reload without showing spinner

        // Wait until LazyColumn has completed its first layout pass.
        // animateScrollToItem is a silent no-op until totalItemsCount > 0.
        withTimeoutOrNull(10_000L) {
            snapshotFlow { listState.layoutInfo.totalItemsCount }
                .filter { it > 0 }
                .first()
        } ?: return@LaunchedEffect   // network error — give up silently

        // Find the exact index of the new ascent — NOT always 0!
        val targetIdx = filteredAscents.indexOfFirst { it.id == highlightId }
            .takeIf { it >= 0 } ?: 0
        listState.animateScrollToItem(targetIdx)
    }
}

// Pass listState down to LazyColumn:
LogbookList(
    ...,
    listState           = listState,
    highlightId         = highlightId,
    onHighlightConsumed = onHighlightConsumed,
)
```

**Required imports in LogbookScreen.kt:**
```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
// snapshotFlow comes from androidx.compose.runtime.*
// border comes from androidx.compose.foundation.border
```

---

### Ring highlight effect — matches web exactly

Web uses `boxShadow: "0 0 0 3px #0ea5e9, 0 4px 24px rgba(14,165,233,0.35)"` for 2500ms then removes it.

Android equivalent: sky-blue 3dp border that **snaps in instantly** then **fades out over 400ms** after `onHighlightConsumed` sets `isHighlighted = false`.

```kotlin
// In LogbookList:
LaunchedEffect(highlightId) {
    if (highlightId != null) {
        delay(2_500L)
        onHighlightConsumed()   // triggers ring fade-out
    }
}

// In AscentFlipCard:
val ringAlpha by animateFloatAsState(
    targetValue   = if (isHighlighted) 1f else 0f,
    animationSpec = tween(durationMillis = if (isHighlighted) 0 else 400),  // snap in, fade out
    label         = "highlight_ring",
)

Box(
    modifier = Modifier
        .fillMaxWidth()
        .shadow(elevation = 8.dp, shape = RoundedCornerShape(28.dp), clip = false, ...)
        .then(
            if (ringAlpha > 0f) Modifier.border(
                width = 3.dp,
                color = Color(0xFF0EA5E9).copy(alpha = ringAlpha),
                shape = RoundedCornerShape(28.dp),
            ) else Modifier
        ),
) { ... }
```

Color `#0EA5E9` = sky-500. Duration: visible 2500ms (in `LogbookList`), fade 400ms (in `animateFloatAsState`).

---

### ViewModel — `refresh()` vs `load()`

- **`load()`**: sets `_uiState = Loading` first → shows skeleton. Used on init + retry.
- **`refresh()`**: sets `_isRefreshing = true` → shows pull-to-refresh spinner but keeps existing content visible. Used after creating an ascent so the user sees the list immediately while it refreshes.

After creating an ascent, always call `vm.refresh()` (not `vm.load()`) — keeps the list visible during the reload so the scroll + highlight happen into an already-rendered list.

---

### Backward compatibility — Atlas → Logbook peak filter

The `initialPeakId` path is independent of `refreshTrigger` and is handled by its own `LaunchedEffect`:

```kotlin
LaunchedEffect(initialPeakId) {
    if (initialPeakId != null) {
        vm.setPeakFilter(initialPeakId, initialPeakName)
        onPeakIdConsumed()
    }
}
```

This fires on initial composition (when navigating from Atlas) and is unaffected by the `refreshTrigger` changes. Both flows can coexist safely.

---

### Summary of gotchas to never repeat

| Gotcha | Fix |
|---|---|
| `Map<String, String?>` in `@Body` | Use typed `@Serializable data class` |
| `createAscent` returns bare `Ascent` | Wrap in `AscentResponse(val ascent: Ascent)`, call `.ascent` |
| `uploadPhoto` returns bare `Photo` | Wrap in `PhotoResponse(val photo: Photo)`, call `.photo` |
| `Peak` missing `lat`/`lon` in response | Add `= 0.0` defaults to both fields |
| `CancellationException` swallowed | Add `catch (e: CancellationException) { throw e }` first |
| Scroll to index 0 after creation | Use `filteredAscents.indexOfFirst { it.id == highlightId }` |
| `snapshotFlow { stateFlow }` race | Wait on `listState.layoutInfo.totalItemsCount > 0` instead |
| `restoreState = true` on Logbook nav | Must be `false` after creation to force fresh ViewModel |
| `vm.load()` after creation | Use `vm.refresh()` to keep list visible during reload |
| Ring border on every recompose | Gate with `if (ringAlpha > 0f)` to avoid unnecessary `Modifier.border` |

---

Keep these in mind but do not over-engineer for them in the MVP:

- **Email verification**: send verification link on register, block or warn until verified
- **Friend system**: User search, friend requests, accepted friends feed — core friendship flow is complete. Pending: auto-link Person when invitee registers with invitation voucher
- **Challenges**: Time-limited goals (e.g., "Climb 3 peaks this month") to drive retention
- **Collections / Lists**: Curated peak lists (e.g., "100 Pyrenean 3000ers") a user can work through
- **Notifications**: Friend activity alerts, milestone celebrations
- **Explore evolution**: Filter peaks by range, altitude, country; suggested peaks based on history
- **Profile page**: Public-facing summary of a user's ascents and stats
- **Per-tenant DBs**: `Tenant.dbUrl` is already wired; migration path exists when needed

---

## Map Search — Geocoding (Nominatim)

Implemented 2026-05-25. The map search now resolves both peak names **and** city/town/place names.

### Architecture

- **Server-side geocoding**: both `GET /api/peaks?q=` (web) and `GET /api/v1/peaks?q=` (mobile) call [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) in parallel with the DB query using `Promise.all`.
- **Response shape** (search only): `{ peaks: Peak[], places: GeocodedPlace[] }`. Viewport queries (no `?q=`) are unchanged — they still return `Peak[]` (web) / `{ peaks }` (v1).
- **No API key required**. Nominatim is free and open. The `User-Agent: Peakadex/1.0 (noreply@peakadex.com)` header is required by OSM's usage policy.
- **Timeout**: 3 seconds (`AbortSignal.timeout(3000)`). If Nominatim is slow or down, `places` returns `[]` silently — peak search still works.
- **Filter**: only `class: "place"` or `class: "boundary"` results are kept (cities, towns, villages, municipalities, regions). Streets, buildings, POIs are excluded.
- **Language**: `accept-language: ca,es,en` — prefers Catalan/Spanish names.

### `GeocodedPlace` type

```typescript
// TypeScript (MapView.tsx)
export type GeocodedPlace = { name: string; lat: number; lon: number };

// Kotlin (Models.kt)
@Serializable
data class GeocodedPlace(val name: String, val lat: Double, val lon: Double)
```

### UX behaviour

- Place results appear below peak results, separated by a "LUGARES" / "Lugares" label.
- Tapping a place flies the map camera to `[lon, lat]` at zoom 12. **No peak detail sheet opens** — only camera movement.
- Tapping a peak works exactly as before (opens PeakDetailSheet on Android, selects peak on web).
- If both peaks and places are empty → "Sin resultados".

### Files changed

| File | Change |
|---|---|
| `app/api/peaks/route.ts` | Nominatim call + `{ peaks, places }` response for `?q=` |
| `app/api/v1/peaks/route.ts` | Same for mobile API |
| `components/map/MapView.tsx` | `GeocodedPlace` type, `placeResults` state, dropdown section |
| `components/map/MapPeaksSidebar.tsx` | `placeResults` + `onSelectPlace` props, sidebar section |
| `mobile/android/.../Models.kt` | `GeocodedPlace` data class, `PeaksResponse.places` field |
| `mobile/android/.../AtlasViewModel.kt` | `placeResults` in state, `onPlaceSelected()` |
| `mobile/android/.../AtlasScreen.kt` | `SearchResultsList` shows places section |

### Known gotchas

- **`PeaksResponse.places` has default `emptyList()`**: backward compatible — viewport responses don't include `places` in the JSON, Kotlinx uses the default.
- **Web viewport query response unchanged**: `GET /api/peaks?north=...` still returns a plain `MapPeak[]`. Only the `?q=` path returns `{ peaks, places }`. The consumer at `MapView.tsx:336` (`data: MapPeak[] = await res.json()`) is untouched.
- **Nominatim `display_name` is verbose**: returns the full OSM name like "Berga, Berguedà, Catalunya, España". The UI truncates with CSS `text-overflow: ellipsis`. No server-side truncation.
- **Rate limiting**: Nominatim asks for max 1 req/sec. The 300ms debounce on the client means this is respected under normal usage. Do not remove the debounce.

---

## Android App — Settings Screen (Fase 7 parcial)

**Files:**
- `feature/settings/SettingsScreen.kt` — full UI
- `feature/settings/SettingsViewModel.kt` — state + API calls
- `res/values/strings.xml` + `res/values-{en,ca,de,fr}/strings.xml` — all i18n strings
- `res/drawable/flag_{es,en,ca,de,fr}.xml` — flag VectorDrawables (converted from `/public/flags/` SVGs)

---

### Section order (LazyColumn, top to bottom)

1. Profile header (avatar + name + email)
2. **IDIOMA** — clickable row → `LanguagePickerSheet` (ModalBottomSheet)
3. **CUENTA** — name, username, email (read-only)
4. **CUENTAS CONECTADAS** — Google row with real multicolor logo
5. **SEGURIDAD** — expandable password change + Google active chip
6. **PRIVACIDAD** — `appearInSearch` + `allowOthersToTag` toggles
7. **NOTIFICACIONES** — `emailNotifications` + `activityNotifications` toggles
8. **ZONA DE PELIGRO** — logout button

`LanguagePickerSheet` and `AlertDialog` (unlink confirm) are rendered **before** the `Scaffold` block — never inside `LazyColumn`.

---

### ViewModel: `AndroidViewModel(app: Application)`

Must extend `AndroidViewModel`, not `ViewModel`, to access `LocaleManager` via `getApplication<Application>().getSystemService(LocaleManager::class.java)`.

**Language change logic:**
- API ≥ 33 (`TIRAMISU`): `LocaleManager.setApplicationLocales(LocaleList.forLanguageTags(locale))` → Activity recreates automatically. No snackbar shown.
- API < 33: saves to server only + shows "Idioma guardado" snackbar. App language does not change at runtime.
- `languageSaved = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU`

**Each privacy/notification toggle** fires an immediate `PATCH /api/v1/settings` — no "Save" button.

---

### Flag VectorDrawables

Converted 1:1 from `/public/flags/{es,en,ca,fr,de}.svg`. All use `android:width="30dp" android:height="20dp" viewportWidth="90" viewportHeight="60"`.

For Union Jack diagonal strokes: `android:fillColor="#00000000"` + `android:strokeColor` + `android:strokeWidth` (stroke-only paths).

```kotlin
private data class LangOption(val code: String, val nameRes: Int, val flagRes: Int)

private val LANGUAGE_OPTIONS = listOf(
    LangOption("es", R.string.settings_lang_es, R.drawable.flag_es),
    LangOption("en", R.string.settings_lang_en, R.drawable.flag_en),
    LangOption("ca", R.string.settings_lang_ca, R.drawable.flag_ca),
    LangOption("de", R.string.settings_lang_de, R.drawable.flag_de),
    LangOption("fr", R.string.settings_lang_fr, R.drawable.flag_fr),
)
```

**Rendering flags: use `Image`, never `Icon`.**
```kotlin
Image(
    painter     = painterResource(lang.flagRes),
    contentDescription = null,
    contentScale = ContentScale.Crop,
    modifier     = Modifier.width(40.dp).height(27.dp).clip(RoundedCornerShape(4.dp)),
)
```
`Icon` applies the Material3 theme tint and destroys flag colors. `Image` renders them as-is.

---

### Google connected account section

**`GoogleIcon`** — inline `ImageVector` with 4 colored paths (blue/green/yellow/red). **Always `tint = Color.Unspecified`** — Material3 would override the individual path colors otherwise.

**Show/hide logic:**
- `OutlinedButton("Desvincular")`: only when `googleLinked && hasPassword`
- Amber warning text: only when `googleLinked && !hasPassword` (can't unlink without a password)
- Green chip in SEGURIDAD: only when `googleLinked`

```kotlin
// Green chip (inside SEGURIDAD card):
Row(modifier = Modifier.clip(RoundedCornerShape(20.dp)).background(Color(0xFFDCFCE7))
    .padding(horizontal = 12.dp, vertical = 5.dp)) {
    Icon(GoogleIcon, tint = Color.Unspecified, modifier = Modifier.size(14.dp))
    Text(stringResource(R.string.settings_google_active_hint), color = Color(0xFF15803D))

All 4 flags live on `User` in Prisma (`@default(true)` each).

| Flag | Where enforced server-side |
|---|---|
| `appearInSearch` | `lib/services/user-search.service.ts` — `WHERE appearInSearch: true` on every user search |
| `allowOthersToTag` | `lib/services/face-detection.service.ts` → `setFaceTag()` returns `null` + HTTP 403 |
| `emailNotifications` | Master kill-switch for ALL emails — friend requests AND photo tags (fix 2026-05-25) |
| `activityNotifications` | Photo-tag emails: `activityNotifications && emailNotifications` (fix 2026-05-25) |

**Fix 2026-05-25** — `emailNotifications` as master kill-switch (was only applied to friend-request emails, photo-tag emails ignored it):
```typescript
// In all 3 tag email routes:
select: { email: true, activityNotifications: true, emailNotifications: true, language: true }
if (u?.activityNotifications && u.emailNotifications) { sendPhotoTagEmail(...) }
```
Files fixed: `app/api/v1/photos/[id]/persons/route.ts`, `app/api/face-detections/[id]/tag/route.ts`, `app/api/photos/[id]/faces/route.ts`.

**Fix 2026-05-25** — `allowOthersToTag` UX feedback in Android (previously silent 403):
- See `submit()` section in "New Ascent Flow" — `onSuccess` now passes `taggingWarning: String?`
- `MainScaffold` shows a `SnackbarHost` snackbar with blocked person names

---

### Settings screen gotchas

- **`LanguagePickerSheet` and `AlertDialog` outside `Scaffold`**: render before `Scaffold { }`, not inside the `LazyColumn`.
- **`tint = Color.Unspecified` on `GoogleIcon`**: mandatory. Applies to both the 24dp icon in CUENTAS CONECTADAS and the 14dp icon in the green SEGURIDAD chip.
- **`Image` not `Icon` for flags**: `Icon` applies Material3 tint, destroying flag colors.
- **`BorderStroke` import**: `import androidx.compose.foundation.BorderStroke` — needed for the `OutlinedButton` border.
- **`languageSaved` flag only true on API < 33**: on API ≥ 33 `LocaleManager` recreates the Activity; showing a snackbar is unnecessary and would never appear.
- **`person.userId == null` in tag loop**: skip silently — only registered+linked users can be tagged via API. A 400 from the server is expected for unlinked persons and should not surface as an error to the user.

---

## Android App — Fase 6: UI/UX Polish (2026-05-26)

### Bottom tab order

**Final order (left → right):** Home · Bitácora · Atlas · Cards

```kotlin
// MainScaffold.kt — tabItems()
TabItem(Screen.Home,    R.string.nav_tab_home,    R.drawable.ic_tab_home),
TabItem(Screen.Logbook, R.string.nav_tab_logbook, R.drawable.ic_tab_logbook),
TabItem(Screen.Map,     R.string.nav_tab_map,     R.drawable.ic_tab_map),
TabItem(Screen.Cards,   R.string.nav_tab_cards,   R.drawable.ic_tab_cards),
```

### Active tab indicator (redesign 2026-05-28)

The M3 solid pill (`primaryContainer`) was replaced with a **subtle radial glow** — lighter, more premium, less Material-ish.

**Implementation in `MainScaffold.kt` → `MainTabBar`:**
- `indicatorColor = Color.Transparent` — eliminates the M3 pill entirely
- The icon is wrapped in a `Box(size=40dp)`. When selected, a 38dp `Box` with `Brush.radialGradient([PeakBlueActive.copy(alpha=0.13f), Transparent])` + `CircleShape` background is drawn behind the icon
- Inactive icon alpha: `0.40f` (was 0.45f)
- Label color unchanged: active = `PeakBlueActive`, inactive = `onSurfaceVariant`

```kotlin
icon = {
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(40.dp)) {
        if (selected) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(PeakBlueActive.copy(alpha = 0.13f), Color.Transparent),
                        ),
                        shape = CircleShape,
                    ),
            )
        }
        Icon(painter = painterResource(tab.iconRes), tint = Color.Unspecified,
             modifier = Modifier.size(24.dp).alpha(if (selected) 1f else 0.40f))
    }
}
```

---

### ProfileSummaryScreen — secondary screen top bar

`ProfileSummaryScreen` (opened from avatar dropdown in Home) is a **secondary screen**, not a root tab destination.

- Uses `CenterAlignedTopAppBar` with `navigationIcon` back arrow (chevron-left `BackIcon`) + `Text("Perfil")` title.
- **No `PeakadexLogo`** — logo is only for root tab screens (Home, Bitácora, Atlas, Cards). Secondary screens (Profile, Settings, AscentDetail) always use text titles + back arrow. This matches `SettingsScreen` pattern exactly.
- `containerColor = Color.White`, `titleContentColor = Color.Unspecified`, followed by a `HorizontalDivider`.
- `BackIcon`: chevron-left path — `moveTo(15f,18f); lineTo(9f,12f); lineTo(15f,6f)`, stroke only, round cap.

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSummaryScreen(onBack: () -> Unit, onNavigateToSettings: () -> Unit, ...) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title          = { Text("Perfil", fontSize = 17.sp, fontWeight = FontWeight.SemiBold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(BackIcon, "Volver") } },
                colors         = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.White),
            )
            HorizontalDivider(thickness = 1.dp, color = Color.Black.copy(alpha = 0.07f))
        },
        containerColor = PeakBackground,
    ) { ... }
}
```

---

### ProfileScreen (Bitácora tab) — no ProfileHeader

`ProfileScreen` (the Bitácora root tab) starts **directly** with `SecondaryTabRow` (Cimas / Fotos / Etiquetado). There is no `ProfileHeader` rendered above the tabs on this screen — the header only appears in `ProfileSummaryScreen`.

```kotlin
@Composable
fun ProfileScreen(
    onNavigateToSettings: () -> Unit,
    onNavigateToLogbook: (peakId: String, peakName: String) -> Unit,
    onAscentClick: (ascentId: String, isOwn: Boolean) -> Unit,
    vm: ProfileViewModel = viewModel(),
)
```

**Tab content callbacks:**
- Tab 0 (Cimas): `PeaksTab` → `onNavigateToLogbook(peak.id, peak.name)` on row tap
- Tab 1 (Fotos): `PhotosTab` → `onAscentClick(ascentId, true)` (own photos)
- Tab 2 (Etiquetado): `PhotosTab(showCreator = true)` → `onAscentClick(ascentId, false)` (others' photos)

The `isOwn` boolean is added **at the `ProfileContent` level** where the tab type is known, not inside `PhotosTab`/`PhotoTile`.

#### PhotoTile — rarity badge (Fotos + Etiquetado tabs)

Each photo tile in the 3-column grid shows a **rarity flower badge** at the top-left corner, matching the web `PhotosTabV2` implementation:

- **Position**: `Alignment.TopStart`, offset `x=5.dp, y=5.dp`
- **Container**: 22dp circle, `Color.White.copy(alpha = 0.95f)` background
- **Content**: `"✿"` text, `fontSize = 13.sp`, `lineHeight = 13.sp`, color = `rarityColor` (parsed from `rarity.color` hex)
- **Fallback**: `PeakClimbedGreen` when `rarityId` is null or parse fails

The old bottom-right 8dp dot was replaced by this badge. Both Fotos and Etiquetado tabs share the same `PhotoTile` composable — the badge renders in all cases.

**Web equivalent** (`components/profile/PhotosTabV2.tsx`): `position: absolute; top: 5; left: 5; width: 20; height: 20; borderRadius: 50%; background: rgba(255,255,255,0.95)` wrapping a `<RarityFlower id={photo.rarityId} size={14} />`.

#### PeakRowCard — repeat count pill (Cimas tab)

When `peak.count > 1`, a styled pill appears to the right of the peak name in the header row:

- **Container**: `RoundedCornerShape(6.dp)`, `rarityColor.copy(alpha = 0.13f)` background, `rarityColor.copy(alpha = 0.30f)` border (1dp)
- **Content**: `"×${peak.count}"` text, `fontSize = 10.sp`, `FontWeight.Bold`, color = `rarityColorDark`
- Single ascents (count = 1) show nothing — same as web.

**Web equivalent** (`components/profile/CaptureStack.tsx`): stacked-squares badge for count > 1, `null` for count ≤ 1. The `×1` plain-text case was removed from web to match (returns `null` when `count <= 1`).

---

### Navigation from Bitácora tabs → Cards

All three Bitácora tabs navigate to the Cards screen (never to `AscentDetailScreen`).

**Why not AscentDetailScreen for Tags?** The v1 ascent detail endpoint only returns data for ascents owned by the requesting user — calling it with another user's `ascentId` returns 404.

**Cimas tap** → Cards filtered by that peak. Reuses the existing Atlas→Logbook `pendingPeakId`/`pendingPeakName` infrastructure:

```kotlin
// MainScaffold.kt — Screen.Logbook.route composable
onNavigateToLogbook = { peakId, peakName ->
    pendingPeakId   = peakId
    pendingPeakName = peakName
    tabNavController.navigate(Screen.Cards.route) {
        popUpTo(Screen.Home.route) { saveState = true }
        launchSingleTop = true
        restoreState    = false   // force fresh ViewModel
    }
},
```

**Fotos tap (own ascent)** → Cards with Mine filter + highlight + scroll:

```kotlin
onAscentClick = { ascentId, isOwn ->
    logbookHighlightId = ascentId
    if (isOwn) logbookRefreshTrigger++   // triggers setViewFilter(Mine) + refresh + scroll
    tabNavController.navigate(Screen.Cards.route) {
        popUpTo(Screen.Home.route) { saveState = true }
        launchSingleTop = true
        restoreState    = false
    }
},
```

**Tags tap (others' ascent)** → Cards (Friends filter, best-effort highlight ring — no guaranteed scroll since friends' ascents aren't at top):
- Same navigation call as above but `isOwn = false` → `logbookRefreshTrigger` is NOT incremented → no Mine filter switch, no refresh.
- `logbookHighlightId` is still set → ring will show if the ascent happens to be visible.

---

### Cards screen — simplified filter (SecondaryTabRow)

Removed: search bar, filter button, active chips row, full filter bottom sheet.

Filter: `SecondaryTabRow` (M3) with two `Tab` items — replaces the previous `SingleChoiceSegmentedButtonRow` (was ~60dp, new tabs are 48dp flat, no padding).

| Tab index | Label | Filter | Sort |
|---|---|---|---|
| 0 | "Mis Cards" | `ViewFilter.Mine` | date desc |
| 1 | "Mi Cordada" | `ViewFilter.Friends` | canonical unseen-first algorithm |

**"Mi Cordada" never shows own cards** — `ViewFilter.Friends` filters `isOwn == false`.

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QuickFilterBar(viewFilter: ViewFilter, onViewFilterChange: (ViewFilter) -> Unit) {
    val selectedIndex = if (viewFilter == ViewFilter.Mine) 0 else 1
    SecondaryTabRow(
        selectedTabIndex = selectedIndex,
        containerColor   = Color.White,
        contentColor     = PeakBlueActive,
        modifier         = Modifier.fillMaxWidth(),
    ) {
        Tab(
            selected = selectedIndex == 0,
            onClick  = { onViewFilterChange(ViewFilter.Mine) },
            text     = {
                Text(
                    stringResource(R.string.logbook_filter_mine),
                    fontSize   = 13.sp,
                    fontWeight = if (selectedIndex == 0) FontWeight.SemiBold else FontWeight.Normal,
                    color      = if (selectedIndex == 0) PeakBlueActive else PeakMuted,
                )
            },
        )
        Tab(
            selected = selectedIndex == 1,
            onClick  = { onViewFilterChange(ViewFilter.Friends) },
            text     = {
                Text(
                    stringResource(R.string.logbook_filter_friends),
                    fontSize   = 13.sp,
                    fontWeight = if (selectedIndex == 1) FontWeight.SemiBold else FontWeight.Normal,
                    color      = if (selectedIndex == 1) PeakBlueActive else PeakMuted,
                )
            },
        )
    }
}
```

**Peak filter chip** — shown only when navigating from Atlas (or Cimas tab):

```kotlin
@Composable
private fun PeakFilterChip(peakName: String, onDismiss: () -> Unit) {
    Row(modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 6.dp)) {
        InputChip(
            selected     = true,
            onClick      = onDismiss,
            label        = { Text("🏔 $peakName", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
            trailingIcon = { Icon(CloseSmallIcon, "Quitar filtro", Modifier.size(14.dp), tint = Color(0xFF0369A1)) },
            colors       = InputChipDefaults.inputChipColors(selectedContainerColor = Color(0xFFF0F9FF), selectedLabelColor = Color(0xFF0369A1)),
            border       = InputChipDefaults.inputChipBorder(enabled = true, selected = true, selectedBorderColor = Color(0xFF7DD3FC), selectedBorderWidth = 1.dp),
        )
    }
}
```

Rendered conditionally: `if (filters.peakId != null) PeakFilterChip(peakName = filters.peakName ?: filters.peakId ?: "", ...)`.

---

### Known gotchas (Fase 6)

- **`filters.peakName ?: filters.peakId` is `String?`**: both fields are nullable. The `PeakFilterChip` composable takes a non-nullable `String`. Always add `?: ""` as a final fallback: `filters.peakName ?: filters.peakId ?: ""`. The `if (filters.peakId != null)` guard above guarantees the chip only renders when there is a value, so the empty string fallback is never actually displayed.
- **`@OptIn(ExperimentalMaterial3Api::class)` required**: add to any composable that uses `CenterAlignedTopAppBar`, `SecondaryTabRow`, `Tab`, `InputChip`, or `PullToRefreshBox`.
- **Root vs secondary top bars**: Root tabs (Home, Bitácora, Atlas, Cards) → `CenterAlignedTopAppBar` with logo + avatar. Secondary screens (Profile, Settings, AscentDetail) → `CenterAlignedTopAppBar` with text title + back arrow. Never use the logo on secondary screens.
- **`restoreState = false` when navigating to Cards from Bitácora**: required so the ViewModel is recreated and `LaunchedEffect(refreshTrigger)` fires. With `restoreState = true` the existing ViewModel is reused and the trigger value hasn't changed — scroll/highlight won't fire.

---

## Android App — Polish 2026-05-29

### Bottom navigation bar — hide on scroll

The bottom nav bar hides when scrolling down and reappears when scrolling up on all tabs **except Atlas** (MapLibre `AndroidView` does not dispatch Compose nestedScroll events, so the bar never hides on the map).

**Implementation in `MainScaffold.kt`:**

```kotlin
var isBottomBarVisible by remember { mutableStateOf(true) }

val hideOnScrollConnection = remember {
    object : NestedScrollConnection {
        override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
            when {
                available.y < -3f -> isBottomBarVisible = false  // scrolling down → hide
                available.y >  3f -> isBottomBarVisible = true   // scrolling up → show
            }
            return Offset.Zero  // observe only — don't consume
        }
    }
}

// Always show bar when switching tabs
LaunchedEffect(currentRoute) { isBottomBarVisible = true }

Scaffold(
    modifier  = Modifier.nestedScroll(hideOnScrollConnection),
    bottomBar = {
        AnimatedVisibility(
            visible = isBottomBarVisible,
            enter   = slideInVertically(animationSpec = tween(220), initialOffsetY = { it }),
            exit    = slideOutVertically(animationSpec = tween(220), targetOffsetY = { it }),
        ) {
            MainTabBar(...)
        }
    },
)
```

**Key rules:**
- `available.y < 0` = user scrolling DOWN (reading more content) → hide
- `available.y > 0` = user scrolling UP (back to top) → show
- Threshold of ±3f avoids toggling on micro-jitter
- `LaunchedEffect(currentRoute)` resets to visible on every tab change — bar is always visible when the user navigates
- `AnimatedVisibility` with `slideInVertically`/`slideOutVertically` is the correct pattern — it affects layout so `innerPadding` adjusts and the content actually gains space when the bar hides
- **Do NOT use `NavigationBarDefaults.exitAlwaysScrollBehavior()`** — it is experimental and `NavigationBar` does not have a `scrollBehavior` parameter in the current M3 version used by this project. The `AnimatedVisibility` approach is stable and correct.

---

### Android launcher icon (2026-05-29)

**Source:** `res/drawable/ic_peakadex.png` (295×299px, green mountain inside green circle, transparent bg)

**File structure:**

```
mipmap-anydpi-v26/
  ic_launcher.xml        ← adaptive icon: white bg + ic_launcher_foreground
  ic_launcher_round.xml  ← same (round launchers)
mipmap-mdpi/    ic_launcher.png + ic_launcher_round.png   (48×48)
mipmap-hdpi/    ic_launcher.png + ic_launcher_round.png   (72×72)
mipmap-xhdpi/   ic_launcher.png + ic_launcher_round.png   (96×96)
mipmap-xxhdpi/  ic_launcher.png + ic_launcher_round.png   (144×144)
mipmap-xxxhdpi/ ic_launcher.png + ic_launcher_round.png   (192×192)
drawable/ic_launcher_foreground.xml   ← <inset android:inset="14%"/>
values/colors.xml                     ← ic_launcher_background = #FFFFFF
```

**Adaptive icon design:** white `#FFFFFF` background + the PNG centered with 14% inset on all sides. The 14% inset keeps the green circle safely within the 72dp safe zone of the 108dp adaptive canvas. Manifest sets `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"`.

**Android 12+ (Material You):** the system may tint the icon with the user's wallpaper color. Android 8–11: white square clipped to launcher shape. Android < 8: raw PNG with transparent background.

---

### Auth gate loading screen — SplashScreen.kt (2026-05-29)

**File:** `mobile/android/app/src/main/java/com/peakadex/app/feature/splash/SplashScreen.kt`

The animated flower/rarity cycle was replaced with a clean white screen + centered wordmark. This is the screen shown while the app checks for an active auth session (not the OS-level splash screen).

```kotlin
@Composable
fun SplashScreen(isAuthenticated: Boolean, onReady: (authenticated: Boolean) -> Unit) {
    LaunchedEffect(Unit) {
        delay(1_000L)
        onReady(isAuthenticated)
    }
    Box(
        modifier         = Modifier.fillMaxSize().background(Color.White),
        contentAlignment = Alignment.Center,
    ) {
        PeakadexLogo(height = 44.dp)
    }
}
```

- `MIN_SHOW_MS` reduced from 1500ms to 1000ms — no animation to watch, so shorter wait is fine
- White background creates a seamless transition: OS splash (white + icon) → this screen (white + wordmark) → app
- Logo at 44dp — slightly larger than the top bar (32dp) to breathe in full-screen context

---

## Android App — Login Screen (rediseño 2026-05-27)

**File:** `mobile/android/app/src/main/java/com/peakadex/app/feature/auth/LoginScreen.kt`
**Asset:** `mobile/android/app/src/main/res/drawable/login_cards_preview.png` (fan de 3 cartas coleccionables, 1038×918 px)

This is a **complete, shipped screen**. Follow this spec exactly — do not revert to a plain form layout.

---

### Visual goal

Premium / emotional / collectible — matches the landing page tone. The screen should feel like opening a collectible cards app, not a generic login form.

---

### Design tokens (private to LoginScreen.kt)

```kotlin
private val LoginBg        = Color(0xFFF2F5F8)   // warm neutral bg
private val CardShape      = RoundedCornerShape(24.dp)
private val ButtonShape    = RoundedCornerShape(16.dp)
private val ColorBorder    = Color(0xFFE5E7EB)
private val ColorRed       = Color(0xFFDC2626)
private val ColorRedBg     = Color(0xFFFEF2F2)
private val ColorRedBorder = Color(0xFFFECACA)
private val TaglineGold    = Color(0xFFF5C842)   // --ld-gold from landing page CSS
```

Shared theme tokens also used: `PeakNavyDark`, `PeakNavyMid`, `PeakNavyLight`, `PeakGreenCTA`.

---

### Layout — single scrollable Column (canonical Compose pattern)

```
statusBarsPadding → Spacer(24dp) → PeakadexLogo(46dp) → Spacer(20dp)
→ Card(elevation=10dp, shape=24dp, white) { form }
→ Spacer(20dp)
→ Image(login_cards_preview, fillMaxWidth(0.70f), FillWidth)
→ Spacer(16dp)
→ Text(tagline, navy+gold, 20sp SemiBold, centered)
→ Spacer(navigationBarsPadding) → Spacer(16dp)
```

**Do NOT use a Box with fixed-position image at the bottom** — single Column is correct.

---

### Card form internals (top → bottom)

1. **"¿No tienes cuenta? Créala"** — `Row + Modifier.heightIn(min=48.dp) + .clickable(onNavigateToRegister)` with `Spacer(4.dp)` between the two Text composables; 14sp
2. `Spacer(16dp)`
3. Email `PeakTextField` (KeyboardType.Email, ImeAction.Next)
4. `Spacer(10dp)`
5. Password `PeakTextField` with show/hide `IconButton` (EyeIcon / EyeOffIcon)
6. Forgot password `TextButton` (default Material padding, right-aligned in `Box(fillMaxWidth)`)
7. Error pill — red `Surface` with `BorderStroke`, only when `errorMessage != null`
8. `Spacer(4dp)`
9. Sign-in `Button` — 50dp height, `PeakGreenCTA`, ExtraBold 15sp, `CircularProgressIndicator` when loading
10. Divider row — "o" label between two `HorizontalDivider`s, 12sp
11. Google `OutlinedButton` — multicolor G icon (`tint = Color.Unspecified`) + "Continuar con Google"

---

### Composable signature

```kotlin
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit = {},
    viewModel: AuthViewModel = viewModel(),
)
```

---

### Tagline — two-color (navy + gold)

```kotlin
val p1 = stringResource(R.string.auth_tagline_p1)
val p2 = stringResource(R.string.auth_tagline_p2)
Text(
    text = buildAnnotatedString {
        withStyle(SpanStyle(color = PeakNavyDark)) { append("$p1 ") }  // ← space in CODE
        withStyle(SpanStyle(color = TaglineGold))  { append(p2) }
    },
    fontSize = 20.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center,
)
```

| Locale | auth_tagline_p1 | auth_tagline_p2 |
|---|---|---|
| es | Convierte tus cimas | en cartas coleccionables. |
| en | Turn your summits | into collectible cards. |
| ca | Converteix els teus cims | en cartes col·leccionables. |
| fr | Transforme tes sommets | en cartes à collectionner. |
| de | Verwandle deine Gipfel | in Sammelkarten. |

---

### Critical gotchas

- **Android strips trailing whitespace from string resources**: `auth_no_account` ends in `?  ` in XML but arrives stripped at runtime. The space between p1 and p2 in the tagline is handled in code as `append("$p1 ")`. The space between "¿No tienes cuenta?" and "Créala" uses `Spacer(Modifier.width(4.dp))` between the two Text composables.
- **Touch target — NEVER use `contentPadding = PaddingValues(0.dp)` on TextButton**: this removes the 48dp minimum touch target required by Material Design. The "¿No tienes cuenta?" row uses `Row + Modifier.heightIn(min=48.dp) + .clickable(...)` — the full line is the tap target, not just the word "Créala".
- **Interactive text minimum: 14sp** (Body Medium). `auth_create_account` ("Créala") is 14sp. Non-interactive secondary text (divider "o", error messages) can be 12–13sp.
- **ProfileScreen `TextStyle` import conflict**: `java.time.format.TextStyle` conflicts with `androidx.compose.ui.text.TextStyle`. Fix: remove the java import and use `java.time.format.TextStyle.SHORT` fully qualified at the call site (line ~869 in ProfileScreen.kt).
- **`EyeIcon` / `EyeOffIcon`** are inline `ImageVector.Builder` SVGs at the bottom of `LoginScreen.kt`. Do NOT add Material Icons dependency for these.
- **`GoogleIcon`** — multicolor 4-path inline SVG in `LoginScreen.kt`. Always `tint = Color.Unspecified`.

---

## Android App — Google Sign-In (2026-05-27)

**Status: shipped and working.**

### Files involved

| File | Change |
|---|---|
| `app/api/v1/auth/google/route.ts` | New backend endpoint |
| `mobile/android/app/build.gradle.kts` | Added credentials + googleid deps + BuildConfig field |
| `mobile/android/gradle/libs.versions.toml` | Added versions + library entries |
| `mobile/android/.../ApiService.kt` | Added `loginWithGoogle` endpoint |
| `mobile/android/.../AuthViewModel.kt` | Added `signInWithGoogle(context)` |
| `mobile/android/.../LoginScreen.kt` | Google button wired to `viewModel.signInWithGoogle(context)` |

---

### Backend: `POST /api/v1/auth/google`

**File:** `app/api/v1/auth/google/route.ts`

Flow:
1. Receives `{ idToken: string }` in request body
2. Verifies the token via Google's tokeninfo endpoint: `https://oauth2.googleapis.com/tokeninfo?id_token=...`
3. Checks `tokenInfo.aud === process.env.GOOGLE_CLIENT_ID` (audience mismatch → 401)
4. Finds or creates user:
   - `findUserByGoogleOrEmail`: looks up `Account` by `provider=google + providerAccountId=googleId` first, then falls back to `User.email`
   - If user exists + registered with email/password: calls `ensureGoogleAccount` (upsert) to link the Google account
   - If new user: `createGoogleUser` — transaction creates `User` + `Tenant` + `Membership` + `Account` + sends welcome email
5. Issues JWT (30-day TTL, same format as `/api/v1/auth/login`) via `jose` `SignJWT`
6. Returns `{ token, user }` — identical shape to login response

**Required env var:** `GOOGLE_CLIENT_ID` — the Web Client ID from Google Cloud Console. Must be set on Railway staging and production.

---

### Android: Credential Manager

**Dependencies** (in `libs.versions.toml` + `build.gradle.kts`):
```toml
credentials = "1.3.0"
googleid    = "1.1.1"
```

```kotlin
credentials                = { group = "androidx.credentials", name = "credentials", ... }
credentials-play-services-auth = { group = "androidx.credentials", name = "credentials-play-services-auth", ... }
googleid                   = { group = "com.google.android.libraries.identity.googleid", name = "googleid", ... }
```

**BuildConfig field** (same value for debug + release in `build.gradle.kts`):
```kotlin
buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"459929432551-ha3k64nssd83o0qt9biro3l52de06am9.apps.googleusercontent.com\"")
```
This is the Web Client ID (NOT the Android Client ID). The Android OAuth client in Google Cloud Console is only needed so Play Services can validate the token; the `setServerClientId` call must always use the **Web Client ID**.

**`AuthViewModel.signInWithGoogle(context)`** exception handling — order matters:

```kotlin
catch (e: GetCredentialCancellationException) → _uiState.value = AuthUiState.Idle   // silent — user cancelled
catch (e: NoCredentialException)              → AuthUiState.Error("No se encontró ninguna cuenta de Google...")
catch (e: GetCredentialException)             → AuthUiState.Error("Error con Google Sign-In: ${e.message}")
catch (e: HttpException)                      → AuthUiState.Error("Error al iniciar sesión con Google (${e.code()})")
catch (e: IOException)                        → AuthUiState.Error("Sin conexión a internet")
catch (e: Exception)                          → AuthUiState.Error("Error inesperado con Google Sign-In")
```

`GetCredentialCancellationException` must be caught **before** `GetCredentialException` (it's a subclass). If caught only by the generic handler, the user sees a spurious error after cancelling the picker.

---

### Google Cloud Console setup

Two OAuth clients are needed:
1. **Web application** — Client ID used as `GOOGLE_CLIENT_ID` env var on the server and as `GOOGLE_WEB_CLIENT_ID` in Android BuildConfig. Has Authorized redirect URIs for the web app.
2. **Android** — Package name `com.peakadex.app` + SHA-1 of the debug keystore. Required so Play Services accepts the Credential Manager request. For production release, also add the release keystore SHA-1.

Get debug SHA-1:
```bash
keytool -keystore ~/.android/debug.keystore -list -v -storepass android
```

---

### Android RegisterScreen — GDPR legal consent (2026-05-27)

**File:** `mobile/android/.../RegisterScreen.kt`

Added a mandatory checkbox above the register button:
- `var termsAccepted by remember { mutableStateOf(false) }` — unchecked by default (GDPR Art. 7 requirement)
- Register button: `enabled = !isLoading && termsAccepted`
- Legal text uses `LinkAnnotation.Url` + `TextLinkStyles` (NOT deprecated `ClickableText`)
- Links open automatically via the system browser — no manual `Intent` or `openUrl()` needed with the new API

```kotlin
val legalText = buildAnnotatedString {
    withStyle(SpanStyle(color = Color(0xFF6B7280), fontSize = 13.sp)) { append("He leído y acepto los ") }
    pushLink(LinkAnnotation.Url("https://www.peakadex.com/terms", linkStyle))
    append("Términos y condiciones")
    pop()
    withStyle(SpanStyle(color = Color(0xFF6B7280), fontSize = 13.sp)) { append(" y la ") }
    pushLink(LinkAnnotation.Url("https://www.peakadex.com/privacy", linkStyle))
    append("Política de privacidad")
    pop()
}
```

**`ClickableText` is deprecated** — always use `Text(text = annotatedString)` + `LinkAnnotation.Url` for clickable links inside text. The system handles the URL open automatically.

---

### Android SettingsScreen — INFORMACIÓN section (2026-05-27)

Added a new section **before** the logout button (ZONA DE PELIGRO header removed):

```kotlin
item { SectionHeader(stringResource(R.string.settings_section_info)) }
item {
    SettingsCard {
        SettingsLinkRow("Política de privacidad") { openUrl(context, "https://www.peakadex.com/privacy") }
        HorizontalDivider(...)
        SettingsLinkRow("Términos y condiciones") { openUrl(context, "https://www.peakadex.com/terms") }
        HorizontalDivider(...)
        SettingsReadOnlyRow("Versión", BuildConfig.VERSION_NAME)
    }
}
```

`SettingsLinkRow` is a `Row + .clickable` with a chevron-right icon (`ChevronRightIcon`, 18dp, gray). Opens URLs via `Intent(Intent.ACTION_VIEW, Uri.parse(url))`.

**i18n strings added** (all 5 locales — `values`, `values-en`, `values-ca`, `values-fr`, `values-de`):
- `settings_section_info` — Información / Information / Informació / Informations / Informationen
- `settings_privacy_policy` — Política de privacidad / Privacy Policy / Política de privacitat / Politique de confidentialité / Datenschutzrichtlinie
- `settings_terms` — Términos y condiciones / Terms & Conditions / Termes i condicions / Conditions d'utilisation / Nutzungsbedingungen
- `settings_version` — Versión / Version / Versió / Version / Version

**"Zona de peligro" header removed** — the logout button now has no section title above it. This follows the pattern of major apps (Strava, Spotify, etc.) that don't label the logout button with a warning heading.

---

### Gotchas

- **`NoCredentialException` on emulator**: emulators require a **Cold Boot** after adding a Google account before Credential Manager can use it. `Cold Boot Now` is in Device Manager → ⋮ menu next to the emulator (only available when the emulator is stopped — stop it first with the red ◼ button).
- **Emulator vs physical device**: Credential Manager can be unreliable on API 35 emulators. If cold boot doesn't help, test on a physical device.
- **`GetCredentialCancellationException` is a subclass of `GetCredentialException`**: catch the specific subclass first or the generic handler will intercept cancellations and show a spurious error.
- **Web Client ID vs Android Client ID**: `setServerClientId()` in `GetGoogleIdOption.Builder` must receive the **Web Client ID**, not the Android Client ID. Using the Android Client ID causes a token validation failure on the server.
- **`GOOGLE_CLIENT_ID` env var on Railway**: must be set on both staging and production. Without it, the server skips audience validation (logs a warning) but still works — however it's a security hole. Always set it.

---

## Cordadas — Climbing Groups (Android + v1 API, 2026-05-31)

Cordadas are named climbing groups (think "teams"/"squads"). A user can belong to many cordadas. Each cordada has one **OWNER** and N **MEMBER**s. Membership is invite-based (no auto-join). The feature shipped on Android first; web UI is pending.

> **Distinction from Friends**: friendships are 1:1, bidirectional, and drive the ascents feed. A cordada is an N-person named group with its own internal leaderboard. They are independent — being in a cordada together does NOT create a friendship, and vice versa.

### Data model (Prisma)

```prisma
model Cordada {
  id          String   @id @default(cuid())
  name        String
  description String?
  avatarUrl   String?              // reserved, not yet used by the UI
  ownerId     String
  owner       User     @relation("CordadaOwner", fields: [ownerId], references: [id])
  members     CordadaMember[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([ownerId])
  @@map("cordadas")
}

model CordadaMember {
  cordadaId   String
  cordada     Cordada             @relation(fields: [cordadaId], references: [id], onDelete: Cascade)
  userId      String
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        CordadaRole         @default(MEMBER)   // OWNER | MEMBER
  status      CordadaMemberStatus @default(PENDING)  // PENDING | ACCEPTED
  invitedById String?
  joinedAt    DateTime?
  createdAt   DateTime @default(now())
  @@id([cordadaId, userId])                 // composite PK — one membership per (cordada,user)
  @@index([userId])                          // "all cordadas this user is in"
  @@index([cordadaId, status])               // "accepted members of this cordada"
  @@map("cordada_members")
}
```

- The **owner is also a `CordadaMember`** row (`role=OWNER, status=ACCEPTED`) created in the same `prisma.cordada.create` transaction. This keeps `memberCount` and the leaderboard uniform — no special-casing the owner.
- An **invite** is a `CordadaMember` row with `status=PENDING`. Accepting flips it to `ACCEPTED` + sets `joinedAt`. Rejecting **deletes** the row (so the user can be re-invited later).
- `onDelete: Cascade` on both relations: deleting a cordada or a user wipes the membership rows automatically.

### Service — `lib/services/cordada.service.ts`

All business logic lives here (route handlers only auth + parse + call). Uses the shared `prisma` client directly (cross-user data, like `home.service.ts`).

| Function | Auth rule |
|---|---|
| `listMyCordadas(userId)` | returns `CordadaSummary[]` — only `status=ACCEPTED` memberships |
| `listPendingInvites(userId)` | returns `CordadaInvite[]` — `status=PENDING`, ordered by `createdAt asc` |
| `createCordada(ownerId, name, description?)` | creates cordada + owner membership in one call |
| `getCordadaDetail(cordadaId, currentUserId)` | members sorted by **`uniquePeaks` desc, then `totalEp` desc** (internal leaderboard) |
| `inviteToCordada(cordadaId, ownerId, targetUserId)` | **owner-only**; rejects self-invite + existing membership/invite |
| `respondToCordadaInvite(cordadaId, userId, "ACCEPTED"\|"REJECTED")` | only the invitee, only if a PENDING row exists |
| `removeMember(cordadaId, requesterId, targetUserId)` | owner can expel anyone; a member can remove **self** (leave). **Owner cannot leave — must delete instead** |
| `deleteCordada(cordadaId, ownerId)` | **owner-only** |

**Leaderboard stats source**: `getCordadaDetail` reads `levelIdx`, `uniquePeaks`, `totalEp` from the pre-computed **`user_stats`** table (same source as the home leaderboard), not by scanning ascents. Members without a `user_stats` row fall back to `levelIdx=1, uniquePeaks=0, totalEp=0`.

### API — `app/api/v1/cordadas/` (Bearer JWT, mobile)

| Method + path | Handler | Body / params |
|---|---|---|
| `GET /api/v1/cordadas` | list | → `{ cordadas, pendingInvites }` |
| `POST /api/v1/cordadas` | create | `{ name, description? }` |
| `GET /api/v1/cordadas/{id}` | detail | → `{ cordada }` |
| `DELETE /api/v1/cordadas/{id}` | delete (owner) | — |
| `POST /api/v1/cordadas/{id}/invite` | invite (owner) | `{ userId }` |
| `PATCH /api/v1/cordadas/{id}/respond` | accept/reject invite | `{ action: "ACCEPTED"\|"REJECTED" }` |
| `DELETE /api/v1/cordadas/{id}/members/{userId}` | expel / leave | — |

Retrofit interface lives in `core/api/ApiService.kt` (`getCordadas`, `createCordada`, `getCordadaDetail`, `inviteToCordada`, `respondToCordadaInvite`, `removeCordadaMember`, `deleteCordada`). Member-search for invites reuses the existing `GET /api/v1/users/search` (`searchUsers`).

### Android layer

| File | Role |
|---|---|
| `feature/friends/FriendsScreen.kt` | Hosts a `SecondaryTabRow`: tab 0 = **Amigos** (`AmigosTabContent`), tab 1 = **Cordadas** (`CordadasTab`). Own `Scaffold` with `CenterAlignedTopAppBar` + back arrow (secondary screen). |
| `feature/friends/CordadasTab.kt` | All Cordadas UI: list, invite cards, the 3 `ModalBottomSheet`s (Create / Invite / Detail). |
| `feature/friends/CordadasViewModel.kt` | `CordadasUiState` + all API calls. |
| `feature/friends/FriendsViewModel.kt` | Amigos tab state (pre-existing friends flow). |
| `core/model/Models.kt` | `CordadaSummary`, `CordadaInvite`, `CordadasResponse`, `CordadaMemberRanking`, `CordadaDetail`, `CordadaDetailResponse`. |

**Navigation**: `FriendsScreen` is a **top-level route on the outer `navController`** (`Screen.Friends`), reached from the Home avatar dropdown via `onNavigateToFriends`. It is **not** inside MainScaffold's `tabNavController` NavHost — this matters for the inset bug below.

`CordadasViewModel` notes:
- `load()` calls `getCordadas()` → fills `cordadas` + `pendingInvites`.
- `onInviteQueryChange` debounces 350ms, then `searchUsers(query)`, then **excludes current members** by `userId`.
- `inviteUser` tracks `inviteSentIds` so the row shows "Invitado" without a reload.
- `respondToInvite` optimistically removes the invite from `pendingInvites`; calls `load()` only on ACCEPTED.
- Optimistic mutation on `removeMember` (filters the member out of `selectedDetail.members`); `leaveCordada`/`deleteCordada` clear `selectedDetail` + `load()`.

### ⚠️ Known issue / fix — ModalBottomSheet content hidden behind the system navigation bar

**Symptom**: the "Crear" button on the Create-Cordada sheet (and the bottom of the Invite/Detail sheets) rendered **behind** the Android gesture/3-button nav bar — untappable. With the keyboard up the sheet rose and the button became visible; closing the keyboard dropped it back behind the nav bar. → the applied bottom inset was effectively **0**.

**Root cause**: **window-inset consumption.** `FriendsScreen` has its own `Scaffold`, which consumes the system-bar insets and hands them to its content via `innerPadding`. `ModalBottomSheet` content is composed inside that already-consumed scope, so **every Compose way of reading the nav-bar inset returns 0**:
- `padding.calculateBottomPadding()` → 0
- `Modifier.navigationBarsPadding()` → 0
- `WindowInsets.navigationBars` (incl. `BottomSheetDefaults.windowInsets`, the sheet's own default padding) → 0

This is why `AtlasScreen`'s `PeakDetailSheet` works with a plain `.navigationBarsPadding()` (it is rendered in a **non-consumed** top-level scope) but the Cordadas sheets did not — they sit under FriendsScreen's consuming Scaffold.

**Fix** (shipped — `FriendsScreen.kt` + `CordadasTab.kt`): read the **raw** nav-bar inset from the Android view root, which bypasses Compose's consumption entirely, keep it in live state so a first-composition `0` cannot get frozen forever, and thread it down as a `bottomInset: Dp`:

```kotlin
// FriendsScreen.kt — inside Scaffold content lambda
val view = LocalView.current
val density = LocalDensity.current
var bottomInsetPx by remember(view) {
    mutableIntStateOf(
        ViewCompat.getRootWindowInsets(view)
            ?.getInsets(WindowInsetsCompat.Type.navigationBars())?.bottom ?: 0,
    )
}
DisposableEffect(view) {
    fun updateBottomInset() {
        bottomInsetPx = ViewCompat.getRootWindowInsets(view)
            ?.getInsets(WindowInsetsCompat.Type.navigationBars())?.bottom ?: 0
    }
    updateBottomInset()
    val layoutListener = ViewTreeObserver.OnGlobalLayoutListener { updateBottomInset() }
    view.viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
    ViewCompat.requestApplyInsets(view)
    onDispose {
        if (view.viewTreeObserver.isAlive) {
            view.viewTreeObserver.removeOnGlobalLayoutListener(layoutListener)
        }
    }
}
val bottomInset = with(density) { bottomInsetPx.toDp() }
// → CordadasTab(currentUserId, bottomInset = bottomInset, vm = cordadasVm)
```

Each of the 3 sheets then:
- sets `contentWindowInsets = { WindowInsets(0) }` (disables the sheet's own consumption-defeated padding so it can't double up or fight the explicit value),
- applies `.imePadding()` (keyboard handling stays correct), and
- adds `.padding(bottom = bottomInset + Ndp)` / a trailing `Spacer(Modifier.height(bottomInset + Ndp))` so content clears the nav bar in both keyboard-up and keyboard-down states.

**Rule for future sheets rendered under a consuming Scaffold**: never trust `.navigationBarsPadding()` / `padding.calculateBottomPadding()` for the nav-bar inset inside them — they read the consumed (0) value. Either render the sheet in a non-consumed scope (sibling of the NavHost, like `NewAscentSheet`) **or** read the raw inset via `ViewCompat.getRootWindowInsets(LocalView.current)` and apply it manually.

### Gotchas (Cordadas)

- **Owner cannot leave** — `removeMember` throws if `isOwner && isSelf`. The Detail sheet shows "Eliminar cordada" for the owner and "Salir de la cordada" for members; never both.
- **Reject deletes the row** (not a soft status) — a rejected user can be cleanly re-invited.
- **`bottomInset` must come from live raw root insets**, not `padding` and not a one-shot `remember { ... }` read — see the inset fix above. If a future refactor moves Cordadas into a NavHost wrapped in `Modifier.padding(innerPadding)`, or freezes an initial 0 before Android has applied insets, the same nav-bar overlap bug returns.
- **Leaderboard uses `user_stats`** — a brand-new member with no ascents shows zeros until their `user_stats` row is computed (first ascent CRUD).
