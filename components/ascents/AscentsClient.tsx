"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";
import { AscentCard } from "@/components/cards/AscentCard";
import { GroupedAscentCard } from "@/components/cards/GroupedAscentCard";

export type AscentData = {
  id: string;
  date: string;
  route: string | null;
  description: string | null;
  wikiloc?: string | null;
  createdByUserId: string;
  peak: { id: string; name: string; altitudeM: number; isMythic: boolean; mountainRange: string | null; latitude: number; longitude: number; wikiUrl?: string | null; wikiBody?: string | null };
  firstPhotoId: string | null;
  firstPhotoUrl: string | null;
  firstPhotoOriginalKey?: string | null;
  persons: { id: string; name: string; email?: string | null }[];
  isOwn: boolean;
  userName: string;
  userAvatarUrl: string | null;
  peakStats?: { totalAscents: number; uniqueClimbers: number };
};

type Rarity = "daisy" | "gentian" | "edelweiss" | "saxifrage" | "cinquefoil" | "snow_lotus";
type ViewChip = "all" | "mine" | "person" | "with-me";
type TimeRange = "all" | "month" | "year";
type Sort = "date-desc" | "elev-desc" | "rarity-desc";

function getRarity(altitudeM: number): Rarity {
  if (altitudeM >= 8000) return "snow_lotus";
  if (altitudeM >= 7000) return "cinquefoil";
  if (altitudeM >= 5000) return "saxifrage";
  if (altitudeM >= 3000) return "edelweiss";
  if (altitudeM >= 1500) return "gentian";
  return "daisy";
}

const RARITY_ORDER: Record<Rarity, number> = { snow_lotus: 5, cinquefoil: 4, saxifrage: 3, edelweiss: 2, gentian: 1, daisy: 0 };

