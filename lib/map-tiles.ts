/**
 * CARTO basemap tiles — single source of truth for every map surface on web.
 *
 * CARTO enforces an API key on their basemap CDN: without a `key` query param
 * the tiles come back with an "API KEY REQUIRED" watermark stamped on them at
 * every zoom level. The key is free (5M tile requests/month) and is inherently
 * public — it ships in the client bundle — but this repo is public on GitHub,
 * so it is read from the environment instead of being committed.
 *
 * Set NEXT_PUBLIC_CARTO_API_KEY in .env.local and in the Railway environment
 * for staging + production. If it is missing the tiles still render, just
 * watermarked, so a missing var fails visibly rather than breaking the map.
 */

const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY ?? "";

const KEY_PARAM = CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : "";

/** Voyager raster tiles, @2x, sharded across CARTO's three CDN subdomains. */
export const CARTO_RASTER_TILES: string[] = ["a", "b", "c"].map(
  (sub) =>
    `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${KEY_PARAM}`
);

/** Required by CARTO's terms — must be credited on every map. */
export const CARTO_ATTRIBUTION = "© OpenStreetMap © CARTO";
