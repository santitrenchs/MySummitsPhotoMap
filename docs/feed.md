# Ascensiones / Bitácora — Feed

Vive en `app/(app)/ascents/page.tsx` + `components/ascents/AscentsClient.tsx` + `lib/services/ascent-feed.ts`.

Después de un debugging extenso en mayo 2026 (iOS OOM en scroll largo) el feed se migró a **`react-virtuoso`** con `useWindowScroll`. Toda la virtualización manual previa (sliding window, measureRemovedHeight, content-visibility) se eliminó.

---

## Arquitectura

| Capa | Responsabilidad |
|---|---|
| `app/(app)/ascents/page.tsx` (RSC) | Fetch inicial vía `fetchFeedPage` con URL params (`view`, `peak`, `month`, `rarity`, `highlight`). Pasa data + cursors iniciales al cliente |
| `lib/services/ascent-feed.ts` | `fetchFeedPage()` — orquesta 3 queries Prisma en paralelo (own / friends / highlight), construye WHERE clauses según filtros, retorna `{ ascents, hasMore, nextBeforeOwn, nextBeforeFriends }` |
| `app/api/ascents/feed/route.ts` | GET endpoint para pagination/refetch — parsea params del query string, valida enums, llama `fetchFeedPage` con `skipUnseen: true` |
| `components/ascents/AscentsClient.tsx` | Estado de filtros, `<Virtuoso>` render, `loadMore` (append), refetch-on-filter-change (replace), mark-as-seen via `rangeChanged`, highlight scroll via ref |

---

## Server-side pagination — per-stream cursors

El cursor único `before` se reemplazó por **dos cursors independientes** porque own y friends pueden tener distribuciones de fecha muy distintas. Con un cursor compartido, los items antiguos de un stream causaban que el otro stream se saltase items intermedios.

```ts
fetchFeedPage({
  beforeOwn?: Date,    // cursor que avanza solo cuando own retorna items
  beforeFriends?: Date // cursor que avanza solo cuando friends retorna items
})
// → { ascents, hasMore, nextBeforeOwn, nextBeforeFriends }
// Un stream se considera exhausted cuando retorna < PAGE_SIZE items → su cursor pasa a null
// hasMore = cualquiera de los dos cursors no-null
```

`PAGE_SIZE = 10` (servidor). El cliente debe enviar AMBOS cursors en cada `loadMore` y actualizar AMBOS desde la respuesta.

**No volver a colapsar a un solo `before`.** El bug histórico fue: own=[10,5,1], friends=[100..1] (100 items). Cursor=min(1,91)=1. Página 2 query `date < 1` → friends [90..1] entero saltado.

---

## Server-side filters — `/api/ascents/feed` query params

Todos los filtros restrictivos se aplican como WHERE clauses de Prisma. La pagination con cursors solo emite items que cumplen el filtro — sin auto-retry infinito buscando matches.

| Param | Efecto |
|---|---|
| `view=mine` | Skip query de friends |
| `view=friends` | Skip query de own (default si no hay `view` ni `highlight`) |
| `view=with-me` | Friends query con join `photos.faceDetections.faceTags.userId = currentUser` |
| `view=person` + `personId` | Own: photos taggeadas con personId. Friends: `OR: [createdBy=personId, tagged-with-personId]` |
| `peakId` | WHERE peakId = X (ambos streams) |
| `month=YYYY-MM` | WHERE date in [monthStart, monthEnd) — bounds UTC |
| `rarity` | WHERE peak.altitudeM en bucket de altitud (join Peak) |
| `mythic=1` | WHERE peak.isMythic = true |
| `timeRange=month\|year` | Últimos 30d / año actual (UTC) |
| `highlightId` | Fetch puntual de un ascent específico inyectado al resultado aunque caiga fuera del cursor. Usado por deep-links desde home/map/profile/photos |

Los condiciones se combinan con el **array `AND` de Prisma** porque `baseFilters` (timeRange/month) y el per-stream cursor apuntan ambos al key `date` — un spread directo sobreescribiría una con la otra. El `AND` array las combina correctamente.

