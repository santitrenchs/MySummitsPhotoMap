"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";
import { AscentCard } from "@/components/cards/AscentCard";

export type AscentData = {
  id: string;
  date: string;
  route: string | null;
  description: string | null;
  peak: { id: string; name: string; altitudeM: number; mountainRange: string | null };
  firstPhotoId: string | null;
  firstPhotoUrl: string | null;
  persons: { id: string; name: string; email?: string | null }[];
};

type Sort = "date-desc" | "date-asc" | "elev-desc" | "name-asc";

// ─── Main component ──────────────────────────────────────────────────────────

export function AscentsClient({
  ascents,
  allPersons,
  allYears,
  currentUserEmail,
}: {
  ascents: AscentData[];
  allPersons: { id: string; name: string }[];
  allYears: number[];
  currentUserEmail?: string | null;
}) {
  const router = useRouter();
  const t = useT();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [personFilter, setPersonFilter] = useState("");
  const [withPhotoOnly, setWithPhotoOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("date-desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Peak filter: seeded from ?peak=<peakId> URL param (e.g. from map panel)
  const [peakFilter, setPeakFilter] = useState<string>(() => searchParams.get("peak") ?? "");
  const peakFilterName = peakFilter
    ? (ascents.find((a) => a.peak.id === peakFilter)?.peak.name ?? "")
    : "";

  const metrics = useMemo(() => ({
    total: ascents.length,
    maxElev: ascents.length > 0 ? Math.max(...ascents.map((a) => a.peak.altitudeM)) : 0,
    uniquePeaks: new Set(ascents.map((a) => a.peak.id)).size,
    people: new Set(ascents.flatMap((a) => a.persons.map((p) => p.id))).size,
  }), [ascents]);

  const filtered = useMemo(() => {
    let r = ascents;
    if (peakFilter) r = r.filter((a) => a.peak.id === peakFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (a) =>
          a.peak.name.toLowerCase().includes(q) ||
          (a.route ?? "").toLowerCase().includes(q) ||
          a.persons.some((p) => p.name.toLowerCase().includes(q))
      );
    }
    if (yearFilter !== "") r = r.filter((a) => new Date(a.date).getFullYear() === yearFilter);
    if (personFilter) r = r.filter((a) => a.persons.some((p) => p.id === personFilter));
    if (withPhotoOnly) r = r.filter((a) => !!a.firstPhotoId);
    return [...r].sort((a, b) => {
      if (sort === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sort === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sort === "elev-desc") return b.peak.altitudeM - a.peak.altitudeM;
      return a.peak.name.localeCompare(b.peak.name);
    });
  }, [ascents, peakFilter, search, yearFilter, personFilter, withPhotoOnly, sort]);

  const activeFilterCount = [
    search.trim() !== "",
    yearFilter !== "",
    personFilter !== "",
    withPhotoOnly,
  ].filter(Boolean).length;

  async function confirmDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirm(null);
    await fetch(`/api/ascents/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const SORTS: { value: Sort; label: string }[] = [
    { value: "date-desc", label: t.ascents_sort_newest },
    { value: "date-asc", label: t.ascents_sort_oldest },
    { value: "elev-desc", label: t.ascents_sort_highest },
    { value: "name-asc", label: t.ascents_sort_az },
  ];

  return (
    <>
      <style>{`
        .sort-pill { transition: background 0.12s, color 0.12s; }
        .sort-pill:hover { background: #e5e7eb !important; }
        .filter-select {
          padding: 6px 12px; border: 1.5px solid #e5e7eb; border-radius: 20px;
          font-size: 13px; font-weight: 600; background: white; cursor: pointer;
          outline: none; color: #6b7280;
        }
        .filter-select:focus { border-color: #93c5fd; }
      `}</style>

      {/* ── Delete modal ─────────────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 18, padding: 28,
            width: "100%", maxWidth: 360,
            boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>{t.ascents_delete_title}</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 22px", lineHeight: 1.6 }}>
              {t.ascents_delete_body}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: "9px 18px", background: "#f3f4f6", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                {t.cancel}
              </button>
              <button onClick={() => confirmDelete(deleteConfirm)}
                style={{ padding: "9px 18px", background: "#ef4444", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer" }}>
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── Stats pills ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          { e: "🏔", v: metrics.total, l: t.ascents_stat_ascents },
          { e: "📏", v: `${metrics.maxElev.toLocaleString(t.dateLocale)} m`, l: t.ascents_stat_highest },
          { e: "⛰️", v: metrics.uniquePeaks, l: t.ascents_stat_peaks },
          { e: "👥", v: metrics.people, l: t.ascents_stat_people },
        ].map(({ e, v, l }) => (
          <div key={l} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "white", border: "1px solid #e5e7eb", borderRadius: 24,
            padding: "5px 13px", fontSize: 13,
          }}>
            <span>{e}</span>
            <span style={{ fontWeight: 700, color: "#111827" }}>{v}</span>
            <span style={{ color: "#9ca3af" }}>{l}</span>
          </div>
        ))}
      </div>

      {/* ── Peak filter chip (from map) ──────────────────────────── */}
      {peakFilter && peakFilterName && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "#eff6ff", border: "1.5px solid #bfdbfe",
            borderRadius: 24, padding: "6px 10px 6px 14px",
            fontSize: 13, fontWeight: 600, color: "#0369a1",
          }}>
            <span>⛰️ {peakFilterName}</span>
            <button
              onClick={() => {
                setPeakFilter("");
                // Clean up the URL param without a full navigation
                const url = new URL(window.location.href);
                url.searchParams.delete("peak");
                window.history.replaceState(null, "", url.toString());
              }}
              style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "#bfdbfe", border: "none", color: "#0369a1",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
              aria-label="Clear peak filter"
            >✕</button>
          </div>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            {filtered.length} ascent{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Search bar ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
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
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            padding: "10px 16px", borderRadius: 24, border: "1.5px solid #e5e7eb",
            background: activeFilterCount > 0 ? "#eff6ff" : "white",
            color: activeFilterCount > 0 ? "#0369a1" : "#6b7280",
            fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ⚙️ {t.ascents_filters}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* ── Expandable filters ───────────────────────────────────── */}
      {filtersOpen && (
        <div style={{
          background: "white", border: "1px solid #e5e7eb", borderRadius: 16,
          padding: 16, marginBottom: 16,
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        }}>
          {allYears.length > 0 && (
            <select className="filter-select" value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value === "" ? "" : Number(e.target.value))}
              style={{ color: yearFilter !== "" ? "#0369a1" : "#6b7280" }}>
              <option value="">{t.ascents_allYears}</option>
              {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {allPersons.length > 0 && (
            <select className="filter-select" value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              style={{ color: personFilter ? "#0369a1" : "#6b7280" }}>
              <option value="">{t.ascents_allPeople}</option>
              {allPersons.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button
            onClick={() => setWithPhotoOnly(!withPhotoOnly)}
            style={{
              padding: "6px 14px", borderRadius: 20,
              border: `1.5px solid ${withPhotoOnly ? "#bfdbfe" : "#e5e7eb"}`,
              background: withPhotoOnly ? "#eff6ff" : "white",
              color: withPhotoOnly ? "#0369a1" : "#6b7280",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t.ascents_withPhoto}
          </button>
          {/* Segmented sort */}
          <div style={{ marginLeft: "auto", display: "inline-flex", background: "#f3f4f6", borderRadius: 24, padding: 3, gap: 2 }}>
            {SORTS.map(({ value, label }) => (
              <button key={value} className="sort-pill" onClick={() => setSort(value)} style={{
                padding: "5px 14px", borderRadius: 20, border: "none",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: sort === value ? "white" : "transparent",
                color: sort === value ? "#111827" : "#6b7280",
                boxShadow: sort === value ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}>{label}</button>
            ))}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSearch(""); setYearFilter(""); setPersonFilter(""); setWithPhotoOnly(false); }}
              style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              {t.ascents_clearAll}
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: 48, margin: "0 0 12px" }}>🔍</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>{t.ascents_noResults}</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{t.ascents_noResultsSub}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 8 }}>
          {filtered.map((a, i) => {
            const others = a.persons.filter(p => !currentUserEmail || p.email !== currentUserEmail);
            return (
              <AscentCard
                key={a.id}
                variant="profile"
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
                  user: { name: "" },
                }}
                onDelete={(id) => setDeleteConfirm(id)}
                isDeleting={deletingId === a.id}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
