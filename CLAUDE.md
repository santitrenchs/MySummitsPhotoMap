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
- **Level system**: Novato → Explorador → Senderista → Montañero → Cazacimas → Cumbrista, with a progress bar showing `current/next summits to next level`
- **Summit hero card**: primary metric (total ascents) displayed prominently
- **Secondary KPIs**: photos, regions, friends as a 3-column row
- **Leaderboard** ("Tu posición en la cordada"): friend ranking with +/- diff badges showing gap vs current user
- **Dynamic motivation banner**: gold 🏆 if #1 with margin, orange ⚠️ if lead threatened (gap ≤ 3), green 🎯 if chasing someone — includes a direct CTA button to log an ascent
- **Recent ascents** ("Tus últimas cimas"): horizontal scroll cards with image overlay
- **Friends activity** ("Actividad de tu cordada"): minimal feed with dual CTAs when empty
- **Achievements**: 7 computed badges with SVG progress rings — gold ring + checkmark when earned, blue ring with `current/target` counter when in progress, gray when locked

Designed to make the user feel proud of their journey and motivated to keep climbing.

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

---

## Deployment

- **Production URL**: [www.azitracks.com](https://www.azitracks.com) (custom domain via GoDaddy CNAME → Railway)
- **Platform**: Railway (auto-deploys on push to `main`)
- **Databases**: Two Railway PostgreSQL instances — sandbox (port 40040) and production (port 10046 / internal `postgres-52e3.railway.internal:5432`)
- **File storage**: Cloudflare R2, public base URL `https://pub-e648f9ddf0d74df1b67853b9453fbca5.r2.dev`
  - Avatar key pattern: `avatars/{userId}.jpg`

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

The `detail_with` key (also in all locales) is used in the caption as `t.detail_with.toLowerCase()` — so it can be "Amb" / "With" / "Con" / "Avec" / "Mit" stored in any case.

---

## Known Gotchas

- **`toLocaleString()` without locale**: causes hydration mismatch between Node.js server and browser. Always pass an explicit locale string, or skip formatting entirely for short numbers (e.g. `{altitudeM} m` not `{altitudeM.toLocaleString()} m`).
- **Array guard on face detections**: API endpoints that return face detections can return non-arrays on edge cases. Always guard with `Array.isArray(data) ? data : []` before calling `.some()`, `.map()`, etc.
- **Peak coordinates order**: maplibre-gl uses `[longitude, latitude]`. The DB stores `latitude` and `longitude` as separate fields. Always write `[peak.longitude, peak.latitude]` — never swap.

---

## Future Direction

Keep these in mind but do not over-engineer for them in the MVP:

- **Friend system**: User search, friend requests, accepted friends feed — the social layer is partially built but needs a full friend-request flow
- **Challenges**: Time-limited goals (e.g., "Climb 3 peaks this month") to drive retention
- **Collections / Lists**: Curated peak lists (e.g., "100 Pyrenean 3000ers") a user can work through
- **Notifications**: Friend activity alerts, milestone celebrations
- **Explore evolution**: Filter peaks by range, altitude, country; suggested peaks based on history
- **Profile page**: Public-facing summary of a user's ascents and stats
- **Per-tenant DBs**: `Tenant.dbUrl` is already wired; migration path exists when needed