### Rarity buckets (cliente y servidor coinciden)

| Rarity | Min | Max |
|---|---|---|
| daisy | 0 | 1500 |
| gentian | 1500 | 3000 |
| edelweiss | 3000 | 5000 |
| saxifrage | 5000 | 7000 |
| cinquefoil | 7000 | 8000 |
| snow_lotus | 8000 | ∞ |

---

## Client-side filters (no migrados al server)

- **search text** — driveado por keystroke, refetchar en cada tecla sería incorrecto
- **sort por altitud (`elev-desc`)** — requeriría un cursor por altitud, aplazado como Fase 5

El `filtered` useMemo aplica también los server-side filters como no-op redundante (defense in depth — garantiza consistencia si las computaciones de servidor y cliente divergiesen).

---

## Refetch on filter change

Cuando cambia un filtro server-affecting, el cliente refetcha desde cero y reemplaza `localAscents`. Lo dispara un `useEffect` que mira `[viewChip, selectedPersonId, peakFilter, monthFilter, rarity, mythicFilter, timeRange]`. Un ref `isInitialFilterMount` skipea la primera ejecución (la data ya viene del SSR).

---

## Race condition guard — sequence number

Fetches concurrentes (e.g. `loadMore` en vuelo cuando el usuario cambia un filtro) se protegen con `fetchSeqRef`. Cada fetch reclama un seq; solo el más reciente `.then` y `.finally` mutan estado. Las respuestas obsoletas se descartan en silencio.

```ts
const fetchSeqRef = useRef(0);
const seq = ++fetchSeqRef.current;
fetch(...).then(data => {
  if (fetchSeqRef.current !== seq) return; // stale
  // apply
}).finally(() => {
  if (fetchSeqRef.current === seq) setIsFetchingMore(false);
});
```

**Sin esta guarda**, los `loadMore.then()` tardíos hacen `setLocalAscents(prev => [...prev, ...stale])` ENCIMA de la lista ya reemplazada por el refetch, contaminando con items del filtro anterior. Y el `.finally` del primer fetch despeja `isFetchingMore` mientras el segundo sigue en curso, dejando que el auto-retry dispare un tercer fetch.

---

## Auto-retry safety net

Si `groups.length < MIN_GROUPS_TO_FILL` (15) AND `hasMore` AND `!isFetchingMore`, el cliente llama `loadMore` automáticamente. Añadido originalmente porque Virtuoso no re-dispara `endReached` si no hay scroll. Con filtros server-side activos, rara vez tiene que actuar — se mantiene como defense in depth.

---

## Mark-as-seen via Virtuoso `rangeChanged`

Sustituye al viejo `IntersectionObserver`. Cuando el rango renderizado cambia, se arranca un timer de 1s por grupo. Al disparar el timer, los IDs se añaden a `pendingSeenRef`; un flush con debounce hace `POST /api/feed/seen`. Mismo UX (1s de visibilidad = visto).

Modelo Prisma: `FeedSeen { userId, ascentId, seenAt }` — `@@id([userId, ascentId])`.

**Cards agrupadas**: el callback agrupa los IDs unseen del grupo y los marca juntos cuando el grupo pasa el rango.

---

## Highlight scroll via Virtuoso ref

`virtuosoRef.current?.scrollToIndex({ index, align: "center", behavior: "smooth" })`. Disparado por un `useEffect` mirando `[highlightId, groups]`. El índice del ascent destacado se calcula con `groups.findIndex(...)` — depende de que el servidor lo inyecte via `highlightId` (asegura que está en `groups`).

Al llegar desde `/ascents?highlight=xyz`, `viewChip` se inicializa a `"mine"` para evitar que el filtro client-side `viewChip="friends"` lo esconda:

```ts
const [viewChip, setViewChip] = useState<ViewChip>(() =>
  searchParams.get("highlight") ? "mine" : (searchParams.get("view") as ViewChip) ?? "friends"
);
```

---

## Image strategy