const RARITY_COLORS: Record<Rarity, { bg: string; border: string; text: string; dot: string }> = {
  daisy:      { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d",  dot: "#16a34a" },
  gentian:    { bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9",  dot: "#7c3aed" },
  edelweiss:  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c",  dot: "#ea580c" },
  saxifrage:  { bg: "#fefce8", border: "#fde68a", text: "#92400e",  dot: "#b45309" },
  cinquefoil: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c",  dot: "#dc2626" },
  snow_lotus: { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280",  dot: "#9ca3af" },
};

const RARITY_LABELS: Record<Rarity, string> = {
  daisy: "Daisy", gentian: "Gentian", edelweiss: "Edelweiss", saxifrage: "Saxifrage",
  cinquefoil: "Cinquefoil", snow_lotus: "Snow Lotus",
};

// ─── Main component ──────────────────────────────────────────────────────────

export function AscentsClient({
  ascents,
  allPersons,
  allYears,
  currentUserEmail,
  currentUserName,
  currentUserId,
}: {
  ascents: AscentData[];
  allPersons: { id: string; name: string }[];
  allYears: number[];
  currentUserEmail?: string | null;
  currentUserName?: string;
  currentUserId?: string;
}) {
  const t = useT();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [viewChip, setViewChip] = useState<ViewChip>("all");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [mythicFilter, setMythicFilter] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sort, setSort] = useState<Sort>("date-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  // Peak filter seeded from ?peak= URL param
  const [peakFilter, setPeakFilter] = useState<string>(() => searchParams.get("peak") ?? "");
  const peakFilterName = peakFilter
    ? (ascents.find((a) => a.peak.id === peakFilter)?.peak.name ?? "")
    : "";

  const selectedPerson = allPersons.find((p) => p.id === selectedPersonId);

  // Highlight + scroll to newly created ascent from ?highlight= URL param
  const [highlightId, setHighlightId] = useState<string | null>(() => searchParams.get("highlight"));
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`ascent-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightId(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightId]);

  // Lock body scroll when sheet open
  useEffect(() => {
    if (filtersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [filtersOpen]);

  const filtered = useMemo(() => {
    let r = ascents;

    if (peakFilter) r = r.filter((a) => a.peak.id === peakFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((a) =>
        a.peak.name.toLowerCase().includes(q) ||
        (a.route ?? "").toLowerCase().includes(q) ||
        a.persons.some((p) => p.name.toLowerCase().includes(q))
      );
    }

    if (viewChip === "mine") r = r.filter((a) => a.isOwn);
    else if (viewChip === "with-me" && currentUserId) r = r.filter((a) => !a.isOwn && a.persons.some((p) => p.id === currentUserId));
    else if (viewChip === "person" && selectedPersonId) r = r.filter((a) => a.createdByUserId === selectedPersonId || a.persons.some((p) => p.id === selectedPersonId));

    if (mythicFilter) r = r.filter((a) => a.peak.isMythic);
    else if (rarity) r = r.filter((a) => getRarity(a.peak.altitudeM) === rarity);

    if (timeRange === "month") {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      r = r.filter((a) => new Date(a.date).getTime() >= cutoff);
    } else if (timeRange === "year") {
      const yr = new Date().getFullYear();
      r = r.filter((a) => new Date(a.date).getFullYear() === yr);
    }

    return [...r].sort((a, b) => {
      if (sort === "date-desc")   return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sort === "elev-desc")   return b.peak.altitudeM - a.peak.altitudeM;
      if (sort === "rarity-desc") {
        const rd = RARITY_ORDER[getRarity(b.peak.altitudeM)] - RARITY_ORDER[getRarity(a.peak.altitudeM)];
        return rd !== 0 ? rd : b.peak.altitudeM - a.peak.altitudeM;
      }
      return 0;
    });
  }, [ascents, peakFilter, search, viewChip, selectedPersonId, rarity, mythicFilter, timeRange, sort, currentUserId]);

  const groups = useMemo(() => {
    const map = new Map<string, AscentData[]>();
    for (const a of filtered) {
      const day = new Date(a.date).toISOString().substring(0, 10);
      const key = `${a.peak.id}__${day}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.values());
  }, [filtered]);

  const uniquePeaks = useMemo(
    () => new Set(filtered.map((a) => a.peak.id)).size,
    [filtered]
  );

  const isDirty =
    viewChip !== "all" || rarity !== null || mythicFilter || timeRange !== "all" ||
    sort !== "date-desc" || peakFilter !== "";

  function resetFilters() {
    setViewChip("all");
    setSelectedPersonId("");
    setPersonSearch("");
    setRarity(null);
    setMythicFilter(false);
    setTimeRange("all");
    setSort("date-desc");
  }

  // ── Active chips data ────────────────────────────────────────────────────────

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; color: { bg: string; border: string; text: string } }[] = [];
    if (viewChip === "mine")    chips.push({ key: "view", label: "👤 Mis cimas", color: { bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" } });
    if (viewChip === "with-me") chips.push({ key: "view", label: "👥 Conmigo", color: { bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" } });
    if (viewChip === "person" && selectedPerson) chips.push({ key: "view", label: `👤 ${selectedPerson.name}`, color: { bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" } });
    if (mythicFilter) {
      chips.push({ key: "rarity", label: "⭐ Mythic", color: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" } });
    } else if (rarity) {
      const c = RARITY_COLORS[rarity];
      chips.push({ key: "rarity", label: `✿ ${RARITY_LABELS[rarity]}`, color: { bg: c.bg, border: c.border, text: c.text } });
    }
    if (timeRange === "month") chips.push({ key: "time", label: "📅 Último mes", color: { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" } });
    if (timeRange === "year")  chips.push({ key: "time", label: `📅 ${new Date().getFullYear()}`, color: { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" } });
    if (sort === "elev-desc")   chips.push({ key: "sort", label: "⛰ Más altas", color: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" } });
    if (sort === "rarity-desc") chips.push({ key: "sort", label: "✿ Más raras", color: { bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" } });
    if (peakFilter && peakFilterName) chips.push({ key: "peak", label: `⛰️ ${peakFilterName}`, color: { bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" } });
    return chips;
  }, [viewChip, selectedPerson, rarity, mythicFilter, timeRange, sort, peakFilter, peakFilterName]);

  function clearChip(key: string) {
    if (key === "view") { setViewChip("all"); setSelectedPersonId(""); setPersonSearch(""); }
    if (key === "rarity") { setRarity(null); setMythicFilter(false); }
    if (key === "time") setTimeRange("all");
    if (key === "sort") setSort("date-desc");
    if (key === "peak") {
      setPeakFilter("");
      const u = new URL(window.location.href);
      u.searchParams.delete("peak");
      window.history.replaceState(null, "", u.toString());
    }
  }

  const filteredPersons = personSearch.trim()
    ? allPersons.filter((p) => p.name.toLowerCase().includes(personSearch.toLowerCase()))
    : allPersons;

  // ── Drag-to-close ────────────────────────────────────────────────────────────

  function onTouchStart(e: React.TouchEvent) { dragStartY.current = e.touches[0].clientY; }
  function onTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0 && sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - dragStartY.current;
    if (sheetRef.current) sheetRef.current.style.transform = "";
    if (dy > 80) setFiltersOpen(false);
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const fchip = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "8px 14px", borderRadius: 20,
    border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`,
    background: active ? "#eff6ff" : "#f9fafb",
    color: active ? "#0369a1" : "#6b7280",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent",
    ...extra,
  });

  const rarityChip = (r: Rarity, active: boolean): React.CSSProperties => {
    const c = RARITY_COLORS[r];
    return {
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "8px 14px", borderRadius: 20,
      border: `1.5px solid ${active ? c.border : "#e5e7eb"}`,
      background: active ? c.bg : "#f9fafb",
      color: active ? c.text : "#6b7280",
      fontSize: 13, fontWeight: 600, cursor: "pointer",
      whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent",
    };
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
    color: "#9ca3af", textTransform: "uppercase", marginBottom: 10,
  };

  const chipRow: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };

  return (
    <>
      <style>{`
        .asc-fchip { transition: opacity 0.1s; }
        .asc-fchip:active { opacity: 0.7; transform: scale(0.97); }
        .asc-sheet { transition: transform 0.34s cubic-bezier(0.32,0.72,0,1); }
        @keyframes chipIn {
          from { opacity:0; transform:scale(0.85); }
          to   { opacity:1; transform:scale(1); }
        }
        .asc-chip-in { animation: chipIn 0.18s ease forwards; }
      `}</style>

      {/* ── Search + filter button ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: activeChips.length ? 10 : 16 }}>
        <input
          type="text"
          placeholder={t.ascents_search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, padding: "10px 18px", fontSize: 16,
            border: "1.5px solid #e5e7eb", borderRadius: 24,
            outline: "none", background: "white", boxSizing: "border-box",
          }}
        />
        <button
          className="asc-fchip"
          onClick={() => setFiltersOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 16px", borderRadius: 24,
            border: `1.5px solid ${isDirty ? "#bfdbfe" : "#e5e7eb"}`,
            background: isDirty ? "#eff6ff" : "white",
            color: isDirty ? "#0369a1" : "#6b7280",
            fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Filtrar
          {isDirty && (
            <span style={{
              width: 16, height: 16, borderRadius: "50%",
              background: "#0369a1", color: "white",
              fontSize: 9, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {activeChips.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Active filter chips ─────────────────────────────────────────── */}
      {activeChips.length > 0 && (
        <div style={{
          display: "flex", gap: 6, flexWrap: "nowrap",
          overflowX: "auto", scrollbarWidth: "none",
          marginBottom: 14, paddingBottom: 2,
        }}>
          {activeChips.map((chip) => (
            <div
              key={chip.key + chip.label}
              className="asc-chip-in"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 10px 5px 12px", borderRadius: 20,
                background: chip.color.bg, border: `1px solid ${chip.color.border}`,
                color: chip.color.text, fontSize: 12, fontWeight: 600,
                whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer",
              }}
              onClick={() => clearChip(chip.key)}
            >
              {chip.label}
              <span style={{
                width: 14, height: 14, borderRadius: "50%",
                background: chip.color.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, opacity: 0.8,
              }}>✕</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter bottom sheet ─────────────────────────────────────────── */}
      {filtersOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }}
          onClick={() => setFiltersOpen(false)}
        />
      )}
      <div
        ref={sheetRef}
        className="asc-sheet"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 201,
          background: "white", borderRadius: "24px 24px 0 0",
          maxHeight: "92svh", display: "flex", flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: filtersOpen ? "translateY(0)" : "translateY(110%)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.14)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>
            Explorar ascensiones
          </span>
          {isDirty ? (
            <button
              onClick={resetFilters}
              style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#0369a1", cursor: "pointer", padding: "4px 0" }}
            >
              Borrar todo
            </button>
          ) : (
            <button
              onClick={() => setFiltersOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, lineHeight: 1 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 24, scrollbarWidth: "none" }}>

          {/* EXPLORAR */}
          <div>
            <p style={sectionLabel}>Explorar</p>
            <div style={chipRow}>
              {([
                { v: "all",     label: "Todo" },
                { v: "mine",    label: "Mis cimas" },
                { v: "person",  label: "De una persona" },
                { v: "with-me", label: "Conmigo" },
              ] as { v: ViewChip; label: string }[]).map(({ v, label }) => (
                <div
                  key={v}
                  className="asc-fchip"
                  style={fchip(viewChip === v)}
                  onClick={() => {
                    setViewChip(v);
                    if (v !== "person") { setSelectedPersonId(""); setPersonSearch(""); }
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Person search — visible when "De una persona" */}
            {viewChip === "person" && allPersons.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  type="text"
                  placeholder="Buscar persona…"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%", padding: "10px 14px", fontSize: 16,
                    border: "1.5px solid #e5e7eb", borderRadius: 10,
                    outline: "none", background: "#f9fafb", boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {filteredPersons.length > 0 && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "white" }}>
                    {filteredPersons.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        className="asc-fchip"
                        onClick={() => setSelectedPersonId(p.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", cursor: "pointer",
                          background: selectedPersonId === p.id ? "#eff6ff" : "white",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "#1d4ed8",
                        }}>
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: selectedPersonId === p.id ? 700 : 500, color: selectedPersonId === p.id ? "#0369a1" : "#111827", flex: 1 }}>
                          {p.name}
                        </span>
                        {selectedPersonId === p.id && (
                          <span style={{ fontSize: 13, color: "#0369a1", fontWeight: 700 }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RAREZA */}
          <div>
            <p style={sectionLabel}>Rareza</p>
            <div style={chipRow}>
              <div
                className="asc-fchip"
                style={fchip(rarity === null && !mythicFilter)}
                onClick={() => { setRarity(null); setMythicFilter(false); }}
              >
                Todas
              </div>
              {(["daisy", "gentian", "edelweiss", "saxifrage", "cinquefoil", "snow_lotus"] as Rarity[]).map((r) => (
                <div
                  key={r}
                  className="asc-fchip"
                  style={rarityChip(r, !mythicFilter && rarity === r)}
                  onClick={() => { setMythicFilter(false); setRarity(rarity === r ? null : r); }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: RARITY_COLORS[r].dot, display: "inline-block", flexShrink: 0 }} />
                  {RARITY_LABELS[r]}
                </div>
              ))}
              <div
                className="asc-fchip"
                style={{
                  ...fchip(mythicFilter),
                  ...(mythicFilter ? { background: "#fffbeb", border: "1.5px solid #f59e0b", color: "#92400e" } : {}),
                }}
                onClick={() => { setMythicFilter(!mythicFilter); setRarity(null); }}
              >
                ⭐ Mythic
              </div>
            </div>
          </div>

          {/* CUÁNDO */}
          <div>
            <p style={sectionLabel}>Cuándo</p>
            <div style={chipRow}>
              {([
                { v: "month", label: "Último mes" },
                { v: "year",  label: "Este año" },
                { v: "all",   label: "Todo" },
              ] as { v: TimeRange; label: string }[]).map(({ v, label }) => (
                <div
                  key={v}
                  className="asc-fchip"
                  style={fchip(timeRange === v)}
                  onClick={() => setTimeRange(v)}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ORDENAR POR */}
          <div>
            <p style={sectionLabel}>Ordenar por</p>
            <div style={chipRow}>
              <div className="asc-fchip" style={fchip(sort === "date-desc")} onClick={() => setSort("date-desc")}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                Recientes
              </div>
              <div className="asc-fchip" style={fchip(sort === "elev-desc", sort === "elev-desc" ? { borderColor: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" } : {})} onClick={() => setSort("elev-desc")}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L13 12H3L8 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                </svg>
                Más altas
              </div>
              <div className="asc-fchip" style={fchip(sort === "rarity-desc", sort === "rarity-desc" ? { borderColor: "#ddd6fe", background: "#f5f3ff", color: "#6d28d9" } : {})} onClick={() => setSort("rarity-desc")}>
                <span style={{ fontSize: 13, lineHeight: 1 }}>✿</span>
                Más raras
              </div>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          <button
            onClick={() => setFiltersOpen(false)}
            style={{
              width: "100%", padding: "16px",
              background: "#0369a1", color: "white", border: "none",
              borderRadius: 14, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0 4px 14px rgba(3,105,161,0.32)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              Explorar {filtered.length} ascensión{filtered.length !== 1 ? "es" : ""}
            </span>
            <span style={{ opacity: 0.45, fontSize: 14 }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.8 }}>
              {uniquePeaks} cima{uniquePeaks !== 1 ? "s" : ""} única{uniquePeaks !== 1 ? "s" : ""}
            </span>
          </button>
        </div>
      </div>

      {/* ── Feed ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: 48, margin: "0 0 12px" }}>🔍</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>{t.ascents_noResults}</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{t.ascents_noResultsSub}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 8 }}>
          {groups.map((group, i) => {
            if (group.length === 1) {
              const a = group[0];
              const others = a.persons.filter((p) => p.id !== a.createdByUserId);
              return (
                <div
                  key={a.id}
                  id={`ascent-${a.id}`}
                  style={{
                    borderRadius: 16,
                    transition: "box-shadow 0.4s ease, outline 0.4s ease",
                    ...(highlightId === a.id ? { boxShadow: "0 0 0 3px #0ea5e9, 0 4px 24px rgba(14,165,233,0.35)" } : {}),
                  }}
                >
                <AscentCard
                  variant={a.isOwn ? "profile" : "social"}
                  locale={t.dateLocale}
                  animationIndex={i}
                  ascent={{
                    id: a.id,
                    date: a.date,
                    route: a.route,
                    description: a.description,
                    wikiloc: a.wikiloc,
                    peak: a.peak,
                    photoUrl: a.firstPhotoUrl,
                    photoId: a.firstPhotoId,
                    originalStorageKey: a.firstPhotoOriginalKey,
                    persons: others,
                    user: { name: a.userName, avatarUrl: a.userAvatarUrl },
                    peakStats: a.peakStats,
                  }}
                />
                </div>
              );
            }

            const groupKey = `${group[0].peak.id}__${group[0].date.substring(0, 10)}`;
            return (
              <GroupedAscentCard
                key={groupKey}
                ascents={group}
                currentUserEmail={currentUserEmail}
                currentUserName={currentUserName}
                animationIndex={i}
                peakStats={group[0].peakStats}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
