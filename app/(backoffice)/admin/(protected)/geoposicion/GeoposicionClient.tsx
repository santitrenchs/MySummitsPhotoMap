"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type DbPeak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  comarca: string | null;
  gpsVerified: boolean;
};

type ClickedPoint = {
  lng: number;
  lat: number;
  osmName: string | null;
  osmEle: number | null;
};

type ToastState = { msg: string; ok: boolean } | null;

type NominatimResult = {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
};

type CreateForm = {
  name: string;
  altitudeM: string;
  country: string;
  mountainRange: string;
  comarca: string;
  tag1: string;
  tag2: string;
  tag3: string;
};

type OsmSource = "osm" | "nominatim" | "";

type DbMapPeak = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  gpsVerified: boolean;
};

// Which form fields were auto-filled from OSM (to show badge)
type OsmFilled = Partial<Record<keyof CreateForm, OsmSource>>;

// ─── Map style ────────────────────────────────────────────────────────────────

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

const EMPTY_FORM: CreateForm = {
  name: "",
  altitudeM: "",
  country: "ES",
  mountainRange: "",
  comarca: "",
  tag1: "",
  tag2: "",
  tag3: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GeoposicionClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [clickedPoint, setClickedPoint] = useState<ClickedPoint | null>(null);

  // ── Link mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DbPeak[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<DbPeak | null>(null);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  // ── Panel mode: "link" = assign existing peak, "create" = new peak from OSM
  const [panelMode, setPanelMode] = useState<"link" | "create">("link");

  // ── Create mode state
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM);
  const [osmFilled, setOsmFilled] = useState<OsmFilled>({});
  const [osmLoading, setOsmLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showExtraFields, setShowExtraFields] = useState(false);

  // ── Duplicate name warning
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // ── DB peaks overlay
  const [showDbPeaks, setShowDbPeaks] = useState(false);
  const [dbPeaksFilter, setDbPeaksFilter] = useState<"all" | "verified" | "unverified">("all");
  const [dbPeaks, setDbPeaks] = useState<DbMapPeak[]>([]);
  const [dbPeaksLoading, setDbPeaksLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OSM map search (Nominatim)
  const [mapSearch, setMapSearch] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<NominatimResult[]>([]);
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  const mapSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMapSearchChange(val: string) {
    setMapSearch(val);
    setMapSearchOpen(true);
    if (mapSearchDebounce.current) clearTimeout(mapSearchDebounce.current);
    if (val.trim().length < 2) { setMapSearchResults([]); return; }
    mapSearchDebounce.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=8&featuretype=natural&addressdetails=0`;
        const res = await fetch(url, { headers: { "Accept-Language": "es,ca,en" } });
        const data: NominatimResult[] = await res.json();
        setMapSearchResults(data);
      } catch { setMapSearchResults([]); }
    }, 400);
  }

  function flyToNominatim(result: NominatimResult) {
    const map = mapRef.current;
    if (!map) return;
    setMapSearch(result.name || result.display_name);
    setMapSearchResults([]);
    setMapSearchOpen(false);
    map.flyTo({
      center: [parseFloat(result.lon), parseFloat(result.lat)],
      zoom: 13,
      duration: 1800,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });
  }

  function showToast(msg: string, ok: boolean) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // ── Search our DB peaks
  const searchPeaks = useCallback((q: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/peaks?q=${encodeURIComponent(q)}&limit=10`);
        if (!res.ok) { setSearching(false); return; }
        const data = await res.json();
        setSearchResults(data.peaks ?? []);
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
  }, []);

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    setSelectedPeak(null);
    searchPeaks(val);
  }

  function closePanel() {
    setClickedPoint(null);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPeak(null);
    setSearching(false);
    setPanelMode("link");
    setCreateForm(EMPTY_FORM);
    setOsmFilled({});
    setOsmLoading(false);
    setShowExtraFields(false);
    setDuplicateWarning(false);
  }

  // ── Fetch OSM data for "create" mode: Overpass + Nominatim reverse
  async function fetchOsmData(lat: number, lng: number, osmName: string | null, osmEle: number | null) {
    setOsmLoading(true);
    const filled: OsmFilled = {};
    const form: CreateForm = { ...EMPTY_FORM };

    // Pre-fill from vector tile data (already available)
    if (osmName) { form.name = osmName; filled.name = "osm"; }
    if (osmEle) { form.altitudeM = String(osmEle); filled.altitudeM = "osm"; }

    // Parallel: Overpass + Nominatim reverse
    const [overpassResult, nominatimResult] = await Promise.allSettled([
      fetchOverpass(lat, lng),
      fetchNominatimReverse(lat, lng),
    ]);

    if (overpassResult.status === "fulfilled" && overpassResult.value) {
      const tags = overpassResult.value;
      const overpassName = tags["name:es"] || tags["name:ca"] || tags.name;
      if (overpassName && !form.name) { form.name = overpassName; filled.name = "osm"; }
      if (overpassName && form.name !== overpassName && !osmName) { form.name = overpassName; filled.name = "osm"; }
      const ele = tags.ele ? parseInt(tags.ele) : null;
      if (ele && !isNaN(ele) && !form.altitudeM) { form.altitudeM = String(ele); filled.altitudeM = "osm"; }
      if (tags.mountain_range) { form.mountainRange = tags.mountain_range; filled.mountainRange = "osm"; }
    }

    if (nominatimResult.status === "fulfilled" && nominatimResult.value) {
      const addr = nominatimResult.value;
      if (addr.countryCode) { form.country = addr.countryCode.toUpperCase(); filled.country = "nominatim"; }
      const comarca = addr.county || addr.municipality || addr.town || addr.village || "";
      if (comarca) { form.comarca = comarca; filled.comarca = "nominatim"; }
      // Use state/region as mountainRange fallback if not already set
      if (!form.mountainRange && addr.state) {
        form.mountainRange = addr.state;
        filled.mountainRange = "nominatim";
      }
    }

    setCreateForm(form);
    setOsmFilled(filled);
    setOsmLoading(false);
  }

  async function fetchOverpass(lat: number, lng: number): Promise<Record<string, string> | null> {
    const query = `[out:json];node["natural"="peak"](around:500,${lat},${lng});out tags;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const elements: Array<{ tags: Record<string, string> }> = data.elements ?? [];
    return elements[0]?.tags ?? null;
  }

  async function fetchNominatimReverse(lat: number, lng: number): Promise<{
    countryCode: string; county: string; municipality: string;
    town: string; village: string; state: string;
  } | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=10`;
    const res = await fetch(url, { headers: { "Accept-Language": "es,ca,en" } });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    return {
      countryCode: addr.country_code ?? "",
      county: addr.county ?? addr.comarca ?? "",
      municipality: addr.municipality ?? "",
      town: addr.town ?? addr.city ?? "",
      village: addr.village ?? addr.suburb ?? "",
      state: addr.state ?? addr.region ?? "",
    };
  }

  // ── Switch to create mode
  function enterCreateMode() {
    setPanelMode("create");
    setDuplicateWarning(false);
    if (clickedPoint) {
      fetchOsmData(clickedPoint.lat, clickedPoint.lng, clickedPoint.osmName, clickedPoint.osmEle);
    }
  }

  function updateForm(field: keyof CreateForm, value: string) {
    setCreateForm((f) => ({ ...f, [field]: value }));
    if (field === "name") setDuplicateWarning(false);
  }

  // ── Check for duplicate name before creating
  async function checkDuplicate(name: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/peaks?q=${encodeURIComponent(name)}&limit=5`);
      if (!res.ok) return false;
      const data = await res.json();
      return (data.peaks ?? []).some(
        (p: DbPeak) => p.name.toLowerCase() === name.toLowerCase()
      );
    } catch { return false; }
  }

  async function handleCreate() {
    if (!clickedPoint || !createForm.name.trim() || !createForm.altitudeM) return;
    setCreating(true);
    try {
      const isDuplicate = await checkDuplicate(createForm.name.trim());
      if (isDuplicate) {
        setDuplicateWarning(true);
        setCreating(false);
        return;
      }
      const res = await fetch("/api/admin/peaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          latitude: clickedPoint.lat,
          longitude: clickedPoint.lng,
          altitudeM: parseInt(createForm.altitudeM),
          country: createForm.country.trim() || "ES",
          mountainRange: createForm.mountainRange.trim() || null,
          comarca: createForm.comarca.trim() || null,
          tag1: createForm.tag1.trim() || null,
          tag2: createForm.tag2.trim() || null,
          tag3: createForm.tag3.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Error al crear");
      const created = await res.json();
      // Fire-and-forget: fetch Wikipedia texts in background
      if (created?.id) {
        fetch(`/api/admin/peaks/${created.id}/wiki`, { method: "POST" }).catch(() => {});
      }
      showToast(`✓ «${createForm.name.trim()}» creada y verificada`, true);
      closePanel();
    } catch {
      showToast("Error al crear la cima", false);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!clickedPoint || !selectedPeak) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/peaks/${selectedPeak.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: clickedPoint.lat,
          longitude: clickedPoint.lng,
          gpsVerified: true,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setDbPeaks((prev) => prev.map((p) => p.id === selectedPeak.id ? { ...p, gpsVerified: true, latitude: clickedPoint.lat, longitude: clickedPoint.lng } : p));
      showToast(`✓ ${selectedPeak.name} actualizada`, true);
      closePanel();
    } catch {
      showToast("Error al guardar la cima", false);
    } finally {
      setSaving(false);
    }
  }

  // ── DB peaks fetch (paginated)
  async function fetchAllDbPeaks() {
    setDbPeaksLoading(true);
    try {
      const all: DbMapPeak[] = [];
      let page = 1;
      const limit = 100;
      while (true) {
        const res = await fetch(`/api/admin/peaks?limit=${limit}&page=${page}`);
        if (!res.ok) break;
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const peaks: DbMapPeak[] = (data.peaks ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          latitude: p.latitude,
          longitude: p.longitude,
          altitudeM: p.altitudeM,
          gpsVerified: p.gpsVerified,
        })).filter((p: DbMapPeak) => p.latitude != null && p.longitude != null);
        all.push(...peaks);
        if (all.length >= (data.total ?? 0) || peaks.length < limit) break;
        page++;
      }
      setDbPeaks(all);
    } catch { /* ignore */ }
    setDbPeaksLoading(false);
  }

  // Fetch when toggle is enabled (only once)
  useEffect(() => {
    if (showDbPeaks && dbPeaks.length === 0 && !dbPeaksLoading) {
      fetchAllDbPeaks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDbPeaks]);

  // Sync DB peaks layer with map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const visibility = showDbPeaks ? "visible" : "none";
    if (map.getLayer("db-peaks-triangles")) map.setLayoutProperty("db-peaks-triangles", "visibility", visibility);
    if (map.getLayer("db-peaks-labels")) map.setLayoutProperty("db-peaks-labels", "visibility", visibility);

    if (!showDbPeaks) return;

    const source = map.getSource("db-peaks-source") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const filtered = dbPeaks.filter((p) =>
      dbPeaksFilter === "all" ? true :
      dbPeaksFilter === "verified" ? p.gpsVerified : !p.gpsVerified
    );

    source.setData({
      type: "FeatureCollection",
      features: filtered.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        properties: { id: p.id, name: p.name, altitudeM: p.altitudeM, gpsVerified: p.gpsVerified },
      })),
    });
  }, [mapReady, showDbPeaks, dbPeaks, dbPeaksFilter]);

  // ── Map init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [2.1734, 41.3851],
      zoom: 8,
      pitch: 0,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    const ro = new ResizeObserver(() => { map.resize(); });
    ro.observe(containerRef.current!);

    map.once("load", () => {
      map.resize();

      map.addSource("terrain-hillshade", {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
      });
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

      map.addSource("osm-peaks-source", {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution: "© OpenStreetMap contributors",
      });
      map.addLayer({
        id: "osm-peaks-dots",
        type: "circle",
        source: "osm-peaks-source",
        "source-layer": "mountain_peak",
        minzoom: 9,
        paint: {
          "circle-radius": 5,
          "circle-color": "#dc2626",
          "circle-stroke-color": "white",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "osm-peaks-labels",
        type: "symbol",
        source: "osm-peaks-source",
        "source-layer": "mountain_peak",
        minzoom: 10,
        layout: {
          "text-field": ["step", ["zoom"],
            ["get", "name"],
            12, ["concat", ["get", "name"], "\n", ["coalesce", ["get", "ele"], ""], "m"],
          ],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.0],
          "text-anchor": "top",
          "text-optional": true,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#7f1d1d",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", "osm-peaks-dots", (e) => {
        e.preventDefault();
        const feature = e.features?.[0];
        const props = feature?.properties ?? {};
        const ele = props.ele ? Number(props.ele) : null;
        setClickedPoint({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          osmName: props.name ?? null,
          osmEle: isNaN(ele as number) ? null : ele,
        });
        setSearchQuery(props.name ?? "");
        searchPeaks(props.name ?? "");
        setPanelMode("link");
        setCreateForm(EMPTY_FORM);
        setOsmFilled({});
        setShowExtraFields(false);
        setDuplicateWarning(false);
      });

      map.on("mouseenter", "osm-peaks-dots", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "osm-peaks-dots", () => {
        map.getCanvas().style.cursor = "";
      });

      // ── DB peaks overlay source + layers
      map.addSource("db-peaks-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "db-peaks-triangles",
        type: "symbol",
        source: "db-peaks-source",
        minzoom: 6,
        layout: {
          "text-field": "▲",
          "text-font": ["Noto Sans Regular"],
          "text-size": 14,
          "text-anchor": "bottom",
          "text-allow-overlap": true,
          "visibility": "none",
        },
        paint: {
          "text-color": ["case", ["==", ["get", "gpsVerified"], true], "#16a34a", "#ea580c"],
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1,
        },
      });
      map.addLayer({
        id: "db-peaks-labels",
        type: "symbol",
        source: "db-peaks-source",
        minzoom: 9,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-anchor": "top",
          "text-offset": [0, 0.3],
          "text-optional": true,
          "text-max-width": 8,
          "visibility": "none",
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "rgba(255,255,255,0.95)",
          "text-halo-width": 1.5,
        },
      });

      setMapReady(true);
    });

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render helpers ───────────────────────────────────────────────────────

  function OsmBadge({ source }: { source: OsmSource | undefined }) {
    if (!source) return null;
    return (
      <span style={{
        fontSize: 10, fontWeight: 600, padding: "1px 6px",
        borderRadius: 4, marginLeft: 6, verticalAlign: "middle",
        background: source === "osm" ? "#fef3c7" : "#ede9fe",
        color: source === "osm" ? "#92400e" : "#5b21b6",
      }}>
        {source === "osm" ? "OSM" : "Nominatim"}
      </span>
    );
  }

  function FormField({
    label, field, type = "text", placeholder, readonly,
  }: {
    label: string;
    field: keyof CreateForm;
    type?: string;
    placeholder?: string;
    readonly?: boolean;
  }) {
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={{
          fontSize: 11, fontWeight: 600, color: "#374151",
          display: "flex", alignItems: "center", marginBottom: 4,
        }}>
          {label}
          {osmLoading && !createForm[field] && (
            <span style={{
              display: "inline-block", width: 10, height: 10, marginLeft: 6,
              borderRadius: "50%", border: "1.5px solid #d1d5db", borderTopColor: "#6b7280",
              animation: "geo-spin-plain 0.7s linear infinite",
            }} />
          )}
          <OsmBadge source={osmFilled[field]} />
          {readonly && (
            <span style={{ marginLeft: 6, fontSize: 10, color: "#6b7280" }}>🔒 GPS verificado</span>
          )}
        </label>
        <input
          type={type}
          value={createForm[field]}
          onChange={readonly ? undefined : (e) => updateForm(field, e.target.value)}
          readOnly={readonly}
          placeholder={osmLoading ? "Cargando…" : placeholder}
          style={{
            width: "100%", padding: "7px 10px", fontSize: 13,
            border: `1px solid ${readonly ? "#e5e7eb" : "#d1d5db"}`,
            borderRadius: 7, outline: "none", boxSizing: "border-box",
            background: readonly ? "#f9fafb" : "white",
            color: readonly ? "#6b7280" : "#111827",
          }}
        />
      </div>
    );
  }

  // ─── Panel content ─────────────────────────────────────────────────────────

  function renderLinkMode() {
    return (
      <>
        {/* Peak search */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Asignar a cima de la base de datos
          </label>
          <div style={{ position: "relative" }}>
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar cima por nombre…"
              style={{
                width: "100%", padding: "8px 36px 8px 12px", fontSize: 14,
                border: "1px solid #d1d5db", borderRadius: 8,
                outline: "none", boxSizing: "border-box",
              }}
            />
            {searching && (
              <div style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid #d1d5db", borderTopColor: "#2563eb",
                animation: "geo-spin 0.7s linear infinite",
              }} />
            )}
          </div>

          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && !selectedPeak && (
            <div style={{
              marginTop: 8, padding: "9px 12px",
              background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: 8, fontSize: 12, color: "#92400e",
              display: "flex", alignItems: "flex-start", gap: 7,
            }}>
              <span style={{ flexShrink: 0, fontSize: 14 }}>⚠️</span>
              <div>
                <span style={{ fontWeight: 600 }}>Sin resultados en la base de datos</span>
                <br />
                Prueba con el nombre abreviado, en otro idioma o revisa la ortografía.
              </div>
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div style={{
            border: "1px solid #e5e7eb", borderRadius: 8,
            overflow: "hidden", marginBottom: 14,
          }}>
            {searchResults.map((peak) => (
              <button
                key={peak.id}
                onClick={() => { setSelectedPeak(peak); setSearchQuery(peak.name); setSearchResults([]); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 14px", fontSize: 13, cursor: "pointer",
                  background: selectedPeak?.id === peak.id ? "#eff6ff" : "white",
                  border: "none", borderBottom: "1px solid #f3f4f6", color: "#111827",
                }}
              >
                <span style={{ fontWeight: 600 }}>{peak.name}</span>
                <span style={{ color: "#6b7280", marginLeft: 6 }}>{peak.altitudeM} m</span>
                {peak.mountainRange && (
                  <span style={{ color: "#9ca3af", marginLeft: 6, fontSize: 12 }}>· {peak.mountainRange}</span>
                )}
                {peak.gpsVerified && (
                  <span style={{ color: "#16a34a", marginLeft: 6, fontSize: 11 }}>✓ Verificada</span>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedPeak && searchResults.length === 0 && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 8, padding: "10px 14px", marginBottom: 14,
            fontSize: 13, color: "#166534",
          }}>
            <strong>{selectedPeak.name}</strong> — {selectedPeak.altitudeM} m
            {selectedPeak.mountainRange && ` · ${selectedPeak.mountainRange}`}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={closePanel} style={{
            flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 500,
            background: "white", border: "1px solid #d1d5db",
            borderRadius: 8, cursor: "pointer", color: "#374151",
          }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedPeak || saving}
            style={{
              flex: 2, padding: "10px 0", fontSize: 14, fontWeight: 600,
              background: selectedPeak && !saving ? "#2563eb" : "#93c5fd",
              border: "none", borderRadius: 8,
              cursor: selectedPeak && !saving ? "pointer" : "not-allowed",
              color: "white",
            }}
          >
            {saving ? "Guardando…" : "Guardar coordenadas"}
          </button>
        </div>

        {/* Divider + create CTA */}
        <div style={{
          marginTop: 16, paddingTop: 14,
          borderTop: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 12, color: "#6b7280", flex: 1 }}>
            ¿No existe en la base de datos?
          </span>
          <button
            onClick={enterCreateMode}
            style={{
              padding: "8px 14px", fontSize: 12, fontWeight: 600,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 8, cursor: "pointer", color: "#166534",
              whiteSpace: "nowrap",
            }}
          >
            + Crear nueva cima
          </button>
        </div>
      </>
    );
  }

  function renderCreateMode() {
    const canSubmit = createForm.name.trim() && createForm.altitudeM && !creating && !osmLoading;
    return (
      <>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => { setPanelMode("link"); setDuplicateWarning(false); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: "#6b7280", padding: 0, display: "flex", alignItems: "center", gap: 4,
              }}
            >
              ← Volver
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Nueva cima</span>
            {osmLoading && (
              <span style={{
                display: "inline-block", width: 14, height: 14,
                borderRadius: "50%", border: "2px solid #d1d5db", borderTopColor: "#2563eb",
                animation: "geo-spin-plain 0.7s linear infinite",
              }} />
            )}
          </div>

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div style={{
              marginBottom: 12, padding: "9px 12px",
              background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: 8, fontSize: 12, color: "#92400e",
              display: "flex", alignItems: "flex-start", gap: 7,
            }}>
              <span style={{ flexShrink: 0, fontSize: 14 }}>⚠️</span>
              <div>
                <span style={{ fontWeight: 600 }}>Ya existe una cima con este nombre</span>
                <br />
                <button
                  onClick={() => { setPanelMode("link"); setSearchQuery(createForm.name); searchPeaks(createForm.name); setDuplicateWarning(false); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#d97706", fontWeight: 600, padding: 0, fontSize: 12,
                    textDecoration: "underline",
                  }}
                >
                  Enlazarla en su lugar →
                </button>
              </div>
            </div>
          )}

          <FormField label="Nombre *" field="name" placeholder="Nombre de la cima" />
          <FormField label="Altitud (m) *" field="altitudeM" type="number" placeholder="Altitud en metros" />

          {/* Readonly coords */}
          <div style={{ marginBottom: 10 }}>
            <label style={{
              fontSize: 11, fontWeight: 600, color: "#374151",
              display: "flex", alignItems: "center", marginBottom: 4, gap: 6,
            }}>
              Coordenadas
              <span style={{ fontSize: 10, color: "#6b7280" }}>🔒 GPS verificado</span>
            </label>
            <div style={{
              padding: "7px 10px", fontSize: 12, fontFamily: "monospace",
              border: "1px solid #e5e7eb", borderRadius: 7,
              background: "#f9fafb", color: "#6b7280",
            }}>
              {clickedPoint?.lat.toFixed(6)}, {clickedPoint?.lng.toFixed(6)}
            </div>
          </div>

          <FormField label="País" field="country" placeholder="ES" />
          <FormField label="Comarca / Zona" field="comarca" placeholder="Comarca o zona" />
          <FormField label="Serra / Masís" field="mountainRange" placeholder="Cadena montañosa" />

          {/* Extra fields toggle */}
          <button
            onClick={() => setShowExtraFields((v) => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "#6b7280", padding: "4px 0",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {showExtraFields ? "▾" : "▸"} Campos adicionales (tags)
          </button>
          {showExtraFields && (
            <div style={{ marginTop: 8 }}>
              <FormField label="Tag 1" field="tag1" placeholder="Tag libre" />
              <FormField label="Tag 2" field="tag2" placeholder="Tag libre" />
              <FormField label="Tag 3" field="tag3" placeholder="Tag libre" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={closePanel} style={{
            flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 500,
            background: "white", border: "1px solid #d1d5db",
            borderRadius: 8, cursor: "pointer", color: "#374151",
          }}>
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            style={{
              flex: 2, padding: "10px 0", fontSize: 14, fontWeight: 600,
              background: canSubmit ? "#16a34a" : "#86efac",
              border: "none", borderRadius: 8,
              cursor: canSubmit ? "pointer" : "not-allowed",
              color: "white",
            }}
          >
            {creating ? "Guardando…" : "Guardar cima"}
          </button>
        </div>
      </>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={{ position: "relative", height: "calc(100vh - 56px)", overflow: "hidden" }}>
      {/* Header bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", flexShrink: 0 }}>Geoposición Cimas</span>

        {/* OSM map search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <input
            type="text"
            value={mapSearch}
            onChange={(e) => handleMapSearchChange(e.target.value)}
            onFocus={() => mapSearchResults.length > 0 && setMapSearchOpen(true)}
            onBlur={() => setTimeout(() => setMapSearchOpen(false), 150)}
            placeholder="Buscar cima en el mapa…"
            style={{
              width: "100%", padding: "6px 12px 6px 32px", fontSize: 13,
              border: "1px solid #d1d5db", borderRadius: 8,
              outline: "none", boxSizing: "border-box", background: "white",
            }}
          />
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: "#9ca3af", pointerEvents: "none",
          }}>🔍</span>
          {mapSearchOpen && mapSearchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50,
              overflow: "hidden",
            }}>
              {mapSearchResults.map((r) => (
                <button
                  key={r.place_id}
                  onMouseDown={() => flyToNominatim(r)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 12px", fontSize: 12, cursor: "pointer",
                    background: "white", border: "none",
                    borderBottom: "1px solid #f3f4f6", color: "#111827",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{r.name || r.display_name.split(",")[0]}</span>
                  <span style={{ color: "#9ca3af", marginLeft: 6, fontSize: 11 }}>
                    {r.display_name.split(",").slice(1, 3).join(",").trim()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DB peaks toggle */}
        <button
          onClick={() => setShowDbPeaks((v) => !v)}
          style={{
            padding: "5px 12px", fontSize: 12, fontWeight: 600,
            background: showDbPeaks ? "#1e40af" : "white",
            border: `1px solid ${showDbPeaks ? "#1e40af" : "#d1d5db"}`,
            borderRadius: 8, cursor: "pointer",
            color: showDbPeaks ? "white" : "#374151",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}
        >
          {dbPeaksLoading ? (
            <span style={{
              display: "inline-block", width: 10, height: 10,
              borderRadius: "50%",
              border: `1.5px solid ${showDbPeaks ? "rgba(255,255,255,0.4)" : "#d1d5db"}`,
              borderTopColor: showDbPeaks ? "white" : "#2563eb",
              animation: "geo-spin-plain 0.7s linear infinite",
            }} />
          ) : (
            <span style={{ fontSize: 10, color: showDbPeaks ? "white" : "#6b7280" }}>▲</span>
          )}
          Montañas BD
        </button>

        {showDbPeaks && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {(["all", "verified", "unverified"] as const).map((f) => {
              const active = dbPeaksFilter === f;
              const colors = {
                all:        { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
                verified:   { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
                unverified: { bg: "#fff7ed", border: "#fdba74", text: "#9a3412" },
              };
              const c = colors[f];
              return (
                <button
                  key={f}
                  onClick={() => setDbPeaksFilter(f)}
                  style={{
                    padding: "4px 10px", fontSize: 11, fontWeight: 600,
                    background: active ? c.bg : "white",
                    border: `1px solid ${active ? c.border : "#e5e7eb"}`,
                    borderRadius: 6, cursor: "pointer",
                    color: active ? c.text : "#9ca3af",
                  }}
                >
                  {f === "all" ? "Todas" : f === "verified" ? "▲ Verificadas" : "▲ Sin verificar"}
                </button>
              );
            })}
          </div>
        )}

        <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
          Clic en punto rojo → asignar o crear
        </span>
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ width: "100%", height: "100%", paddingTop: 44 }} />

      {/* Selection panel */}
      {clickedPoint && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
          background: "white", borderTop: "1px solid #e2e8f0",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
          padding: "20px 20px 32px",
          maxHeight: "65vh", overflowY: "auto",
        }}>
          {/* OSM info header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                  {clickedPoint.osmName ?? "Cima sin nombre"}
                  {clickedPoint.osmEle && (
                    <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6, fontSize: 13 }}>
                      {clickedPoint.osmEle} m
                    </span>
                  )}
                  <span style={{
                    fontSize: 10, fontWeight: 600, marginLeft: 8, padding: "1px 6px",
                    borderRadius: 4, background: "#fef3c7", color: "#92400e",
                  }}>
                    OSM
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>
                  {clickedPoint.lat.toFixed(6)}, {clickedPoint.lng.toFixed(6)}
                </div>
              </div>
              <button
                onClick={closePanel}
                style={{
                  background: "none", border: "none", fontSize: 18,
                  cursor: "pointer", color: "#9ca3af", padding: "0 4px",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <style>{`
            @keyframes geo-spin { to { transform: translateY(-50%) rotate(360deg); } }
            @keyframes geo-spin-plain { to { transform: rotate(360deg); } }
          `}</style>

          {panelMode === "link" ? renderLinkMode() : renderCreateMode()}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", bottom: clickedPoint ? "calc(65vh + 16px)" : 24,
          left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#166534" : "#991b1b",
          color: "white", borderRadius: 24,
          padding: "10px 20px", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          zIndex: 30, whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