Cards piden via `imgUrl(url, 800)` → Cloudflare `/cdn-cgi/image/width=800,format=webp,quality=80/`. Todos los `<img>` con `loading="lazy"`. Como Virtuoso solo monta items visibles, la memoria de bitmaps decodificados está acotada naturalmente — no hace falta manipular `src` manualmente.

---

## Back-to-top patterns

Dos patrones complementarios en `/ascents`:

1. **Tap active tab → scroll to top** (en `NavBar.tsx` `handleTabClick`): convención iOS-native. Tap en la tab activa hace `window.scrollTo({ top: 0, behavior: "smooth" })` en vez de re-navegar.
2. **`ScrollToTopButton`** (`components/ui/ScrollToTopButton.tsx`): botón flotante abajo-derecha, aparece cuando `scrollY > 1500px`. Reusable.

---

## Badge de ascensos no vistos

- Calculado en `app/(app)/layout.tsx` via `countUnseenFeed(userId)` en cada carga de página
- Mostrado en `NavBar` (móvil) y `Sidebar` (desktop) como número rojo
- **Reactivo en sesión**: escuchan el evento DOM `unseen-feed-count-changed` y decrementan `liveFeedCount` en tiempo real

---

## What must NOT change

- Per-stream cursors (`beforeOwn` / `beforeFriends`) — nunca colapsar a un solo `before`
- `useWindowScroll` en `<Virtuoso>` — el scroll anidado en iOS Safari es horrible; window scroll es la única opción viable
- `computeItemKey` retornando id del ascent o `${peak}__${day}` para grouped — keys estables son requisito para el recycling de virtuoso
- El `fetchSeqRef` guard — sin él, race conditions corrompen `localAscents` al cambiar filtro mid-fetch
- El fetch de `highlightId` como tercera query paralela en `fetchFeedPage` — bypasses cursors deliberadamente
- El `useEffect` de scroll-to-top en cambio de filtro debe depender de los inputs crudos (`viewChip`, `search`, etc.), NO de `filtered` — `filtered` es una referencia derivada que cambia en cada update de data

---

## Bugs históricos — no re-introducir

1. **`content-visibility: auto`** en card wrappers — causaba layout flip-flop en iOS cuando las cards transicionaban dentro/fuera del viewport. El sliding window de virtuoso es suficiente protección de memoria.
2. **Cursor único `before` compartido** — causaba que items se saltasen cuando own y friends tenían distintas distribuciones de fecha.
3. **Auto-retry llamando `loadMore`** cuando virtuoso fallaba en re-disparar `endReached` — fixed por el check de render-window.
4. **`setLocalAscents(prev => ...)` race** después de cambio de filtro — fixed con sequence number.
5. **`useEffect([filtered])`** para scroll-to-top — disparaba en cada update de data porque `filtered` es referencia derivada que cambia siempre.
6. **`endReached` avanzando `visibleCount` por client PAGE_SIZE** mientras servidor retornaba menos items — drift de índice (legacy sliding-window, eliminado; la lección queda).
7. **Mounting `PeakMiniMap` (maplibre) eagerly por card** — exhausted Chrome WebGL contexts en scroll, matando face detection en otros sitios. Solo montar al flip.

---

## Archivos clave

| Archivo | Rol |
|---|---|
| `app/(app)/ascents/page.tsx` | RSC con fetch inicial + searchParams → props |
| `lib/services/ascent-feed.ts` | `fetchFeedPage()` + tipos `View`, `Rarity`, `TimeRange` |
| `app/api/ascents/feed/route.ts` | GET con params validados (whitelists para enums) |
| `components/ascents/AscentsClient.tsx` | Virtuoso, filtros, refetch, mark-as-seen, highlight |
| `app/api/feed/seen/route.ts` | POST batch mark seen |
| `lib/services/feed.service.ts` | `markSeen()`, `countUnseenFeed()` |
| `components/nav/NavBar.tsx` | Badge móvil reactivo + tap-active-tab |
| `components/ui/ScrollToTopButton.tsx` | FAB reusable |
