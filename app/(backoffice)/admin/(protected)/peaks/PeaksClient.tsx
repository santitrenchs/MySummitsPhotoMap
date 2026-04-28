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
  gpsVerified: boolean;
  isMythic: boolean;
  _count: { ascents: number };
};

type EditState = Partial<Omit<Peak, "id" | "_count" | "gpsVerified" | "isMythic">> & { gpsVerified?: boolean; isMythic?: boolean };

const LIMIT = 50;

export function PeaksClient() {
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [inputQ, setInputQ] = useState("");
  const [gpsFilter, setGpsFilter] = useState<"all" | "yes" | "no">("all");
  const [ascentsFilter, setAscentsFilter] = useState<"all" | "with" | "without">("all");
  const [sort, setSort] = useState<"pending" | "name" | "altitude" | "ascents_desc" | "ascents_asc">("pending");
  const [loading, setLoading] = useState(false);

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
    gps: "all" | "yes" | "no",
    ascents: "all" | "with" | "without",
    sortBy: "pending" | "name" | "altitude" | "ascents_desc" | "ascents_asc"
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, page: String(pg), limit: String(LIMIT) });
      if (gps !== "all") params.set("gpsVerified", gps);
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
    fetchPeaks(q, page, gpsFilter, ascentsFilter, sort);
  }, [q, page, gpsFilter, ascentsFilter, sort, fetchPeaks]);

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
    setGpsFilter("all");
    setAscentsFilter("all");
    setSort("pending");
    setPage(1);
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
      // Normalize empty strings to null
      for (const k of ["mountainRange", "comarca", "tag1", "tag2", "tag3"] as const) {
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Cimas</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            {total.toLocaleString("es-ES")} cima{total !== 1 ? "s" : ""} en total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        marginBottom: 16,
        padding: 14,
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Filtros</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Encuentra rápido cimas pendientes de validar o todavía sin uso.</div>
          </div>
          <button
            onClick={resetFilters}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#64748b",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Limpiar filtros
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <FilterLabel>Estado</FilterLabel>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: 4,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 999,
          }}>
            {([
              ["all", "Todas"],
              ["yes", "Verificadas"],
              ["no", "Sin verificar"],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setGpsFilter(val); setPage(1); }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: gpsFilter === val ? "#0f172a" : "transparent",
                  color: gpsFilter === val ? "white" : "#64748b",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <FilterLabel>Ascensiones</FilterLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {([
              ["all", "Todas"],
              ["with", "Con ascensiones"],
              ["without", "Sin ascensiones"],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setAscentsFilter(val); setPage(1); }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: ascentsFilter === val ? "#bae6fd" : "#e2e8f0",
                  background: ascentsFilter === val ? "#eff6ff" : "#fff",
                  color: ascentsFilter === val ? "#0369a1" : "#64748b",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 260, maxWidth: 520 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 15 }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre, comarca, cordillera, tag o país..."
              value={inputQ}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1px solid #e2e8f0", borderRadius: 10,
                padding: "10px 12px 10px 36px", fontSize: 14,
                color: "#0f172a", outline: "none", background: "#fff",
              }}
            />
            {inputQ && (
              <button
                onClick={() => { setInputQ(""); handleSearchChange(""); }}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}
              >×</button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FilterLabel>Ordenar</FilterLabel>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "white",
                color: "#334155",
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 600,
                outline: "none",
              }}
            >
              <option value="pending">Pendientes primero</option>
              <option value="name">Nombre A-Z</option>
              <option value="altitude">Altitud</option>
              <option value="ascents_desc">Más ascensiones</option>
              <option value="ascents_asc">Menos ascensiones</option>
            </select>
          </div>

          {loading && <span style={{ fontSize: 13, color: "#94a3b8" }}>Cargando...</span>}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
            {total.toLocaleString("es-ES")} resultado{total !== 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>·</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {gpsFilter === "all" ? "Todas las cimas" : gpsFilter === "yes" ? "Solo verificadas" : "Solo sin verificar"}
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>·</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {ascentsFilter === "all" ? "Con y sin ascensiones" : ascentsFilter === "with" ? "Con ascensiones" : "Sin ascensiones"}
          </span>
        </div>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#b91c1c", display: "flex", justifyContent: "space-between" }}>
          {deleteError}
          <button onClick={() => setDeleteError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {peaks.length === 0 && !loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {q ? `No se encontraron cimas para "${q}"` : "No hay cimas."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <Th>Nombre</Th>
                  <Th align="right">Alt (m)</Th>
                  <Th>País</Th>
                  <Th>Comarca</Th>
                  <Th>Cordillera</Th>
                  <Th>Tags</Th>
                  <Th align="center">Lat / Lon</Th>
                  <Th align="center">GPS ✓</Th>
                  <Th align="center">Mythic</Th>
                  <Th align="center">Asc.</Th>
                  <Th />
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
                    />
                  ) : (
                    <ViewRow
                      key={peak.id}
                      peak={peak}
                      isLast={i === peaks.length - 1}
                      onEdit={() => startEdit(peak)}
                      onDelete={() => handleDelete(peak.id)}
                      deleting={deletingId === peak.id}
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
          <span style={{ fontSize: 13, color: "#64748b", padding: "0 8px" }}>
            Página {page} de {totalPages} · {total.toLocaleString("es-ES")} cimas
          </span>
          <PagBtn disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</PagBtn>
          <PagBtn disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</PagBtn>
        </div>
      )}
    </div>
  );
}

