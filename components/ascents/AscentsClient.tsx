"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

// ─── Mountain placeholder SVG ───────────────────────────────────────────────

function MountainPlaceholder() {
  return (
    <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="mp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="60%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="mp-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="mp-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="mp-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="mp-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
      </defs>
      <rect width="600" height="750" fill="url(#mp-sky)" />
      {/* Far mountains */}
      <polygon points="0,480 150,260 300,420 500,200 600,380 600,480" fill="url(#mp-far)" opacity="0.55" />
      {/* Main peak */}
      <polygon points="300,60 520,520 80,520" fill="url(#mp-rock)" />
      {/* Snow */}
      <polygon points="300,60 370,200 300,185 230,200" fill="url(#mp-snow)" />
      <polygon points="300,60 390,230 300,210 210,230" fill="url(#mp-snow)" opacity="0.5" />
      {/* Ground */}
      <rect x="0" y="500" width="600" height="250" fill="url(#mp-ground)" />
      {/* Pine trees left */}
      <polygon points="60,510 85,440 110,510" fill="#16a34a" />
      <polygon points="90,510 118,430 146,510" fill="#15803d" />
      <polygon points="125,510 155,445 185,510" fill="#16a34a" />
      {/* Pine trees right */}
      <polygon points="415,510 443,440 471,510" fill="#16a34a" />
      <polygon points="450,510 480,430 510,510" fill="#15803d" />
      <polygon points="488,510 518,445 548,510" fill="#16a34a" />
    </svg>
  );
}

// ─── Person chip ─────────────────────────────────────────────────────────────

