"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Peak = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  country: string;
  mountainRange: string | null;
  comarca: string | null;
  tag1: string | null;
  tag2: string | null;
  tag3: string | null;
  osmId: string | null;
  gpsVerified: boolean;
  isMythic: boolean;
  _count: { ascents: number };
};

type EditState = Partial<Omit<Peak, "id" | "_count" | "gpsVerified" | "isMythic">> & { gpsVerified?: boolean; isMythic?: boolean };

const LIMIT = 50;

const ALTITUDE_ZONES = [
  { label: "Expedición extrema", min: 5000, color: "#7c3aed" },
  { label: "Expedición",         min: 4000, color: "#2563eb" },
  { label: "Alta montaña técnica", min: 3000, color: "#0891b2" },
  { label: "Alta montaña",       min: 2000, color: "#059669" },
  { label: "Media montaña",      min: 1000, color: "#65a30d" },
  { label: "Baja montaña",       min: 0,    color: "#ca8a04" },
];

function altZone(altM: number) {
  for (const z of ALTITUDE_ZONES) if (altM >= z.min) return z;
  return ALTITUDE_ZONES[ALTITUDE_ZONES.length - 1];
}

const ALL_COLS = ["altitude", "country", "comarca", "range", "tags", "osmId", "latlon", "gps", "mythic", "ascents"] as const;
type ColKey = typeof ALL_COLS[number];
const COL_LABELS: Record<ColKey, string> = {
  altitude: "Altitud", country: "País", comarca: "Comarca", range: "Cordillera",
  tags: "Tags", osmId: "OSM Id", latlon: "Lat/Lon", gps: "GPS ✓", mythic: "Mythic", ascents: "Asc.",
};
const DEFAULT_COLS: Record<ColKey, boolean> = {
  altitude: true, country: true, comarca: true, range: true,
  tags: true, osmId: true, latlon: false, gps: true, mythic: true, ascents: true,
};