// ── View row ──────────────────────────────────────────────────────────────────

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "#64748b",
    }}>
      {children}
    </span>
  );
}

function ViewRow({
  peak, isLast, onEdit, onDelete, deleting, onToggleGps, onToggleMythic,
}: {
  peak: Peak;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  onToggleGps: () => void;
  onToggleMythic: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <tr style={{ borderBottom: isLast ? "none" : "1px solid #f1f5f9" }}>
      <td style={tdStyle}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{peak.name}</span>
      </td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", fontVariantNumeric: "tabular-nums" }}>
          {peak.altitudeM.toLocaleString("es-ES")}
        </span>
      </td>
      <td style={tdStyle}>
        <span style={{ fontSize: 12, background: "#f1f5f9", color: "#334155", borderRadius: 5, padding: "2px 7px", fontWeight: 600 }}>
          {peak.country}
        </span>
      </td>
      <td style={tdStyle}>
        <span style={{ fontSize: 12, color: "#64748b" }}>{peak.comarca ?? <em style={{ color: "#cbd5e1" }}>—</em>}</span>
      </td>
      <td style={tdStyle}>
        <span style={{ fontSize: 12, color: "#64748b" }}>{peak.mountainRange ?? <em style={{ color: "#cbd5e1" }}>—</em>}</span>
      </td>
      <td style={tdStyle}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[peak.tag1, peak.tag2, peak.tag3].filter(Boolean).map((t) => (
            <span key={t} style={{ fontSize: 11, background: "#eff6ff", color: "#2563eb", borderRadius: 5, padding: "2px 7px", fontWeight: 600 }}>
              {t}
            </span>
          ))}
          {!peak.tag1 && !peak.tag2 && !peak.tag3 && <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span>}
        </div>
      </td>
      <td style={{ ...tdStyle, textAlign: "center" }}>
        <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
          {peak.latitude.toFixed(4)}, {peak.longitude.toFixed(4)}
        </span>
      </td>
      <td style={{ ...tdStyle, textAlign: "center" }}>
        <button
          onClick={onToggleGps}
          title={peak.gpsVerified ? "GPS verificado — click para desmarcar" : "No verificado — click para marcar"}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 2 }}
        >
          {peak.gpsVerified ? "✅" : "⬜"}
        </button>
      </td>
      <td style={{ ...tdStyle, textAlign: "center" }}>
        <button
          onClick={onToggleMythic}
          title={peak.isMythic ? "Mythic — click para desmarcar" : "Normal — click para marcar como Mythic"}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 2 }}
        >
          {peak.isMythic ? "⭐" : "⬜"}
        </button>
      </td>
      <td style={{ ...tdStyle, textAlign: "center" }}>
        {peak._count.ascents > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{peak._count.ascents}</span>
        ) : (
          <span style={{ fontSize: 12, color: "#cbd5e1" }}>0</span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
        <button
          onClick={onEdit}
          style={{ background: "none", border: "1px solid #e2e8f0", color: "#334155", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", marginRight: 6 }}
        >
          Editar
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={peak._count.ascents > 0}
            title={peak._count.ascents > 0 ? `Tiene ${peak._count.ascents} ascensión(es)` : "Eliminar"}
            style={{
              background: "none", border: "1px solid #fecaca", color: "#ef4444",
              borderRadius: 6, padding: "4px 10px", fontSize: 12,
              cursor: peak._count.ascents > 0 ? "not-allowed" : "pointer",
              opacity: peak._count.ascents > 0 ? 0.35 : 1,
            }}
          >
            Eliminar
          </button>
        ) : (
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#ef4444" }}>¿Seguro?</span>
            <button
              onClick={() => { setConfirmDelete(false); onDelete(); }}
              disabled={deleting}
              style={{ background: "#ef4444", border: "none", color: "white", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}
            >
              {deleting ? "..." : "Sí"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ background: "none", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}
            >
              No
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

// ── Edit row + Wiki row (combined, because tbody can't use fragments in all contexts) ─

function EditRowWithWiki(props: Parameters<typeof EditRow>[0]) {
  return (
    <>
      <EditRow {...props} isLast={false} />
      <WikiRow peakId={props.peak.id} isLast={props.isLast} />
    </>
  );
}

// ── Edit row ──────────────────────────────────────────────────────────────────

function EditRow({
  peak, state, onChange, onSave, onCancel, saving, error, isLast,
}: {
  peak: Peak;
  state: EditState;
  onChange: (k: keyof EditState, v: string | number | boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  isLast: boolean;
}) {
  function inp(k: keyof EditState, type = "text", width: number | string = "100%") {
    return (
      <input
        type={type}
        value={state[k] as string ?? ""}
        onChange={(e) => onChange(k, type === "number" ? Number(e.target.value) : e.target.value)}
        style={{
          border: "1px solid #93c5fd", borderRadius: 6,
          padding: "4px 7px", fontSize: 12, color: "#0f172a",
          outline: "none", width, boxSizing: "border-box" as const,
          background: "#eff6ff",
        }}
      />
    );
  }

  return (
    <>
      <tr style={{ background: "#f0f9ff", borderBottom: error ? "none" : isLast ? "none" : "1px solid #bfdbfe" }}>
        <td style={tdStyle}>{inp("name")}</td>
        <td style={{ ...tdStyle, textAlign: "right" }}>{inp("altitudeM", "number", 72)}</td>
        <td style={tdStyle}>{inp("country", "text", 48)}</td>
        <td style={tdStyle}>{inp("comarca")}</td>
        <td style={tdStyle}>{inp("mountainRange")}</td>
        <td style={tdStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {inp("tag1")}
            {inp("tag2")}
            {inp("tag3")}
          </div>
        </td>
        <td style={{ ...tdStyle, textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {inp("latitude", "number")}
            {inp("longitude", "number")}
          </div>
        </td>
        <td style={{ ...tdStyle, textAlign: "center" }}>
          <input
            type="checkbox"
            checked={state.gpsVerified ?? false}
            onChange={(e) => onChange("gpsVerified", e.target.checked as unknown as string)}
            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }}
          />
        </td>
        <td style={{ ...tdStyle, textAlign: "center" }}>
          <input
            type="checkbox"
            checked={state.isMythic ?? false}
            onChange={(e) => onChange("isMythic", e.target.checked as unknown as string)}
            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#f59e0b" }}
          />
        </td>
        <td style={{ ...tdStyle, textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{peak._count.ascents}</span>
        </td>
        <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              background: "#0f172a", border: "none", color: "white",
              borderRadius: 6, padding: "5px 12px", fontSize: 12,
              fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1, marginRight: 6,
            }}
          >
            {saving ? "..." : "Guardar"}
          </button>
          <button
            onClick={onCancel}
            style={{
              background: "none", border: "1px solid #e2e8f0", color: "#64748b",
              borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </td>
      </tr>
      {error && (
        <tr style={{ background: "#fef2f2", borderBottom: isLast ? "none" : "1px solid #fecaca" }}>
          <td colSpan={10} style={{ padding: "6px 16px", fontSize: 12, color: "#b91c1c" }}>
            {error}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Th({ children, align }: { children?: React.ReactNode; align?: "center" | "right" }) {
  return (
    <th style={{
      padding: "10px 16px", textAlign: align ?? "left",
      fontSize: 11, fontWeight: 600, color: "#64748b",
      textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}

function PagBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "white", border: "1px solid #e2e8f0", borderRadius: 6,
        padding: "5px 10px", fontSize: 13, cursor: disabled ? "default" : "pointer",
        color: disabled ? "#cbd5e1" : "#334155",
      }}
    >
      {children}
    </button>
  );
}

const tdStyle: React.CSSProperties = { padding: "10px 16px", verticalAlign: "middle" };

// ── Wiki row ──────────────────────────────────────────────────────────────────

type WikiText = { id: string; lang: string; title: string; extract: string };

function WikiRow({ peakId, isLast }: { peakId: string; isLast: boolean }) {
  const [wikiTexts, setWikiTexts] = useState<WikiText[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/peaks/${peakId}/wiki`)
      .then((r) => r.json())
      .then((d) => setWikiTexts(d.wikiTexts ?? []))
      .catch(() => setError("Error al cargar textos"))
      .finally(() => setLoading(false));
  }, [peakId]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/peaks/${peakId}/wiki`, { method: "POST" });
      const d = await res.json();
      setWikiTexts(d.wikiTexts ?? []);
    } catch {
      setError("Error al actualizar desde Wikipedia");
    } finally {
      setRefreshing(false);
    }
  }

  const langEmoji: Record<string, string> = { en: "🇬🇧", es: "🇪🇸", ca: "🏴󠁥󠁳󠁣󠁴󠁿", fr: "🇫🇷", de: "🇩🇪" };

  return (
    <tr style={{ background: "#f8fafc", borderBottom: isLast ? "none" : "1px solid #bfdbfe" }}>
      <td colSpan={11} style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Textos Wikipedia
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff",
              color: "#334155", fontSize: 12, fontWeight: 600, padding: "4px 10px",
              cursor: refreshing ? "not-allowed" : "pointer", opacity: refreshing ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {refreshing ? "Buscando…" : "🔄 Actualizar desde Wikipedia"}
          </button>
        </div>
        {loading ? (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Cargando…</span>
        ) : error ? (
          <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>
        ) : wikiTexts.length === 0 ? (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Sin textos guardados — pulsa "Actualizar desde Wikipedia" para buscar.</span>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {wikiTexts.map((wt) => (
              <div key={wt.lang} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{langEmoji[wt.lang] ?? "🌐"}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{wt.lang}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 2 }}>· {wt.title}</span>
                </div>
                <p style={{
                  fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.55,
                  display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {wt.extract}
                </p>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
