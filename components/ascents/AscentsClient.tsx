"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";
import { AscentCard } from "@/components/cards/AscentCard";

export type AscentData = {
  id: string;
  date: string;
  route: string | null;
  description: string | null;
  peak: { id: string; name: string; altitudeM: number; mountainRange: string | null; latitude: number; longitude: number };
  firstPhotoId: string | null;
  firstPhotoUrl: string | null;
  persons: { id: string; name: string; email?: string | null }[];
  isOwn: boolean;
  userName: string;
  userAvatarUrl: string | null;
};

type Sort = "date-desc" | "date-asc" | "elev-desc" | "name-asc";
type ViewChip = "all" | "mine" | "with-someone" | "person";

// ─── Person picker (searchable, fixed-height scrollable list) ────────────────

function PersonPicker({
  persons,
  selectedId,
  onSelect,
  onClear,
}: {
  persons: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState("");
  const matches = q.trim()
    ? persons.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    : persons;

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar persona…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: "100%", padding: "8px 14px", fontSize: 13,
          border: "1.5px solid #e5e7eb", borderRadius: 20,
          outline: "none", background: "#f9fafb", boxSizing: "border-box",
          marginBottom: 8,
        }}
      />
      <div style={{ height: 180, overflowY: "auto", borderRadius: 12, border: "1px solid #f3f4f6" }}>
        {selectedId && (
          <button
            onClick={onClear}
            style={{
              width: "100%", padding: "10px 14px", textAlign: "left",
              background: "none", border: "none", borderBottom: "1px solid #f3f4f6",
              fontSize: 13, color: "#ef4444", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ✕ Quitar filtro de persona
          </button>
        )}
        {matches.length === 0 && (
          <p style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin resultados</p>
        )}
        {matches.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              width: "100%", padding: "11px 14px", textAlign: "left",
              background: selectedId === p.id ? "#eff6ff" : "none",
              border: "none", borderBottom: "1px solid #f9fafb",
              fontSize: 14, color: selectedId === p.id ? "#0369a1" : "#111827",
              fontWeight: selectedId === p.id ? 700 : 400, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            {p.name}
            {selectedId === p.id && <span style={{ fontSize: 12 }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function AscentsClient({
  ascents,
  allPersons,
  allYears,
  currentUserEmail,
  currentUserName,
}: {
  ascents: AscentData[];
  allPersons: { id: string; name: string }[];
  allYears: number[];
  currentUserEmail?: string | null;
  currentUserName?: string;
}) {
  const t = useT();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [viewChip, setViewChip] = useState<ViewChip>("all");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [sort, setSort] = useState<Sort>("date-desc");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Peak filter seeded from ?peak= URL param
  const [peakFilter, setPeakFilter] = useState<string>(() => searchParams.get("peak") ?? "");
  const peakFilterName = peakFilter
    ? (ascents.find((a) => a.peak.id === peakFilter)?.peak.name ?? "")
    : "";


  const selectedPerson = allPersons.find((p) => p.id === selectedPersonId);

  const SORT_LABELS: Record<Sort, string> = {
    "date-desc": t.ascents_sort_newest,
    "date-asc": t.ascents_sort_oldest,
    "elev-desc": t.ascents_sort_highest,
    "name-asc": t.ascents_sort_az,
  };

  const activeFilterCount = [
    viewChip !== "all",
    yearFilter !== "",
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    let r = ascents;

    // Peak filter (from map URL param)
    if (peakFilter) r = r.filter((a) => a.peak.id === peakFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (a) =>
          a.peak.name.toLowerCase().includes(q) ||
          (a.route ?? "").toLowerCase().includes(q) ||
          a.persons.some((p) => p.name.toLowerCase().includes(q))
      );
    }

    // View chip
    if (viewChip === "mine") r = r.filter((a) => a.isOwn);
    else if (viewChip === "with-someone") r = r.filter((a) => a.persons.length > 0);
    else if (viewChip === "person" && selectedPersonId) r = r.filter((a) => a.persons.some((p) => p.id === selectedPersonId));

    // Advanced: year
    if (yearFilter !== "") r = r.filter((a) => new Date(a.date).getFullYear() === yearFilter);

    return [...r].sort((a, b) => {
      if (sort === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sort === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sort === "elev-desc") return b.peak.altitudeM - a.peak.altitudeM;
      return a.peak.name.localeCompare(b.peak.name);
    });
  }, [ascents, peakFilter, search, viewChip, selectedPersonId, yearFilter, sort]);


  const summaryChip: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 20, padding: "4px 10px 4px 12px",
    fontSize: 13, fontWeight: 600, color: "#0369a1",
  };
  const chipX: React.CSSProperties = {
    cursor: "pointer", fontSize: 11, fontWeight: 700,
    background: "#bfdbfe", borderRadius: "50%",
    width: 16, height: 16, display: "inline-flex",
    alignItems: "center", justifyContent: "center",
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px",
  };
  const chipRow: React.CSSProperties = {
    display: "flex", gap: 8, flexWrap: "wrap",
  };

  return (
    <>
      <style>{`
        .asc-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 8px 16px; border-radius: 24px; border: 1.5px solid #e5e7eb;
          background: white; color: #6b7280; font-size: 13px; font-weight: 600;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
          transition: background 0.12s, color 0.12s, border-color 0.12s;
          -webkit-tap-highlight-color: transparent;
        }
        .asc-chip.active { background: #0369a1; color: white; border-color: #0369a1; }
        .asc-chip:active { opacity: 0.8; }
      `}</style>

      {/* ── Search + filter button ────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder={t.ascents_search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, padding: "10px 18px", fontSize: 14,
            border: "1.5px solid #e5e7eb", borderRadius: 24,
            outline: "none", background: "white", boxSizing: "border-box",
          }}
        />
        <button
          onClick={() => setFiltersOpen(true)}
          style={{
            padding: "10px 16px", borderRadius: 24, border: "1.5px solid #e5e7eb",
            background: activeFilterCount > 0 ? "#0369a1" : "white",
            color: activeFilterCount > 0 ? "white" : "#6b7280",
            fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ⚙️ {t.ascents_filters}{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
      </div>

      {/* ── Active filter summary chips ───────────────────────────── */}
      {(viewChip !== "all" || yearFilter !== "" || peakFilter) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {viewChip === "mine" && (
            <div style={summaryChip}>Mías <span onClick={() => setViewChip("all")} style={chipX}>✕</span></div>
          )}
          {viewChip === "with-someone" && (
            <div style={summaryChip}>Con alguien <span onClick={() => setViewChip("all")} style={chipX}>✕</span></div>
          )}
          {viewChip === "person" && selectedPerson && (
            <div style={summaryChip}>{selectedPerson.name} <span onClick={() => { setViewChip("all"); setSelectedPersonId(""); }} style={chipX}>✕</span></div>
          )}
          {yearFilter !== "" && (
            <div style={summaryChip}>{yearFilter} <span onClick={() => setYearFilter("")} style={chipX}>✕</span></div>
          )}
          {peakFilter && peakFilterName && (
            <div style={summaryChip}>⛰️ {peakFilterName} <span onClick={() => { setPeakFilter(""); const u = new URL(window.location.href); u.searchParams.delete("peak"); window.history.replaceState(null,"",u.toString()); }} style={chipX}>✕</span></div>
          )}
        </div>
      )}

      {/* ── Filter bottom sheet ───────────────────────────────────── */}
      {filtersOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end" }}
          onClick={() => setFiltersOpen(false)}
        >
          <div
            style={{ width: "100%", background: "white", borderRadius: "20px 20px 0 0", padding: "20px 20px 44px", boxSizing: "border-box" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e5e7eb", margin: "0 auto 20px" }} />

            {/* Vista */}
            <p style={sectionLabel}>Vista</p>
            <div style={chipRow}>
              {([
                { v: "all", label: "Todos" },
                { v: "mine", label: "Mías" },
                { v: "with-someone", label: "Con alguien" },
              ] as { v: ViewChip; label: string }[]).map(({ v, label }) => (
                <button key={v} className={`asc-chip${viewChip === v ? " active" : ""}`} onClick={() => setViewChip(v)}>
                  {label}
                </button>
              ))}
            </div>

            {/* Persona — lista buscable con scroll fijo */}
            {allPersons.length > 0 && (
              <>
                <p style={{ ...sectionLabel, marginTop: 18 }}>Persona</p>
                <PersonPicker
                  persons={allPersons}
                  selectedId={viewChip === "person" ? selectedPersonId : ""}
                  onSelect={(id) => { setSelectedPersonId(id); setViewChip("person"); }}
                  onClear={() => { setSelectedPersonId(""); setViewChip("all"); }}
                />
              </>
            )}

            {/* Año — selector nativo */}
            {allYears.length > 0 && (
              <>
                <p style={{ ...sectionLabel, marginTop: 18 }}>Año</p>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{
                    width: "100%", padding: "11px 16px 11px 16px", fontSize: 14, fontWeight: 600,
                    border: "1.5px solid", borderColor: yearFilter !== "" ? "#0369a1" : "#e5e7eb",
                    borderRadius: 12, backgroundColor: yearFilter !== "" ? "#eff6ff" : "white",
                    color: yearFilter !== "" ? "#0369a1" : "#374151",
                    outline: "none", cursor: "pointer", appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
                    paddingRight: 36,
                  }}
                >
                  <option value="">{t.ascents_allYears}</option>
                  {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}

            {/* Orden — grid 2×2 */}
            <p style={{ ...sectionLabel, marginTop: 18 }}>Orden</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(Object.entries(SORT_LABELS) as [Sort, string][]).map(([v, label]) => (
                <button key={v} className={`asc-chip${sort === v ? " active" : ""}`} onClick={() => setSort(v)}
                  style={{ justifyContent: "center" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setViewChip("all"); setYearFilter(""); setSelectedPersonId(""); }}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #fca5a5", background: "white", color: "#ef4444", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  {t.ascents_clearAll}
                </button>
              )}
              <button
                onClick={() => setFiltersOpen(false)}
                style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "#0369a1", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Ver {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feed ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: 48, margin: "0 0 12px" }}>🔍</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>{t.ascents_noResults}</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{t.ascents_noResultsSub}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 8 }}>
          {filtered.map((a, i) => {
            const others = a.isOwn
              ? a.persons.filter(p =>
                  (currentUserEmail ? p.email !== currentUserEmail : true) &&
                  (currentUserName ? p.name !== currentUserName : true)
                )
              : a.persons;
            return (
              <AscentCard
                key={a.id}
                variant={a.isOwn ? "profile" : "social"}
                locale={t.dateLocale}
                animationIndex={i}
                ascent={{
                  id: a.id,
                  date: a.date,
                  route: a.route,
                  description: a.description,
                  peak: a.peak,
                  photoUrl: a.firstPhotoUrl,
                  persons: others,
                  user: { name: a.userName, avatarUrl: a.userAvatarUrl },
                }}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