function PersonChip({ name }: { name: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 600, color: "#374151",
      background: "#f3f4f6", border: "1px solid #e5e7eb",
      borderRadius: 20, padding: "3px 10px",
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: "50%",
        background: "#dbeafe", color: "#0369a1",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 700, flexShrink: 0,
      }}>
        {name[0]?.toUpperCase()}
      </span>
      {name}
    </span>
  );
}

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
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [personFilter, setPersonFilter] = useState("");
  const [withPhotoOnly, setWithPhotoOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("date-desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
    setOpenMenuId(null);
    await fetch(`/api/ascents/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  const SORTS: { value: Sort; label: string }[] = [
    { value: "date-desc", label: "Newest" },
    { value: "date-asc", label: "Oldest" },
    { value: "elev-desc", label: "Highest" },
    { value: "name-asc", label: "A–Z" },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .post-card {
          animation: fadeUp 0.4s ease both;
          animation-delay: calc(var(--post-i, 0) * 55ms);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .post-card:hover {
          transform: scale(1.012);
          box-shadow: 0 12px 40px rgba(0,0,0,0.13) !important;
        }
        .post-hero-img {
          transition: transform 0.5s ease;
          display: block; width: 100%; height: 100%; object-fit: cover;
        }
        .post-card:hover .post-hero-img {
          transform: scale(1.04);
        }
        .sort-pill { transition: background 0.12s, color 0.12s; }
        .sort-pill:hover { background: #e5e7eb !important; }
        .action-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; cursor: pointer;
          font-size: 13px; color: #6b7280; padding: 4px 2px;
          transition: color 0.15s, transform 0.15s;
        }
        .action-btn:hover { color: #111827; transform: scale(1.12); }
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
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Delete ascent?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 22px", lineHeight: 1.6 }}>
              All photos will also be deleted. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: "9px 18px", background: "#f3f4f6", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={() => confirmDelete(deleteConfirm)}
                style={{ padding: "9px 18px", background: "#ef4444", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {openMenuId && <div onClick={() => setOpenMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />}

      {/* ── Stats pills ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          { e: "🏔", v: metrics.total, l: "ascents" },
          { e: "📏", v: `${metrics.maxElev.toLocaleString()} m`, l: "highest" },
          { e: "⛰️", v: metrics.uniquePeaks, l: "peaks" },
          { e: "👥", v: metrics.people, l: "people" },
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
          placeholder="🔍  Search peaks, routes, people…"
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
          ⚙️ Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
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
              <option value="">All years</option>
              {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {allPersons.length > 0 && (
            <select className="filter-select" value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              style={{ color: personFilter ? "#0369a1" : "#6b7280" }}>
              <option value="">All people</option>
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
            📸 With photo
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
              Clear all
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: 48, margin: "0 0 12px" }}>🔍</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>No ascents found</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Try adjusting your filters</p>
        </div>
      ) : (
        /* ── Feed ───────────────────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 8 }}>
          {filtered.map((a, i) => {
            const dateStr = new Date(a.date).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            });
            const others = a.persons.filter(p => !currentUserEmail || p.email !== currentUserEmail);
            return (
              <div
                key={a.id}
                className="post-card"
                // @ts-expect-error CSS custom property
                style={{ "--post-i": Math.min(i, 8), background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
                onClick={() => router.push(`/ascents/${a.id}`)}
              >
                {/* ── Post header ─────────────────────────────────── */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px 10px",
                }}>
                  {/* Mountain icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #bfdbfe 0%, #dbeafe 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>⛰️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.peak.name}
                    </p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                      {dateStr}{a.peak.mountainRange ? ` · ${a.peak.mountainRange}` : ""}
                    </p>
                  </div>
                  {/* ⋮ menu */}
                  <div style={{ position: "relative", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === a.id ? null : a.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#9ca3af", fontSize: 20, lineHeight: 1 }}
                    >⋮</button>
                    {openMenuId === a.id && (
                      <div style={{
                        position: "absolute", right: 0, top: 30, zIndex: 20,
                        background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 120, overflow: "hidden",
                      }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setDeleteConfirm(a.id); setOpenMenuId(null); }}
                          disabled={deletingId === a.id}
                          style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, color: "#ef4444", cursor: "pointer" }}
                        >
                          {deletingId === a.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Hero image ──────────────────────────────────── */}
                <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", background: "#f1f5f9" }}>
                  {a.firstPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.firstPhotoUrl} alt="" className="post-hero-img" />
                  ) : (
                    <MountainPlaceholder />
                  )}
                  {/* Altitude badge — top right */}
                  <div style={{
                    position: "absolute", top: 12, right: 12,
                    background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    borderRadius: 20, padding: "5px 12px",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.01em" }}>
                      {a.peak.altitudeM.toLocaleString()} m
                    </span>
                  </div>
                  {/* Bottom gradient scrim */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
                    background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)",
                    pointerEvents: "none",
                  }} />
                </div>

                {/* ── Action bar ──────────────────────────────────── */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "10px 14px 8px",
                  borderBottom: "1px solid #f3f4f6",
                }} onClick={(e) => e.stopPropagation()}>
                  <button className="action-btn">
                    <span style={{ fontSize: 18 }}>🤍</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{a.firstPhotoId ? "1" : "0"}</span>
                  </button>
                  <button className="action-btn" style={{ marginLeft: 6 }}>
                    <span style={{ fontSize: 17 }}>🗺️</span>
                    {a.route && <span style={{ fontSize: 12, fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.route}</span>}
                  </button>
                  {others.length > 0 && (
                    <button className="action-btn" style={{ marginLeft: 6 }}>
                      <span style={{ fontSize: 17 }}>👥</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{others.length}</span>
                    </button>
                  )}
                </div>

                {/* ── Caption ─────────────────────────────────────── */}
                {(others.length > 0 || a.description) && (
                  <div style={{ padding: "10px 14px 14px" }}>
                    {a.description && (
                      <p style={{
                        fontSize: 13, color: "#374151", margin: "0 0 8px", lineHeight: 1.5,
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {a.description}
                      </p>
                    )}
                    {others.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {others.map((p) => <PersonChip key={p.id} name={p.name} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
