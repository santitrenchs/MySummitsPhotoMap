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

/**
 * Satellite imagery tiles — served by our own Cloudflare Worker
 * (`workers/satellite-tiles/`), never straight from Esri.
 *
 * The Worker holds the ArcGIS API key in a secret and caches at the edge, so the
 * key is not in the client bundle and a tile already seen never reaches Esri
 * again. Conventional XYZ here — Esri's own level/row/col order is transposed
 * inside the Worker so no client has to know about it.
 *
 * Override with NEXT_PUBLIC_SATELLITE_TILES_URL to point at `wrangler dev`.
 */
export const SATELLITE_TILES_URL =
  process.env.NEXT_PUBLIC_SATELLITE_TILES_URL ??
  "https://tiles.peakadex.com/satellite/{z}/{x}/{y}";

/**
 * Required credit for Esri imagery, as the ArcGIS Basemap Styles service reports
 * it for World_Imagery. Keep in sync with `SatelliteTiles.ATTRIBUTION` on
 * Android and `ATTRIBUTION` in the Worker.
 */
export const SATELLITE_ATTRIBUTION =
  "Source: Esri, Vantor, GeoEye, Earthstar Geographics, CNES/Airbus DS, " +
  "USDA, USGS, AeroGRID, IGN, and the GIS User Community";

/** Esri has reliable global imagery to z19; beyond it, coverage is patchy. */
export const SATELLITE_MAX_ZOOM = 19;
