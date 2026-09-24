/**
 * Peakadex satellite tile proxy.
 *
 * Sits between the apps and Esri's imagery service so that:
 *  - the ArcGIS API key never ships inside the APK (it lives in a Worker secret),
 *  - repeated tiles are served from Cloudflare's edge cache instead of burning
 *    the upstream free tier (the imagery is static, so the hit rate is high),
 *  - there is a single choke point to swap the imagery provider, add rate
 *    limiting or read usage, without shipping a new app build.
 *
 * Public URL shape — conventional XYZ, `{z}/{x}/{y}`:
 *
 *     https://tiles.peakadex.com/satellite/12/2048/1536
 *
 * ⚠️ Esri's path is level/ROW/COL, i.e. `{z}/{y}/{x}` — the axes are swapped
 * relative to every other tile URL in this codebase. That swap is done here,
 * once, so no client ever has to remember it again.
 */

export interface Env {
  /**
   * ArcGIS Location Platform API key. Set with:
   *   npx wrangler secret put ARCGIS_API_KEY
   *
   * Optional: with no key the Worker falls back to Esri's unauthenticated
   * legacy endpoint, which works but is outside Esri's licence terms.
   */
  ARCGIS_API_KEY?: string;

  /**
   * Upstream tile template, in Esri's own `{z}/{y}/{x}` order.
   *
   * Overridable as a plain var so the authenticated endpoint can be pointed at
   * from the dashboard without a code change — see README, "Switching to the
   * licensed endpoint".
   */
  UPSTREAM_TEMPLATE?: string;

  /**
   * Expiry date of ARCGIS_API_KEY, `YYYY-MM-DD`.
   *
   * ArcGIS caps API keys at one year, and an expired one fails the way that is
   * hardest to notice: tiles stop arriving, the app logs nothing, and the map
   * just shows no imagery. Surfacing the countdown on /health lets an external
   * check complain weeks ahead instead of a user finding it.
   */
  KEY_EXPIRES_AT?: string;
}

/** Days before expiry at which /health stops reporting "ok". */
const EXPIRY_WARN_DAYS = 30;

/** Esri's legacy public imagery service. No key, no SLA, not licensed for commercial use. */
const DEFAULT_UPSTREAM =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/** Imagery is effectively immutable, so cache it for a month at the edge and a week in the client. */
const EDGE_TTL_SECONDS = 60 * 60 * 24 * 30;
const CLIENT_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Upper bound of the imagery service (its style metadata declares maxzoom 23).
 *
 * This is a sanity guard against nonsense coordinates, not a UX decision: the
 * clients set their own, lower, source maxzoom so MapLibre overzooms a blurry
 * tile instead of leaving a hole where Esri has no high-resolution coverage.
 */
const MAX_ZOOM = 23;

/** Exactly as the Basemap Styles service reports it for World_Imagery. */
const ATTRIBUTION =
  "Source: Esri, Vantor, GeoEye, Earthstar Geographics, CNES/Airbus DS, " +
  "USDA, USGS, AeroGRID, IGN, and the GIS User Community";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      const key = keyExpiry(env.KEY_EXPIRES_AT);
      return json(
        {
          // Deliberately false once the key is near expiry: a health check that
          // only goes red after the map has already broken is worth nothing.
          ok: key.status !== "expiring" && key.status !== "expired",
          attribution: ATTRIBUTION,
          keyed: Boolean(env.ARCGIS_API_KEY),
          key,
        },
        key.status === "expired" ? 503 : 200,
      );
    }

    const coords = parseTilePath(url.pathname);
    if (!coords) return json({ error: "Not found" }, 404);

    // The cache key deliberately drops the query string: a client appending a
    // cache-buster would otherwise fragment the cache and multiply upstream cost.
    const cacheKey = new Request(`${url.origin}${url.pathname}`, { method: "GET" });
    const cache = caches.default;

    const cached = await cache.match(cacheKey);
    if (cached) return withCorsHeaders(cached, "HIT");

    const upstreamUrl = buildUpstreamUrl(env, coords);

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        // Cache at the Cloudflare layer too, so a cold isolate still avoids Esri.
        cf: { cacheEverything: true, cacheTtl: EDGE_TTL_SECONDS },
      });
    } catch {
      return json({ error: "Upstream unreachable" }, 502);
    }

    if (!upstream.ok) {
      // Never cache an upstream failure: a transient 500 would otherwise stick
      // to that tile for a month and leave a permanent hole in the map.
      return json({ error: "Upstream error" }, upstream.status === 404 ? 404 : 502);
    }

    const response = new Response(upstream.body, upstream);
    response.headers.set("Cache-Control", `public, max-age=${CLIENT_TTL_SECONDS}, immutable`);
    response.headers.set("X-Attribution", ATTRIBUTION);
    // Strip anything that could carry the key or upstream identity downstream.
    response.headers.delete("Set-Cookie");

    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return withCorsHeaders(response, "MISS");
  },
} satisfies ExportedHandler<Env>;

type KeyExpiry =
  | { status: "unknown" }
  | { status: "ok" | "expiring" | "expired"; expiresAt: string; daysLeft: number };

/**
 * Days until the ArcGIS key expires, for /health.
 *
 * `daysLeft` goes negative once past the date rather than clamping at zero, so
 * an alert that fires late still says how late.
 */
function keyExpiry(expiresAt?: string): KeyExpiry {
  if (!expiresAt) return { status: "unknown" };

  const expiry = Date.parse(`${expiresAt}T00:00:00Z`);
  if (Number.isNaN(expiry)) return { status: "unknown" };

  const daysLeft = Math.floor((expiry - Date.now()) / 86_400_000);
  const status = daysLeft < 0 ? "expired" : daysLeft <= EXPIRY_WARN_DAYS ? "expiring" : "ok";

  return { status, expiresAt, daysLeft };
}

type TileCoords = { z: number; x: number; y: number };

/**
 * Parses `/satellite/{z}/{x}/{y}` (an optional `.jpg`/`.png` suffix is tolerated
 * because some tile clients append one).
 *
 * The bounds check is what keeps this from being an open proxy: only in-range
 * tile coordinates resolve to an upstream request at all.
 */
function parseTilePath(pathname: string): TileCoords | null {
  const match = /^\/satellite\/(\d{1,2})\/(\d{1,9})\/(\d{1,9})(?:\.(?:jpe?g|png))?$/.exec(pathname);
  if (!match) return null;

  const z = Number(match[1]);
  const x = Number(match[2]);
  const y = Number(match[3]);

  if (z > MAX_ZOOM) return null;

  const max = 2 ** z;
  if (x >= max || y >= max) return null;

  return { z, x, y };
}

function buildUpstreamUrl(env: Env, { z, x, y }: TileCoords): string {
  const template = env.UPSTREAM_TEMPLATE || DEFAULT_UPSTREAM;

  // Esri's path order is level/row/col, so {y} takes the row and {x} the column.
  const url = template
    .replace("{z}", String(z))
    .replace("{y}", String(y))
    .replace("{x}", String(x));

  if (!env.ARCGIS_API_KEY) return url;

  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(env.ARCGIS_API_KEY)}`;
}

function withCorsHeaders(response: Response, cacheStatus: "HIT" | "MISS"): Response {
  const out = new Response(response.body, response);
  out.headers.set("Access-Control-Allow-Origin", "*");
  out.headers.set("X-Tile-Cache", cacheStatus);
  return out;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
