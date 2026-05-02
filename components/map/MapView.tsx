"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { useT } from "@/components/providers/I18nProvider";
import MapFilterBar from "./MapFilterBar";
import MapControls from "./MapControls";
import MapPeaksSidebar from "./MapPeaksSidebar";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RarityDef = {
  id: string;
  name: string;
  emoji: string;
  order: number;
};

export type MapPeak = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  mountainRange: string | null;
  country: string;
  rarityId: string | null;
  isMythic: boolean;
  rarity: { id: string; name: string; emoji: string; order: number } | null;
};

export type AscentMapEntry = {
  peakId: string;
  ascentId: string;
  photoUrl: string | null;
  date: string;
  route: string | null;
  ascentCount: number;
  faceCenterX: number | null;
  faceCenterY: number | null;
};

type Filter = "all" | "climbed" | "not-climbed";
type Tooltip = { text: string; x: number; y: number } | null;
type Selected = { peak: MapPeak; ascent: AscentMapEntry | null } | null;
export type MapBounds = { north: number; south: number; east: number; west: number };

// ─── Rarity color map ────────────────────────────────────────────────────────

export const RARITY_COLORS: Record<string, string> = {
  daisy:     "#00995C",
  lavender:  "#A855F7",
  gentian:   "#7B5BA6",
  edelweiss: "#F97316",
  saxifrage: "#EAB308",
  mythic:    "#FFD700",
};

// ─── Rarity scoring weights (used in adaptive score computation) ─────────────

export const RARITY_SCORE_WEIGHTS: Record<string, number> = {
  daisy:     0.2,
  lavender:  0.3,
  gentian:   0.4,
  edelweiss: 0.7,
  saxifrage: 1.0,
  mythic:    1.0,
};

// ─── Apply rarity layer filter (safe for iOS — uses setFilter, not setData) ──

function applyRarityLayerFilter(
  map: maplibregl.Map,
  rarityFilter: string[],
  mythicOnly: boolean,
) {
  const active = mythicOnly ? ["mythic"] : rarityFilter;
  const filter: maplibregl.FilterSpecification | null = active.length > 0
    ? ["in", ["get", "rarityId"], ["literal", active]]
    : null;
  for (const layer of ["unclustered-peaks", "mythic-glow", "peak-labels"]) {
    if (map.getLayer(layer)) {
      if (filter) map.setFilter(layer, filter);
      else map.setFilter(layer, undefined as unknown as maplibregl.FilterSpecification);
    }
  }
}

// ─── Map tile style ───────────────────────────────────────────────────────────

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto-tiles", type: "raster", source: "carto" }],
};

// ─── Map view persistence ─────────────────────────────────────────────────────

const MAP_VIEW_KEY = "azitracks_map_view";