export function PeaksClient() {
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [inputQ, setInputQ] = useState("");
  const [osmIdFilter, setOsmIdFilter] = useState<"all" | "with" | "without">("all");
  const [mythicFilter, setMythicFilter] = useState<"all" | "yes" | "no">("all");
  const [countryFilter, setCountryFilter] = useState("");
  const [inputCountry, setInputCountry] = useState("");
  const [ascentsFilter, setAscentsFilter] = useState<"all" | "with" | "without">("all");
  const [sort, setSort] = useState<"pending" | "name" | "altitude" | "ascents_desc" | "ascents_asc">("pending");
  const [loading, setLoading] = useState(false);

  // View mode and column selector
  const [viewMode, setViewMode] = useState<"table" | "country" | "altitude">("table");
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const colSelectorRef = useRef<HTMLDivElement>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPeaks = useCallback(async (
    query: string,
    pg: number,
    osmId: "all" | "with" | "without",
    mythic: "all" | "yes" | "no",
    country: string,
    ascents: "all" | "with" | "without",
    sortBy: "pending" | "name" | "altitude" | "ascents_desc" | "ascents_asc"
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, page: String(pg), limit: String(LIMIT) });
      if (osmId !== "all") params.set("osmId", osmId);
      if (mythic !== "all") params.set("mythic", mythic);
      if (country) params.set("country", country);
      if (ascents !== "all") params.set("ascents", ascents);
      params.set("sort", sortBy);
      const res = await fetch(`/api/admin/peaks?${params}`);
      const data = await res.json();
      setPeaks(data.peaks);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeaks(q, page, osmIdFilter, mythicFilter, countryFilter, ascentsFilter, sort);
  }, [q, page, osmIdFilter, mythicFilter, countryFilter, ascentsFilter, sort, fetchPeaks]);

  // Close col selector on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target as Node)) {
        setColSelectorOpen(false);
      }
    }
    if (colSelectorOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colSelectorOpen]);

  function handleSearchChange(val: string) {
    setInputQ(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setQ(val);
      setPage(1);
    }, 350);
  }

  function resetFilters() {
    setInputQ("");
    setQ("");
    setOsmIdFilter("all");
    setMythicFilter("all");
    setInputCountry("");
    setCountryFilter("");
    setAscentsFilter("all");
    setSort("pending");
    setPage(1);
  }

  const countryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleCountryChange(val: string) {
    setInputCountry(val);
    if (countryTimeout.current) clearTimeout(countryTimeout.current);
    countryTimeout.current = setTimeout(() => {
      setCountryFilter(val.trim().toUpperCase());
      setPage(1);
    }, 350);
  }

  function startEdit(peak: Peak) {
    setEditingId(peak.id);
    setEditState({
      name: peak.name,
      latitude: peak.latitude,
      longitude: peak.longitude,
      altitudeM: peak.altitudeM,
      country: peak.country,
      mountainRange: peak.mountainRange ?? "",
      comarca: peak.comarca ?? "",
      tag1: peak.tag1 ?? "",
      tag2: peak.tag2 ?? "",
      tag3: peak.tag3 ?? "",
      osmId: peak.osmId ?? "",
      gpsVerified: peak.gpsVerified,
      isMythic: peak.isMythic,
    });
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({});
    setSaveError(null);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setSaveError(null);
    try {
      const payload: EditState = { ...editState };
      for (const k of ["mountainRange", "comarca", "tag1", "tag2", "tag3", "osmId"] as const) {
        if (payload[k] === "") (payload as Record<string, unknown>)[k] = null;
      }
      const res = await fetch(`/api/admin/peaks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      setPeaks((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      setEditingId(null);
    } catch {
      setSaveError("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/peaks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Error al eliminar");
        return;
      }
      setPeaks((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => t - 1);
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  // Grouped views
  function renderCountryView() {
    const map = new Map<string, Peak[]>();
    for (const p of peaks) {
      const k = p.country || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    const entries = [...map.entries()].sort((a, b) => b[1].length - a[1].length);
    return (
      <div className="table-container">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>País</th>
                <th style={{ textAlign: "center" }}>Cimas</th>
                <th style={{ textAlign: "right" }}>% del total</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([country, ps]) => (
                <tr key={country}>
                  <td style={{ fontWeight: 600 }}>{country}</td>
                  <td style={{ textAlign: "center" }}>{ps.length}</td>
                  <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                    {((ps.length / peaks.length) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderAltitudeView() {
    return (
      <div className="rarity-pills">
        {ALTITUDE_ZONES.map(zone => {
          const count = peaks.filter(p => altZone(p.altitudeM).label === zone.label).length;
          if (count === 0) return null;
          return (
            <div
              key={zone.label}
              className="rarity-pill"
              style={{ borderColor: zone.color, color: zone.color }}
            >
              <span style={{ fontWeight: 800 }}>{count}</span>
              <span style={{ fontSize: 12 }}>{zone.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const col = (key: ColKey) => visibleCols[key];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Cimas</h1>
          <p className="page-subtitle">{total.toLocaleString("es-ES")} cima{total !== 1 ? "s" : ""} en total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Filtros</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Encuentra cimas pendientes de validar o sin uso.</div>
          </div>
          <button onClick={resetFilters} className="btn btn-secondary btn-sm">Limpiar filtros</button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <FilterLabel>OSM Id</FilterLabel>
          <div className="view-tabs">
            {([["all", "Todas"], ["with", "Con OsmId"], ["without", "Sin OsmId"]] as const).map(([val, label]) => (
              <button
                key={val}
                className={`view-tab${osmIdFilter === val ? " active" : ""}`}
                onClick={() => { setOsmIdFilter(val); setPage(1); }}
              >{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <FilterLabel>Mythic</FilterLabel>
          <div className="view-tabs">
            {([["all", "Todas"], ["yes", "Mythic"], ["no", "No mythic"]] as const).map(([val, label]) => (
              <button
                key={val}
                className={`view-tab${mythicFilter === val ? " active" : ""}`}
                onClick={() => { setMythicFilter(val); setPage(1); }}
              >{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <FilterLabel>País</FilterLabel>
          <input
            type="text"
            className="form-input"
            placeholder="ES, FR, DE…"
            value={inputCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            style={{ width: 100, textTransform: "uppercase" }}
            maxLength={2}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <FilterLabel>Ascensiones</FilterLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {([["all", "Todas"], ["with", "Con"], ["without", "Sin"]] as const).map(([val, label]) => (
              <button
                key={val}
                className={`btn${ascentsFilter === val ? " btn-primary" : " btn-secondary"} btn-sm`}
                onClick={() => { setAscentsFilter(val); setPage(1); }}
              >{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="search-box" style={{ flex: 1, minWidth: 260, maxWidth: 520 }}>
            <svg className="search-box-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre, comarca, cordillera, tag o país..."
              value={inputQ}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }}
            className="form-input"
            style={{ width: "auto" }}
          >
            <option value="pending">Pendientes primero</option>
            <option value="name">Nombre A-Z</option>
            <option value="altitude">Altitud</option>
            <option value="ascents_desc">Más ascensiones</option>
            <option value="ascents_asc">Menos ascensiones</option>
          </select>
          {loading && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando...</span>}
        </div>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="alert-block" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
          {deleteError}
          <button onClick={() => setDeleteError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}

      {/* View toggle + column selector */}
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div className="view-tabs">
          <button className={`view-tab${viewMode === "table" ? " active" : ""}`} onClick={() => setViewMode("table")}>Tabla</button>
          <button className={`view-tab${viewMode === "altitude" ? " active" : ""}`} onClick={() => setViewMode("altitude")}>Por altitud</button>
          <button className={`view-tab${viewMode === "country" ? " active" : ""}`} onClick={() => setViewMode("country")}>Por país</button>
        </div>

        {viewMode === "table" && (
          <div className="col-selector" ref={colSelectorRef}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setColSelectorOpen(o => !o)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              Columnas
            </button>
            <div className={`col-selector-popover${colSelectorOpen ? " open" : ""}`}>
              <div className="col-selector-title">Columnas visibles</div>
              {ALL_COLS.map(key => (
                <label key={key} className="col-selector-item">
                  <input
                    type="checkbox"
                    checked={visibleCols[key]}
                    onChange={e => setVisibleCols(prev => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {COL_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Views */}
      {viewMode === "altitude" && renderAltitudeView()}
      {viewMode === "country" && renderCountryView()}

      {viewMode === "table" && (
        <>
          <div className="table-container">
            {peaks.length === 0 && !loading ? (
              <div className="empty-state">
                {q ? `No se encontraron cimas para "${q}"` : "No hay cimas."}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      {col("altitude") && <th style={{ textAlign: "right" }}>Alt (m)</th>}
                      {col("country") && <th>País</th>}
                      {col("comarca") && <th>Comarca</th>}
                      {col("range") && <th>Cordillera</th>}
                      {col("tags") && <th>Tags</th>}
                      {col("osmId") && <th>OSM Id</th>}
                      {col("latlon") && <th style={{ textAlign: "center" }}>Lat / Lon</th>}
                      {col("gps") && <th style={{ textAlign: "center" }}>GPS ✓</th>}
                      {col("mythic") && <th style={{ textAlign: "center" }}>Mythic</th>}
                      {col("ascents") && <th style={{ textAlign: "center" }}>Asc.</th>}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {peaks.map((peak, i) =>
                      editingId === peak.id ? (
                        <EditRowWithWiki
                          key={peak.id}
                          peak={peak}
                          state={editState}
                          onChange={(k, v) => setEditState((prev) => ({ ...prev, [k]: v }))}
                          onSave={() => saveEdit(peak.id)}
                          onCancel={cancelEdit}
                          saving={saving}
                          error={saveError}
                          isLast={i === peaks.length - 1}
                          visibleCols={visibleCols}
                        />
                      ) : (
                        <ViewRow
                          key={peak.id}
                          peak={peak}
                          isLast={i === peaks.length - 1}
                          onEdit={() => startEdit(peak)}
                          onDelete={() => handleDelete(peak.id)}
                          deleting={deletingId === peak.id}
                          visibleCols={visibleCols}
                          onToggleGps={async () => {
                            const res = await fetch(`/api/admin/peaks/${peak.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ gpsVerified: !peak.gpsVerified }),
                            });
                            if (res.ok) {
                              const updated = await res.json();
                              setPeaks((prev) => prev.map((p) => p.id === peak.id ? { ...p, gpsVerified: updated.gpsVerified } : p));
                            }
                          }}
                          onToggleMythic={async () => {
                            const res = await fetch(`/api/admin/peaks/${peak.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ isMythic: !peak.isMythic }),
                            });
                            if (res.ok) {
                              const updated = await res.json();
                              setPeaks((prev) => prev.map((p) => p.id === peak.id ? { ...p, isMythic: updated.isMythic } : p));
                            }
                          }}
                        />
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 20 }}>
              <PagBtn disabled={page === 1} onClick={() => setPage(1)}>«</PagBtn>
              <PagBtn disabled={page === 1} onClick={() => setPage(page - 1)}>‹</PagBtn>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", padding: "0 8px" }}>
                Página {page} de {totalPages} · {total.toLocaleString("es-ES")} cimas
              </span>
              <PagBtn disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</PagBtn>
              <PagBtn disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</PagBtn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)", minWidth: 80 }}>
      {children}
    </span>
  );
}

function ViewRow({
  peak, isLast, onEdit, onDelete, deleting, onToggleGps, onToggleMythic, visibleCols,
}: {
  peak: Peak; isLast: boolean; onEdit: () => void; onDelete: () => void; deleting: boolean;
  onToggleGps: () => void; onToggleMythic: () => void; visibleCols: Record<ColKey, boolean>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const col = (key: ColKey) => visibleCols[key];

  return (
    <tr>
      <td style={{ fontWeight: 600, fontSize: 13 }}>{peak.name}</td>
      {col("altitude") && (
        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
          {peak.altitudeM.toLocaleString("es-ES")}
        </td>
      )}
      {col("country") && (
        <td><span className="badge badge-neutral">{peak.country}</span></td>
      )}
      {col("comarca") && (
        <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {peak.comarca ?? <em style={{ color: "var(--text-muted)" }}>—</em>}
        </td>
      )}
      {col("range") && (
        <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {peak.mountainRange ?? <em style={{ color: "var(--text-muted)" }}>—</em>}
        </td>
      )}
      {col("tags") && (
        <td>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[peak.tag1, peak.tag2, peak.tag3].filter(Boolean).map((t) => (
              <span key={t} className="badge badge-info">{t}</span>
            ))}
            {!peak.tag1 && !peak.tag2 && !peak.tag3 && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>}
          </div>
        </td>
      )}
      {col("osmId") && (
        <td style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-secondary)" }}>
          {peak.osmId ?? <em style={{ color: "var(--text-muted)" }}>—</em>}
        </td>
      )}
      {col("latlon") && (
        <td style={{ textAlign: "center", fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
          {peak.latitude.toFixed(4)}, {peak.longitude.toFixed(4)}
        </td>
      )}
      {col("gps") && (
        <td style={{ textAlign: "center" }}>
          <button onClick={onToggleGps} title={peak.gpsVerified ? "GPS verificado — click para desmarcar" : "No verificado"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 2 }}>
            {peak.gpsVerified ? "✅" : "⬜"}
          </button>
        </td>
      )}
      {col("mythic") && (
        <td style={{ textAlign: "center" }}>
          <button onClick={onToggleMythic} title={peak.isMythic ? "Mythic" : "Normal"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 2 }}>
            {peak.isMythic ? "⭐" : "⬜"}
          </button>
        </td>
      )}
      {col("ascents") && (
        <td style={{ textAlign: "center", fontWeight: peak._count.ascents > 0 ? 600 : undefined, color: peak._count.ascents === 0 ? "var(--text-muted)" : undefined }}>
          {peak._count.ascents || "—"}
        </td>
      )}
      <td style={{ whiteSpace: "nowrap" }}>
        <div className="action-btns">
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>Editar</button>
          {!confirmDelete ? (
            <button
              className="btn btn-sm"
              onClick={() => setConfirmDelete(true)}
              disabled={peak._count.ascents > 0}
              title={peak._count.ascents > 0 ? `Tiene ${peak._count.ascents} ascensión(es)` : "Eliminar"}
              style={{
                border: "1px solid var(--color-red-soft)", color: "var(--color-red)",
                background: "none", cursor: peak._count.ascents > 0 ? "not-allowed" : "pointer",
                opacity: peak._count.ascents > 0 ? 0.35 : 1,
              }}
            >Eliminar</button>
          ) : (
            <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--color-red)" }}>¿Seguro?</span>
              <button className="btn btn-danger btn-sm" onClick={() => { setConfirmDelete(false); onDelete(); }} disabled={deleting}>
                {deleting ? "..." : "Sí"}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>No</button>
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function EditRowWithWiki(props: Parameters<typeof EditRow>[0]) {
  return (
    <>
      <EditRow {...props} isLast={false} />
      <WikiRow peakId={props.peak.id} isLast={props.isLast} visibleCols={props.visibleCols} />
    </>
  );
}

function EditRow({
  peak, state, onChange, onSave, onCancel, saving, error, isLast, visibleCols,
}: {
  peak: Peak; state: EditState;
  onChange: (k: keyof EditState, v: string | number | boolean) => void;
  onSave: () => void; onCancel: () => void; saving: boolean; error: string | null;
  isLast: boolean; visibleCols: Record<ColKey, boolean>;
}) {
  const col = (key: ColKey) => visibleCols[key];

  function inp(k: keyof EditState, type = "text", width: number | string = "100%") {
    return (
      <input
        type={type}
        value={state[k] as string ?? ""}
        onChange={(e) => onChange(k, type === "number" ? Number(e.target.value) : e.target.value)}
        className="form-input inline-input"
        style={{ width, boxSizing: "border-box" as const }}
      />
    );
  }

  const colSpan = 1 + (col("altitude") ? 1 : 0) + (col("country") ? 1 : 0) + (col("comarca") ? 1 : 0) +
    (col("range") ? 1 : 0) + (col("tags") ? 1 : 0) + (col("osmId") ? 1 : 0) + (col("latlon") ? 1 : 0) +
    (col("gps") ? 1 : 0) + (col("mythic") ? 1 : 0) + (col("ascents") ? 1 : 0) + 1;

  return (
    <>
      <tr style={{ background: "var(--bg-secondary)" }}>
        <td>{inp("name")}</td>
        {col("altitude") && <td style={{ textAlign: "right" }}>{inp("altitudeM", "number", 72)}</td>}
        {col("country") && <td>{inp("country", "text", 48)}</td>}
        {col("comarca") && <td>{inp("comarca")}</td>}
        {col("range") && <td>{inp("mountainRange")}</td>}
        {col("tags") && (
          <td>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {inp("tag1")}{inp("tag2")}{inp("tag3")}
            </div>
          </td>
        )}
        {col("osmId") && <td>{inp("osmId")}</td>}
        {col("latlon") && (
          <td style={{ textAlign: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {inp("latitude", "number")}{inp("longitude", "number")}
            </div>
          </td>
        )}
        {col("gps") && (
          <td style={{ textAlign: "center" }}>
            <input type="checkbox" checked={state.gpsVerified ?? false}
              onChange={(e) => onChange("gpsVerified", e.target.checked as unknown as string)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
          </td>
        )}
        {col("mythic") && (
          <td style={{ textAlign: "center" }}>
            <input type="checkbox" checked={state.isMythic ?? false}
              onChange={(e) => onChange("isMythic", e.target.checked as unknown as string)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#f59e0b" }} />
          </td>
        )}
        {col("ascents") && (
          <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {peak._count.ascents}
          </td>
        )}
        <td style={{ whiteSpace: "nowrap" }}>
          <div className="action-btns">
            <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
              {saving ? "..." : "Guardar"}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancelar</button>
          </div>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={colSpan} style={{ padding: "6px 16px", fontSize: 12, color: "var(--color-red)", background: "var(--color-red-soft)" }}>
            {error}
          </td>
        </tr>
      )}
    </>
  );
}

function PagBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button className={`btn btn-secondary btn-sm`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ── Wiki row ──────────────────────────────────────────────────────────────────

type WikiText = { id: string; lang: string; title: string; body: string; wikiUrl: string };

function WikiRow({ peakId, isLast, visibleCols }: { peakId: string; isLast: boolean; visibleCols: Record<ColKey, boolean> }) {
  const [wikiTexts, setWikiTexts] = useState<WikiText[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colSpan = 1 + (visibleCols.altitude ? 1 : 0) + (visibleCols.country ? 1 : 0) + (visibleCols.comarca ? 1 : 0) +
    (visibleCols.range ? 1 : 0) + (visibleCols.tags ? 1 : 0) + (visibleCols.osmId ? 1 : 0) + (visibleCols.latlon ? 1 : 0) +
    (visibleCols.gps ? 1 : 0) + (visibleCols.mythic ? 1 : 0) + (visibleCols.ascents ? 1 : 0) + 1;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/peaks/${peakId}/wiki`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
        setWikiTexts(d.wikiTexts ?? []);
      })
      .catch((e) => setError(`Error al cargar textos: ${e.message}`))
      .finally(() => setLoading(false));
  }, [peakId]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/peaks/${peakId}/wiki`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`);
      setWikiTexts(d.wikiTexts ?? []);
    } catch (e) {
      setError(`Error: ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  }

  const langEmoji: Record<string, string> = { en: "🇬🇧", es: "🇪🇸", ca: "🏴󠁥󠁳󠁣󠁴󠁿", fr: "🇫🇷", de: "🇩🇪" };

  return (
    <tr style={{ background: "var(--bg-secondary)" }}>
      <td colSpan={colSpan} style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Textos Wikipedia
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Buscando…" : "🔄 Actualizar desde Wikipedia"}
          </button>
        </div>
        {loading ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Cargando…</span>
        ) : error ? (
          <span style={{ fontSize: 12, color: "var(--color-red)" }}>{error}</span>
        ) : wikiTexts.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{'Sin textos guardados — pulsa "Actualizar desde Wikipedia" para buscar.'}</span>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {wikiTexts.map((wt) => (
              <div key={wt.lang} className="card" style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{langEmoji[wt.lang] ?? "🌐"}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{wt.lang}</span>
                  <a href={wt.wikiUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--color-gentian)", marginLeft: 2, textDecoration: "none" }}>
                    {wt.title} ↗
                  </a>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {wt.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

// Unused but kept to avoid breaking existing import in case page references it
export type { Peak };
