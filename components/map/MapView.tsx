"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import MapFilterBar from "./MapFilterBar";
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
  daisy:     "#F59E0B",
  lavender:  "#A855F7",
  gentian:   "#3B82F6",
  edelweiss: "#EC4899",
  saxifrage: "#F97316",
  mythic:    "#FFD700",
};

// ─── Apply rarity layer filter (safe for iOS — uses setFilter, not setData) ──

function applyRarityLayerFilter(
  map: maplibregl.Map,
  rarityFilter: string[],
  mythicOnly: boolean,
) {
  const notClustered: maplibregl.FilterSpecification = ["!", ["has", "point_count"]];
  const active = mythicOnly ? ["mythic"] : rarityFilter;
  const finalFilter: maplibregl.FilterSpecification = active.length > 0
    ? ["all", notClustered, ["in", ["get", "rarityId"], ["literal", active]]]
    : notClustered;
  for (const layer of ["unclustered-peaks", "peak-labels"]) {
    if (map.getLayer(layer)) map.setFilter(layer, finalFilter);
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

// ─── Mountain placeholder (panel) ────────────────────────────────────────────

function PanelPlaceholder() {
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="ph-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="ph-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#ph-sky)" />
      <polygon points="0,160 300,160 300,200 0,200" fill="#4ade80" opacity="0.4" />
      <polygon points="150,18 250,140 50,140" fill="url(#ph-rock)" />
      <polygon points="150,18 178,68 150,62 122,68" fill="white" opacity="0.88" />
      <polygon points="230,40 295,130 165,130" fill="#b0bec5" opacity="0.65" />
      <rect x="0" y="158" width="300" height="42" fill="#86efac" opacity="0.35" />
      <polygon points="20,158 38,128 56,158" fill="#16a34a" opacity="0.7" />
      <polygon points="248,158 266,130 284,158" fill="#16a34a" opacity="0.7" />
    </svg>
  );
}

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
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  function navigate(href: string) {
    if (navigatingTo) return;
    setNavigatingTo(href);
    router.push(href);
  }

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

  // Search results — search across all loaded peaks (cache grows as user pans)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return allPeaks
      .filter((p) => p.name.toLowerCase().includes(q) || (p.mountainRange ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, allPeaks]);

  // Update GeoJSON source from cache (called after fetch, not during render)
  function updateUnclimbedSource() {
    const map = mapRef.current;
    const source = map?.getSource("unascended-peaks") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const features = Array.from(peaksCacheRef.current.values())
      .filter((p) => !ascentByPeakId.current.has(p.id))
      .map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
        properties: { id: p.id, name: p.name, alt: p.altitudeM, rarityId: p.rarityId ?? "" },
      }));
    source.setData({ type: "FeatureCollection", features });
  }

  // Fetch peaks for the given viewport bounds from the API, merge into cache
  async function fetchPeaksForViewport(bounds: MapBounds) {
    const zoom = mapRef.current?.getZoom() ?? 0;
    if (zoom < 5) return; // skip when very zoomed out
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
      if (hasNew) {
        setAllPeaks(Array.from(peaksCacheRef.current.values()));
        updateUnclimbedSource();
      }
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
      for (const layer of ["peaks-heatmap-layer", "clusters", "cluster-count", "unclustered-peaks", "peak-labels"]) {
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
      updateBounds();
      // Debounced viewport fetch — 500ms after the user stops panning
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => {
        const b = map.getBounds();
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

      // ── Heatmap source — all peaks, loaded once, coordinates only ────────
      map.addSource("peaks-heatmap", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "peaks-heatmap-layer",
        type: "heatmap",
        source: "peaks-heatmap",
        maxzoom: 10,
        paint: {
          // More weight as zoom increases so individual peaks stand out
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 9, 2.5],
          // Mountain blue → warm orange gradient
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0,   "rgba(33,102,172,0)",
            0.15, "rgba(103,169,207,0.6)",
            0.4,  "rgba(209,229,240,0.8)",
            0.6,  "rgba(253,219,199,0.9)",
            0.8,  "rgba(239,138,98,0.95)",
            1,   "rgba(178,24,43,1)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 3, 6, 14, 9, 22],
          // Fade out quickly — gone by zoom 8 so clusters take over cleanly
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 6.5, 1, 8, 0],
        },
      });

      // ── GeoJSON source for unascended peaks ─────────────────────────────
      // Starts empty — peaks are loaded progressively per viewport via /api/peaks
      map.addSource("unascended-peaks", {
        type: "geojson",
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 55,
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "unascended-peaks",
        minzoom: 7.5,
        filter: ["has", "point_count"],
        paint: {
          // AziAtlas dark navy — coherent with app brand, not generic Maps blue
          "circle-color": "#1e293b",
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 15, 28],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.25)",
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 7.5, 0, 8.5, 0.92],
          "circle-pitch-alignment": "map",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "unascended-peaks",
        minzoom: 7.5,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: {
          "text-color": "white",
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 7.5, 0, 8.5, 1],
        },
      });

      map.addLayer({
        id: "unclustered-peaks",
        type: "circle",
        source: "unascended-peaks",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["match", ["get", "rarityId"],
            "daisy",     "#F59E0B",
            "lavender",  "#A855F7",
            "gentian",   "#3B82F6",
            "edelweiss", "#EC4899",
            "saxifrage", "#F97316",
            "mythic",    "#FFD700",
            /* fallback for peaks without rarity */ "#60a5fa",
          ],
          "circle-radius": 7,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "white",
          "circle-opacity": 0.9,
          "circle-pitch-alignment": "map",
        },
      });

      map.addLayer({
        id: "peak-labels",
        type: "symbol",
        source: "unascended-peaks",
        filter: ["!", ["has", "point_count"]],
        minzoom: 10,
        layout: {
          "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "alt"]], " m"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
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

      map.on("click", "clusters", (e) => {
        justSelectedRef.current = true;
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const src = map.getSource("unascended-peaks") as maplibregl.GeoJSONSource;
        Promise.resolve(src.getClusterExpansionZoom(clusterId)).then((zoom) => {
          if (typeof zoom === "number") map.easeTo({ center: coords, zoom, duration: 500 });
        });
      });

      map.on("click", "unclustered-peaks", (e) => {
        justSelectedRef.current = true;
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const peak = peaksCacheRef.current.get(props.id);
        if (peak) {
          setSelected({ peak, ascent: ascentByPeakId.current.get(peak.id) ?? null });
          showHighlight(peak);
        }
      });

      map.on("mousemove", "unclustered-peaks", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props || !containerRef.current) return;
        const pt = map.project(e.lngLat);
        setTooltip({ text: `${props.name} · ${Number(props.alt).toLocaleString(tRef.current.dateLocale)} m`, x: pt.x, y: pt.y });
      });
      map.on("mouseleave", "unclustered-peaks", () => setTooltip(null));

      map.on("mousemove", "clusters", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props || !containerRef.current) return;
        const pt = map.project(e.lngLat);
        setTooltip({ text: i(tRef.current.map_unclimbedPeaks, { n: props.point_count }), x: pt.x, y: pt.y });
      });
      map.on("mouseleave", "clusters", () => setTooltip(null));

      for (const layer of ["clusters", "unclustered-peaks"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }

      // ── Ascended peaks: circular photo HTML markers ─────────────────────
      for (const entry of ascentData) {
        const peak = peaks.find((p) => p.id === entry.peakId);
        if (!peak) continue;

        const RING = "0 0 0 3.5px #22c55e, 0 4px 16px rgba(0,0,0,0.32)";
        const RING_HOVER = "0 0 0 5px #22c55e, 0 6px 22px rgba(0,0,0,0.4)";

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
          justSelectedRef.current = true;
          setTooltip(null);
          setSelected({ peak, ascent: entry });
          showHighlight(peak);
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
        // Fetch peaks for the initial viewport
        const b = map.getBounds();
        fetchPeaksForViewport({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
        // Load heatmap data (all peaks, coordinates only — one-time fetch)
        fetch("/api/peaks/heatmap")
          .then((r) => r.ok ? r.json() : null)
          .then((geojson) => {
            if (!geojson) return;
            const src = map.getSource("peaks-heatmap") as maplibregl.GeoJSONSource | undefined;
            src?.setData(geojson);
          })
          .catch(() => { /* ignore */ });
      });
    });

    return () => {
      ro.disconnect();
      containerRef.current?.removeEventListener("touchstart", onTouchStart);
      containerRef.current?.removeEventListener("touchmove", onTouchMove);
      containerRef.current?.removeEventListener("touchend", onTouchEnd);
      containerRef.current?.removeEventListener("touchcancel", onTouchEnd);
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
  const panelStyle: React.CSSProperties = isMobile
    ? { bottom: 0, left: 0, right: 0, borderRadius: "20px 20px 0 0", maxHeight: "70vh" }
    : { top: 12, right: 12, width: 300, maxHeight: "calc(100% - 80px)", borderRadius: 18 };

  return (
    // Outer: flex row — map area left, sidebar right
    <div style={{
      display: "flex",
      height: "calc(100svh - var(--top-nav-h, 3.5rem) - var(--bottom-nav-h, 0px))",
      background: "#e2e8f0",
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

        {/* Map area — flex:1, contains containerRef and all overlays */}
        <div style={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>

          {/* Map canvas — UNCHANGED: position:absolute; inset:0 */}
          {/* pointerEvents:none when sheet is open to isolate touch from map */}
          <div
            ref={containerRef}
            style={{ position: "absolute", inset: 0, pointerEvents: sheetOpen ? "none" : "auto" }}
          />

          {/* ── Filter pills overlay — right of search (desktop), below search (mobile) */}
          <div style={{
            position: "absolute",
            top: isMobile ? 74 : 12,
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
              hillshade={hillshade}
              onHillshadeToggle={() => setHillshade((v) => !v)}
              terrain3d={terrain3d}
              onTerrain3dToggle={() => setTerrain3d((v) => !v)}
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

          {/* ── Zoom controls ── bottom right ──────────────────────────── */}
          <div style={{
            position: "absolute", bottom: 100, right: 12, zIndex: 10,
            display: "flex", flexDirection: "column",
            borderRadius: 10, overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.28)",
          }}>
            {([{ label: "+", fn: () => mapRef.current?.zoomIn() }, { label: "−", fn: () => mapRef.current?.zoomOut() }] as const).map(({ label, fn }) => (
              <button
                key={label}
                onClick={fn}
                aria-label={label === "+" ? t.map_zoomIn : t.map_zoomOut}
                style={{
                  width: 36, height: 36,
                  background: "rgba(17,24,39,0.78)",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  border: "none",
                  borderTop: label === "−" ? "1px solid rgba(255,255,255,0.12)" : "none",
                  fontSize: 20, fontWeight: 300, color: "white", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >{label}</button>
            ))}
          </div>

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

          {/* ── Detail panel — inside map area ─────────────────────────── */}
          {selected && (
            <div
              className={isMobile ? "map-panel-mobile" : "map-panel"}
              style={{
                position: "absolute",
                ...panelStyle,
                background: "white",
                zIndex: 20,
                overflowY: "auto",
                boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
              }}
            >
              {selected.ascent?.photoUrl && (
                <div style={{ position: "relative", aspectRatio: "3/2", overflow: "hidden", background: "#f1f5f9", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.ascent.photoUrl} alt=""
                    style={{
                      width: "100%", height: "100%", objectFit: "cover", display: "block",
                      objectPosition: (() => {
                        const cx = selected.ascent.faceCenterX;
                        const cy = selected.ascent.faceCenterY;
                        if (cx == null || cy == null) return "50% 20%";
                        const r = 1.875;
                        const py = Math.max(0, Math.min(1, (0.38 - cy * r) / (1 - r)));
                        return `${cx * 100}% ${py * 100}%`;
                      })(),
                    }} />
                </div>
              )}

              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                style={{
                  position: "absolute", top: 10, right: 10,
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                  border: "none", cursor: "pointer",
                  color: "white", fontSize: 13,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>

              <div style={{ padding: "16px 16px 22px" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 2px", lineHeight: 1.25 }}>
                  {selected.peak.name}
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", marginLeft: 8 }}>
                    · {selected.peak.altitudeM.toLocaleString(t.dateLocale)} m
                  </span>
                </h2>
                {selected.peak.mountainRange && (
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 14px" }}>
                    {selected.peak.mountainRange}
                  </p>
                )}

                {selected.ascent ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{
                        background: "#dcfce7", color: "#16a34a",
                        borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                      }}>
                        ✓ {selected.ascent.ascentCount > 1
                          ? i(t.map_ascentsBadge, { n: selected.ascent.ascentCount })
                          : t.map_climbedBadge}
                      </span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {selected.ascent.ascentCount > 1 ? `${t.map_last} ` : ""}
                        {new Date(selected.ascent.date).toLocaleDateString(t.dateLocale, {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                    {selected.ascent.route && (
                      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 5 }}>
                        <span>🧭</span> {selected.ascent.route}
                      </p>
                    )}
                    {(() => {
                      const a = selected.ascent!;
                      const href = a.ascentCount > 1 ? `/ascents?peak=${a.peakId}` : `/ascents/${a.ascentId}`;
                      const loading = navigatingTo === href;
                      return (
                        <button
                          className="panel-action-btn"
                          onClick={() => navigate(href)}
                          disabled={!!navigatingTo}
                          style={{
                            width: "100%", padding: "11px",
                            background: "#111827", color: "white",
                            border: "none", borderRadius: 12,
                            fontSize: 13, fontWeight: 700,
                            cursor: loading ? "wait" : "pointer",
                            opacity: loading ? 0.7 : 1,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            transition: "opacity 0.15s",
                          }}
                        >
                          {loading && <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />}
                          {a.ascentCount > 1
                            ? i(t.map_viewAscents, { n: a.ascentCount })
                            : t.map_viewAscent}
                        </button>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px" }}>
                      {t.map_notYetClimbed}
                    </p>
                    <button
                      className="panel-action-btn"
                      onClick={() => {
                        document.dispatchEvent(
                          new CustomEvent("open-ascent-modal", { detail: { peakId: selected.peak.id } })
                        );
                      }}
                      style={{
                        width: "100%", padding: "11px",
                        background: "#0369a1", color: "white",
                        border: "none", borderRadius: 12,
                        fontSize: 13, fontWeight: 700,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {t.map_logAscent}
                    </button>
                  </>
                )}
              </div>
            </div>
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
              onSelectPeak={(peak) => { flyToPeak(peak); setSheetOpen(false); }}
              asSheet
              onClose={() => setSheetOpen(false)}
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
          />
        )}

    </div>
  );
}