function resolveInitialView(
  ascentData: AscentMapEntry[],
  peaks: MapPeak[]
): { center: [number, number]; zoom: number } {
  // Priority 1: last saved map position
  try {
    const saved = localStorage.getItem(MAP_VIEW_KEY);
    if (saved) {
      const { center, zoom } = JSON.parse(saved);
      if (Array.isArray(center) && center.length === 2 && typeof zoom === "number") {
        return { center: center as [number, number], zoom };
      }
    }
  } catch { /* ignore */ }

  // Priority 2: most recent ascent's peak coordinates
  if (ascentData.length > 0) {
    const sorted = [...ascentData].sort((a, b) => b.date.localeCompare(a.date));
    const peak = peaks.find((p) => p.id === sorted[0].peakId);
    if (peak) return { center: [peak.longitude, peak.latitude], zoom: 9 };
  }

  // Priority 3: Barcelona default
  return { center: [2.1734, 41.3851], zoom: 8 };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapView({
  peaks,
  ascentData = [],
  rarities = [],
}: {
  peaks: MapPeak[];
  ascentData?: AscentMapEntry[];
  rarities?: RarityDef[];
}) {
  const router = useRouter();
  const t = useT();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ascentByPeakId = useRef(new Map(ascentData.map((a) => [a.peakId, a])));
  const markerEls = useRef(new Map<string, HTMLElement>());
  const justSelectedRef = useRef(false);
  const highlightMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Viewport loading: accumulates all fetched peaks (climbed + unclimbed from API)
  const peaksCacheRef = useRef(new Map<string, MapPeak>(peaks.map((p) => [p.id, p])));
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CACHE_MAX = 3000; // evict oldest entries beyond this to keep iteration fast

  const [selected, setSelected] = useState<Selected>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [rarityFilter, setRarityFilter] = useState<string[]>([]);
  const [mythicOnly, setMythicOnly] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // allPeaks grows as the user pans: starts with climbed peaks, gains viewport peaks from API
  const [allPeaks, setAllPeaks] = useState<MapPeak[]>(peaks);
  const [loadingPeaks, setLoadingPeaks] = useState(false);
  const [hillshade, setHillshade] = useState(true);
  const [terrain3d, setTerrain3d] = useState(() => window.innerWidth >= 640);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Search results — fetched from API on every keystroke (debounced 300ms)
  const [searchResults, setSearchResults] = useState<MapPeak[]>([]);
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/peaks?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data: MapPeak[] = await res.json();
        setSearchResults(data.slice(0, 8));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute adaptive scores for peaks in the current viewport and update the
  // GeoJSON source. Called after every pan/zoom and after each viewport fetch.
  //
  // Algorithm:
  //   1. Collect unclimbed peaks inside current map bounds
  //   2. Normalize altitude locally (relative to viewport max)
  //   3. Score = 0.5 * norm_alt + 0.3 * rarity_weight + 0.2 * captured_bonus
  //   4. Keep top N% based on zoom level (10% → 25% → 50% → 100%)
  //   5. Encode score as circle-radius / circle-opacity via GeoJSON property
  function computeViewportScores(zoom: number) {
    const map = mapRef.current;
    const source = map?.getSource("unascended-peaks") as maplibregl.GeoJSONSource | undefined;
    if (!source || !map) return;

    const bounds = map.getBounds();
    const viewportPeaks = Array.from(peaksCacheRef.current.values()).filter(
      (p) =>
        !ascentByPeakId.current.has(p.id) &&
        p.latitude  >= bounds.getSouth() && p.latitude  <= bounds.getNorth() &&
        p.longitude >= bounds.getWest()  && p.longitude <= bounds.getEast(),
    );

    if (viewportPeaks.length === 0) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    // Step 1 — local normalization (reduce avoids spread stack overflow on large arrays)
    let maxAlt = 0;
    for (const p of viewportPeaks) if (p.altitudeM > maxAlt) maxAlt = p.altitudeM;

    // Step 2 — score
    const scored = viewportPeaks.map((p) => {
      const normAlt      = maxAlt > 0 ? p.altitudeM / maxAlt : 0;
      const rarityWeight = RARITY_SCORE_WEIGHTS[p.rarityId ?? ""] ?? 0.1;
      const score        = normAlt * 0.5 + rarityWeight * 0.3;
      return { p, score };
    });

    // Step 3 — percentile filter
    scored.sort((a, b) => b.score - a.score);
    const pct =
      zoom < 6  ? 0.10 :
      zoom < 8  ? 0.25 :
      zoom < 10 ? 0.50 : 1.0;
    const keep = Math.max(1, Math.ceil(scored.length * pct));
    const visible = scored.slice(0, keep);

    // Build GeoJSON — score stored as property so paint expressions can read it
    const features = visible.map(({ p, score }) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
      properties: {
        id: p.id, name: p.name, alt: p.altitudeM,
        rarityId: p.rarityId ?? "",
        isMythic: p.isMythic ? 1 : 0,
        score,
      },
    }));

    source.setData({ type: "FeatureCollection", features });
  }

  // Fetch peaks for the given viewport bounds from the API, merge into cache,
  // then recompute adaptive scores for the new data set.
  async function fetchPeaksForViewport(bounds: MapBounds) {
    const zoom = mapRef.current?.getZoom() ?? 0;
    if (zoom < 5) return;
    setLoadingPeaks(true);
    try {
      const { north, south, east, west } = bounds;
      const res = await fetch(`/api/peaks?north=${north}&south=${south}&east=${east}&west=${west}`);
      if (!res.ok) return;
      const data: MapPeak[] = await res.json();
      let hasNew = false;
      for (const p of data) {
        if (!peaksCacheRef.current.has(p.id)) {
          peaksCacheRef.current.set(p.id, p);
          hasNew = true;
        }
      }
      // Evict oldest entries if cache grows too large — keeps iteration O(CACHE_MAX)
      if (peaksCacheRef.current.size > CACHE_MAX) {
        const toDelete = peaksCacheRef.current.size - CACHE_MAX;
        let deleted = 0;
        for (const key of peaksCacheRef.current.keys()) {
          if (deleted++ >= toDelete) break;
          peaksCacheRef.current.delete(key);
        }
      }
      if (hasNew) setAllPeaks(Array.from(peaksCacheRef.current.values()));
      computeViewportScores(zoom);
    } catch { /* ignore network errors */ } finally {
      setLoadingPeaks(false);
    }
  }

  // Place or move a pulsing ring at the selected peak's coordinates
  function showHighlight(peak: MapPeak) {
    const map = mapRef.current;
    if (!map) return;

    if (highlightMarkerRef.current) {
      highlightMarkerRef.current.remove();
      highlightMarkerRef.current = null;
    }

    const el = document.createElement("div");
    el.style.cssText = [
      "position:absolute",
      "width:52px", "height:52px", "border-radius:50%",
      "pointer-events:none",
      "animation:peakPulse 1.6s ease-out infinite",
    ].join(";");

    highlightMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([peak.longitude, peak.latitude])
      .addTo(map);
  }

  // Fly to peak with cinematic 3D tour
  function flyToPeak(peak: MapPeak) {
    const map = mapRef.current;
    if (!map) return;

    setSearchQuery("");
    setSearchOpen(false);
    setSearchResults([]);

    // Ensure the peak is in the local cache so highlight/panel work after flying
    if (!peaksCacheRef.current.has(peak.id)) {
      peaksCacheRef.current.set(peak.id, peak);
      setAllPeaks(Array.from(peaksCacheRef.current.values()));
    }

    const ascent = ascentByPeakId.current.get(peak.id) ?? null;
    setSelected({ peak, ascent });
    justSelectedRef.current = true;
    showHighlight(peak);

    map.flyTo({
      center: [peak.longitude, peak.latitude],
      zoom: 13,
      pitch: terrain3d ? 65 : 0,
      bearing: 20,
      duration: 2200,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // ease-out cubic
    });
  }

  // Apply status filter (climbed / not-climbed / all)
  useEffect(() => {
    const showAscended = filter !== "not-climbed";
    const showUnascended = filter !== "climbed";
    const activeRarity = mythicOnly ? ["mythic"] : rarityFilter;
    markerEls.current.forEach((el, peakId) => {
      const peak = peaksCacheRef.current.get(peakId);
      const passesRarity = activeRarity.length === 0 || activeRarity.includes(peak?.rarityId ?? "");
      el.style.display = showAscended && passesRarity ? "block" : "none";
    });
    const map = mapRef.current;
    if (map) {
      for (const layer of ["unclustered-peaks", "mythic-glow", "peak-labels"]) {
        if (map.getLayer(layer)) {
          map.setLayoutProperty(layer, "visibility", showUnascended ? "visible" : "none");
        }
      }
    }
  }, [filter, rarityFilter, mythicOnly, peaks]);

  // Apply rarity filter to GeoJSON layers via setFilter (safe for iOS — no setData)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyRarityLayerFilter(map, rarityFilter, mythicOnly);
  }, [rarityFilter, mythicOnly]);

  // Remove highlight marker when panel is closed
  useEffect(() => {
    if (!selected && highlightMarkerRef.current) {
      highlightMarkerRef.current.remove();
      highlightMarkerRef.current = null;
    }
  }, [selected]);

  // Clear selection if hidden by filter
  useEffect(() => {
    if (!selected) return;
    const isAscended = ascentByPeakId.current.has(selected.peak.id);
    if (filter === "not-climbed" && isAscended) setSelected(null);
    if (filter === "climbed" && !isAscended) setSelected(null);
    const activeRarity = mythicOnly ? ["mythic"] : rarityFilter;
    if (activeRarity.length > 0 && !activeRarity.includes(selected.peak.rarityId ?? "")) setSelected(null);
  }, [filter, rarityFilter, mythicOnly, selected]);

  // Auto-open mobile sheet when a peak is selected
  useEffect(() => {
    if (selected && isMobile) setSheetOpen(true);
  }, [selected, isMobile]);

  // Hillshade toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("hillshading")) return;
    map.setLayoutProperty("hillshading", "visibility", hillshade ? "visible" : "none");
  }, [hillshade]);

  // Terrain 3D toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function applyTerrain() {
      if (!map) return;
      try {
        // Disable interactions during terrain transition to prevent NaN LngLat errors
        map.scrollZoom.disable();
        map.dragPan.disable();

        if (terrain3d) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (map as any).setTerrain({ source: "terrain", exaggeration: 1.5 });
          map.easeTo({ pitch: 45, duration: 600 });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (map as any).setTerrain(null);
          map.easeTo({ pitch: 0, duration: 600 });
        }

        // Re-enable interactions once map is fully idle after terrain switch
        map.once("idle", () => {
          map.scrollZoom.enable();
          map.dragPan.enable();
        });
      } catch {
        // Fallback: re-enable if something went wrong
        map.scrollZoom.enable();
        map.dragPan.enable();
      }
    }

    if (map.isStyleLoaded()) {
      applyTerrain();
    } else {
      map.once("idle", applyTerrain);
    }
  }, [terrain3d]);

  // Map initialisation (runs once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMobile = window.innerWidth < 640;
    const { center, zoom } = resolveInitialView(ascentData, peaks);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom,
      pitch: initMobile ? 0 : 45,
    });
    mapRef.current = map;

    // Save map position on every move so we can restore it next session
    // Also update mapBounds state so the sidebar list stays in sync
    const updateBounds = () => {
      const b = map.getBounds();
      setMapBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    };
    map.on("moveend", () => {
      try {
        const c = map.getCenter();
        localStorage.setItem(MAP_VIEW_KEY, JSON.stringify({
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
        }));
      } catch { /* ignore */ }
      // Debounce sidebar bounds update — avoids re-sorting the sidebar list on
      // every frame of a flyTo animation (which fires moveend repeatedly).
      if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
      boundsDebounceRef.current = setTimeout(updateBounds, 300);

      // Debounced viewport update — 500ms after the user stops panning.
      // First recompute scores from cache (instant), then fetch any missing peaks.
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        const z = map.getZoom();
        computeViewportScores(z); // immediate update from cache
        fetchPeaksForViewport({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
      }, 500);
    });
    map.on("zoomend", updateBounds);

    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("click", () => {
      if (justSelectedRef.current) { justSelectedRef.current = false; return; }
      setSelected(null);
    });


    // Suppress map.resize() during active touch gestures — on iOS Safari,
    // pinch-zoom causes the browser chrome to show/hide, changing the
    // viewport height mid-gesture. Calling resize() with transient dimensions
    // repositions all HTML markers incorrectly. We do a final resize on touchend.
    let touchActive = false;
    const onTouchStart = () => { touchActive = true; };
    const onTouchMove = () => {};
    const onTouchEnd = () => {
      touchActive = false;
      setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 50);
    };
    containerRef.current.addEventListener("touchstart", onTouchStart, { passive: true });
    containerRef.current.addEventListener("touchmove", onTouchMove, { passive: true });
    containerRef.current.addEventListener("touchend", onTouchEnd, { passive: true });
    containerRef.current.addEventListener("touchcancel", onTouchEnd, { passive: true });

    const ro = new ResizeObserver(() => {
      if (!touchActive && mapRef.current) mapRef.current.resize();
    });
    ro.observe(containerRef.current);

    map.once("load", () => {
      map.resize();
      updateBounds();

      // ── Terrain sources + 3D + hillshade ───────────────────────────────
      // Two separate sources to avoid the maplibre warning about sharing
      // a source between hillshade layer and 3D terrain.
      map.addSource("terrain", {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
      });

      map.addSource("terrain-hillshade", {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
      });

      // Enable 3D terrain by default (desktop only — mobile starts flat)
      if (!initMobile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).setTerrain({ source: "terrain", exaggeration: 1.5 });
      }

      map.addLayer({
        id: "hillshading",
        type: "hillshade",
        source: "terrain-hillshade",
        paint: {
          "hillshade-exaggeration": 0.7,
          "hillshade-illumination-direction": 315,
          "hillshade-illumination-anchor": "map",
          "hillshade-highlight-color": "rgba(255,255,255,0.4)",
          "hillshade-shadow-color": "rgba(0,0,0,0.55)",
        },
      });

      // ── OpenFreeMap vector tiles (Parks + Refugios) ──────────────────────
      map.addSource("ofm-source", {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution: "© OpenStreetMap contributors",
      });

      const PARK_FILTER: maplibregl.FilterSpecification = [
        "in", ["get", "class"],
        ["literal", ["national_park", "nature_reserve", "protected_area"]],
      ];

      map.addLayer({
        id: "parks-fill",
        type: "fill",
        source: "ofm-source",
        "source-layer": "park",
        minzoom: 4,
        filter: PARK_FILTER,
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 0.07,
        },
      });

      map.addLayer({
        id: "parks-outline",
        type: "line",
        source: "ofm-source",
        "source-layer": "park",
        minzoom: 4,
        filter: PARK_FILTER,
        paint: {
          "line-color": "#16a34a",
          "line-width": 1.2,
          "line-opacity": 0.45,
          "line-dasharray": [3, 2],
        },
      });

      map.addLayer({
        id: "parks-labels",
        type: "symbol",
        source: "ofm-source",
        "source-layer": "park",
        minzoom: 7,
        filter: PARK_FILTER,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-anchor": "center",
          "text-optional": true,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#166534",
          "text-halo-color": "rgba(255,255,255,0.85)",
          "text-halo-width": 1.5,
        },
      });

      const REFUGIO_FILTER: maplibregl.FilterSpecification = [
        "in", ["get", "subclass"],
        ["literal", ["alpine_hut", "wilderness_hut"]],
      ];

      map.addLayer({
        id: "refugios-dots",
        type: "circle",
        source: "ofm-source",
        "source-layer": "poi",
        minzoom: 11,
        filter: REFUGIO_FILTER,
        paint: {
          "circle-radius": 5,
          "circle-color": "#f59e0b",
          "circle-stroke-color": "white",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "refugios-labels",
        type: "symbol",
        source: "ofm-source",
        "source-layer": "poi",
        minzoom: 12,
        filter: REFUGIO_FILTER,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-optional": true,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#92400e",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1.5,
        },
      });

      // ── GeoJSON source for unascended peaks ─────────────────────────────
      // Starts empty — peaks loaded progressively per viewport via /api/peaks.
      // No clustering: adaptive percentile filtering replaces cluster logic.
      map.addSource("unascended-peaks", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Glow ring for mythic peaks — blurred outer circle drawn underneath
      map.addLayer({
        id: "mythic-glow",
        type: "circle",
        source: "unascended-peaks",
        filter: ["==", ["get", "isMythic"], 1],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "score"], 0, 22, 1, 36],
          "circle-color": "#FFD700",
          "circle-opacity": 0.22,
          "circle-blur": 1,
          "circle-pitch-alignment": "map",
        },
      });

      // Main adaptive peaks layer:
      //   circle-radius ∝ score  (5px low-score → 15px top-score)
      //   circle-color  = rarity color
      //   circle-opacity fades with lower score so top peaks pop
      map.addLayer({
        id: "unclustered-peaks",
        type: "circle",
        source: "unascended-peaks",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "score"],
            0,   5,
            0.4, 8,
            0.7, 11,
            1.0, 15,
          ],
          "circle-color": ["match", ["get", "rarityId"],
            "daisy",     "#00995C",
            "lavender",  "#A855F7",
            "gentian",   "#7B5BA6",
            "edelweiss", "#F97316",
            "saxifrage", "#EAB308",
            "mythic",    "#FFD700",
            "#60a5fa",
          ],
          "circle-opacity": ["interpolate", ["linear"], ["get", "score"],
            0,   0.55,
            0.5, 0.80,
            1.0, 0.95,
          ],
          "circle-stroke-width": ["interpolate", ["linear"], ["get", "score"],
            0,   1.5,
            1.0, 2.5,
          ],
          "circle-stroke-color": "white",
          "circle-pitch-alignment": "map",
        },
      });

      // Labels appear only at high zoom, sized by score
      map.addLayer({
        id: "peak-labels",
        type: "symbol",
        source: "unascended-peaks",
        minzoom: 10,
        layout: {
          "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "alt"]], " m"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["get", "score"], 0, 9, 1, 12],
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-optional": true,
          "text-allow-overlap": false,
          "text-max-width": 9,
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "rgba(255,255,255,0.92)",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", "unclustered-peaks", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const peak = peaksCacheRef.current.get(props.id);
        if (peak) flyToPeak(peak);
      });

      map.on("mousemove", "unclustered-peaks", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props || !containerRef.current) return;
        const pt = map.project(e.lngLat);
        setTooltip({ text: `${props.name} · ${Number(props.alt).toLocaleString(tRef.current.dateLocale)} m`, x: pt.x, y: pt.y });
      });
      map.on("mouseleave", "unclustered-peaks", () => setTooltip(null));

      map.on("mouseenter", "unclustered-peaks", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "unclustered-peaks", () => { map.getCanvas().style.cursor = ""; });

      // ── Ascended peaks: circular photo HTML markers ─────────────────────
      for (const entry of ascentData) {
        const peak = peaks.find((p) => p.id === entry.peakId);
        if (!peak) continue;

        const ringColor = RARITY_COLORS[peak.rarityId ?? ""] ?? "#22c55e";
        const RING = `0 0 0 3.5px ${ringColor}, 0 4px 16px rgba(0,0,0,0.32)`;
        const RING_HOVER = `0 0 0 5px ${ringColor}, 0 6px 22px rgba(0,0,0,0.4)`;

        const el = document.createElement("div");
        el.setAttribute("aria-label", `${peak.name} ${peak.altitudeM}m (climbed)`);
        el.style.cssText = [
          "position:absolute",  // explicit — maplibre-gl.css may not apply on iOS Safari
          "width:44px", "height:44px", "border-radius:50%",
          "overflow:hidden", "cursor:pointer",
          "border:2.5px solid white",
          `box-shadow:${RING}`,
          "transition:box-shadow 0.2s ease",
          "background-color:#dbeafe",
          entry.photoUrl ? `background-image:url(${entry.photoUrl})` : "",
          "background-size:cover", "background-position:center",
        ].filter(Boolean).join(";");

        if (!entry.photoUrl) {
          el.style.background = "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.fontSize = "14px";
          el.style.fontWeight = "700";
          el.style.color = "#0369a1";
          el.style.fontFamily = "system-ui, -apple-system, sans-serif";
          el.textContent = peak.name[0]?.toUpperCase() ?? "?";
        }

        el.addEventListener("mouseenter", () => { el.style.boxShadow = RING_HOVER; });
        el.addEventListener("mousemove", (e) => {
          if (!containerRef.current) return;
          const me = e as MouseEvent;
          const cRect = containerRef.current.getBoundingClientRect();
          setTooltip({
            text: `${peak.name} · ${peak.altitudeM.toLocaleString(tRef.current.dateLocale)} m`,
            x: me.clientX - cRect.left,
            y: me.clientY - cRect.top,
          });
        });
        el.addEventListener("mouseleave", () => { el.style.boxShadow = RING; setTooltip(null); });
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setTooltip(null);
          flyToPeak(peak);
        });

        markerEls.current.set(peak.id, el);
        new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([peak.longitude, peak.latitude])
          .addTo(map);
      }

      // Force marker positions to recalculate after the map has fully
      // rendered. map.resize() at the top of this handler fires before
      // the canvas has its final CSS size on iOS Safari, causing all
      // HTML markers to be offset downward by exactly the canvas height.
      // A second resize after 300ms covers the case where iOS Safari
      // hasn't fully committed the layout by the time 'idle' fires.
      map.once("idle", () => {
        map.resize();
        const b = map.getBounds();
        fetchPeaksForViewport({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
      });
    });

    return () => {
      ro.disconnect();
      containerRef.current?.removeEventListener("touchstart", onTouchStart);
      containerRef.current?.removeEventListener("touchmove", onTouchMove);
      containerRef.current?.removeEventListener("touchend", onTouchEnd);
      containerRef.current?.removeEventListener("touchcancel", onTouchEnd);
      if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      highlightMarkerRef.current?.remove();
      highlightMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      markerEls.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived counts ────────────────────────────────────────────────────────
  const climbedCount = ascentData.length;

  return (
    <div style={{
      position: "relative",
      height: "calc(100svh - var(--top-nav-h, 3.5rem) - var(--bottom-nav-h, 0px))",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes peakPulse {
          0%   { box-shadow: 0 0 0 0px rgba(251,191,36,0.9), 0 0 0 6px rgba(251,191,36,0.5); opacity: 1; }
          70%  { box-shadow: 0 0 0 18px rgba(251,191,36,0), 0 0 0 24px rgba(251,191,36,0); opacity: 0.6; }
          100% { box-shadow: 0 0 0 0px rgba(251,191,36,0), 0 0 0 0px rgba(251,191,36,0); opacity: 0; }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes panelInMobile {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes searchDrop {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .map-panel { animation: panelIn 0.22s ease both; }
        .map-panel-mobile { animation: panelInMobile 0.28s ease both; }
        /* iOS Safari: maplibre-gl.css position:absolute not always applied
           to dynamically created markers — set it explicitly. */
        .maplibregl-marker { position: absolute !important; z-index: 1; }
        .filter-chip { transition: background 0.15s, color 0.15s, box-shadow 0.15s; }
        .filter-chip:active { transform: scale(0.95); }
        .panel-action-btn { transition: opacity 0.15s, transform 0.15s; }
        .panel-action-btn:hover { opacity: 0.88; transform: scale(0.98); }
        .search-result:hover { background: #f3f4f6; }
      `}</style>

        {/* Map area — full bleed behind floating sidebar */}
        <div style={{ position: "absolute", inset: 0 }}>

          {/* Map canvas — UNCHANGED: position:absolute; inset:0 */}
          {/* pointerEvents:none when sheet is open to isolate touch from map */}
          <div
            ref={containerRef}
            style={{ position: "absolute", inset: 0, pointerEvents: sheetOpen ? "none" : "auto" }}
          />

          {/* ── Filter pills overlay — right of search (desktop), below search (mobile) */}
          <div style={{
            position: "absolute",
            top: isMobile ? 86 : 12,
            left: isMobile ? 12 : 344,
            right: isMobile ? 12 : undefined,
            zIndex: 20,
            display: "flex", alignItems: "center", gap: 8,
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
            // Hide scrollbar on mobile but keep scrollability
            msOverflowStyle: "none",
          }}>
            <MapFilterBar
              filter={filter}
              onFilterChange={setFilter}
              rarityFilter={rarityFilter}
              onRarityChange={setRarityFilter}
              mythicOnly={mythicOnly}
              onMythicToggle={() => {
                setMythicOnly((v) => !v);
                if (!mythicOnly) setRarityFilter([]);
              }}
              rarities={rarities}
              climbedCount={climbedCount}
            />
          </div>

          {/* ── Search panel overlay ──────────────────────────────────── */}
          <div style={{
            position: "absolute", top: 12,
            left: 12, right: 12,
            ...(isMobile ? {} : { right: "auto", width: 320 }),
            zIndex: 20,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            borderRadius: 16,
            boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
            overflow: "hidden",
          }}>
            <div style={{ position: "relative", padding: "10px 12px" }}>
              <span style={{
                position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)",
                fontSize: 14, pointerEvents: "none", color: "#9ca3af",
              }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                placeholder="Buscar cima…"
                style={{
                  width: "100%", padding: "8px 30px 8px 32px",
                  borderRadius: 10, border: "none",
                  fontSize: 16, fontWeight: 500, color: "#111827",
                  background: "#f3f4f6",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              {searchQuery && (
                <button
                  onMouseDown={() => setSearchQuery("")}
                  style={{
                    position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 2,
                  }}
                >✕</button>
              )}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div style={{
                borderTop: "1px solid #f3f4f6",
                maxHeight: 260, overflowY: "auto",
                animation: "searchDrop 0.15s ease both",
              }}>
                {searchResults.map((peak) => {
                  const isClimbed = ascentByPeakId.current.has(peak.id);
                  return (
                    <button
                      key={peak.id}
                      className="search-result"
                      onMouseDown={() => flyToPeak(peak)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%", padding: "10px 14px",
                        background: "none", border: "none", cursor: "pointer",
                        textAlign: "left", borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{isClimbed ? "✅" : "🏔"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                          {peak.name}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                          {peak.altitudeM.toLocaleString(t.dateLocale)} m
                          {peak.mountainRange ? ` · ${peak.mountainRange}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Hover tooltip ──────────────────────────────────────────── */}
          {tooltip && !selected && (
            <div style={{
              position: "absolute",
              left: tooltip.x, top: tooltip.y - 40,
              transform: "translateX(-50%)",
              pointerEvents: "none", zIndex: 30,
              background: "rgba(17,24,39,0.78)", backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: "white", fontSize: 12, fontWeight: 600,
              padding: "5px 13px", borderRadius: 20,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}>
              {tooltip.text}
            </div>
          )}

          {/* ── Map controls (layers, 3D, zoom, geolocate) ────────────── */}
          <MapControls
            isMobile={isMobile}
            hillshade={hillshade}
            onHillshadeToggle={() => setHillshade((v) => !v)}
            terrain3d={terrain3d}
            onTerrain3dToggle={() => setTerrain3d((v) => !v)}
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            onGeolocate={(lat, lng) => {
              mapRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 1400 });
            }}
          />

          {/* ── Lista button — mobile only, bottom-left ────────────────── */}
          {isMobile && !sheetOpen && (
            <button
              onClick={() => setSheetOpen(true)}
              style={{
                position: "absolute", bottom: 100, left: 12, zIndex: 10,
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 999,
                background: "rgba(17,24,39,0.78)",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                border: "none",
                boxShadow: "0 2px 12px rgba(0,0,0,0.28)",
                fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer",
              }}
            >
              📋 Lista
            </button>
          )}

          {/* ── Loading indicator — when fetching viewport peaks ──────────── */}
          {loadingPeaks && (
            <div style={{
              position: "absolute", top: isMobile ? 130 : 70, left: "50%", transform: "translateX(-50%)",
              zIndex: 25, pointerEvents: "none",
              background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
              padding: "6px 14px", borderRadius: 999,
              display: "flex", alignItems: "center", gap: 7,
              fontSize: 12, fontWeight: 600, color: "#374151",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #d1d5db", borderTopColor: "#374151", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
              Cargando cimas…
            </div>
          )}

          {/* ── Mobile bottom sheet — OUTSIDE containerRef, touch-isolated ── */}
          {isMobile && sheetOpen && (
            <MapPeaksSidebar
              peaks={allPeaks}
              ascentByPeakId={ascentByPeakId.current}
              mapBounds={mapBounds}
              filter={filter}
              rarityFilter={rarityFilter}
              mythicOnly={mythicOnly}
              selectedPeakId={selected?.peak.id ?? null}
              onSelectPeak={(peak) => { flyToPeak(peak); }}
              selectedPeak={selected ?? undefined}
              onActionCapture={(peakId) => {
                document.dispatchEvent(new CustomEvent("open-ascent-modal", { detail: { peakId } }));
              }}
              onActionView={(href) => router.push(href)}
              asSheet
              onClose={() => { setSheetOpen(false); setSelected(null); }}
            />
          )}

        </div>{/* end map area */}

        {/* ── Desktop sidebar — OUTSIDE containerRef, next to map ─────── */}
        {!isMobile && (
          <MapPeaksSidebar
            peaks={allPeaks}
            ascentByPeakId={ascentByPeakId.current}
            mapBounds={mapBounds}
            filter={filter}
            rarityFilter={rarityFilter}
            mythicOnly={mythicOnly}
            selectedPeakId={selected?.peak.id ?? null}
            onSelectPeak={flyToPeak}
            selectedPeak={selected ?? undefined}
            onActionCapture={(peakId) => {
              document.dispatchEvent(new CustomEvent("open-ascent-modal", { detail: { peakId } }));
            }}
            onActionView={(href) => router.push(href)}
          />
        )}

    </div>
  );
}
