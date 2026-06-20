"use client";

import { useState, useRef, useEffect } from "react";
import { useT } from "@/components/providers/I18nProvider";

type Peak = {
  id: string;
  name: string;
  nameEn?: string | null;
  altitudeM: number;
  mountainRange?: string | null;
};

export function PeakPicker({
  initialPeak = null,
  defaultPeakId,
  defaultPeakName,
  name,
  placeholder,
  suggested = false,
  onSelect,
}: {
  // Full peak object to seed the field (edit mode current peak, or GPS suggestion).
  // Replaces the old `peaks` array — the catalog is too large to load client-side,
  // so search is done server-side via /api/peaks?q=.
  initialPeak?: Peak | null;
  defaultPeakId?: string;
  defaultPeakName?: string;
  name: string;
  placeholder?: string;
  suggested?: boolean;
  onSelect?: (peak: Peak | null) => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState<Peak | null>(initialPeak);
  const [query, setQuery] = useState(initialPeak?.name ?? defaultPeakName ?? "");
  const [open, setOpen] = useState(false);
  const [showChip, setShowChip] = useState(suggested && !!initialPeak);
  // Track whether the user has explicitly cleared the field so we don't fall back to
  // defaultPeakId in the hidden input.
  const [userCleared, setUserCleared] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Server-side search results
  const [results, setResults] = useState<Peak[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Seed the field if the initial peak arrives after first render (e.g. GPS suggestion).
  useEffect(() => {
    if (!initialPeak) return;
    setSelected(initialPeak);
    setQuery(initialPeak.name);
    setShowChip(suggested);
    setUserCleared(false);
  }, [initialPeak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced server-side search. The peak catalog has hundreds of thousands of rows,
  // so we never load it all — we query /api/peaks?q= as the user types.
  useEffect(() => {
    const q = query.trim();
    // Don't search when the query just mirrors the selected peak's name.
    if (selected && q === selected.name) { setResults([]); setSearching(false); return; }
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      fetch(`/api/peaks?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          const list: Peak[] = Array.isArray(d) ? d : Array.isArray(d?.peaks) ? d.peaks : [];
          setResults(list);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, selected]);

  // Scroll active item into view when navigating with keyboard
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (!selected && !defaultPeakId) setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [selected, defaultPeakId]);

  const visible = results.slice(0, 60);

  function handleSelect(peak: Peak) {
    setSelected(peak);
    setUserCleared(false);
    setQuery(peak.name);
    setOpen(false);
    setResults([]);
    onSelect?.(peak);
  }

  function dismissChip() {
    setShowChip(false);
    setSelected(null);
    setUserCleared(true);
    setQuery("");
    onSelect?.(null);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Fall back to defaultPeakId while nothing is selected and the user hasn't cleared */}
      <input type="hidden" name={name} value={selected?.id ?? (!userCleared && defaultPeakId ? defaultPeakId : "")} />

      {/* Suggestion chip */}
      {showChip && selected ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px",
          border: "1px solid #bfdbfe", borderRadius: "var(--radius-md)",
          background: "#eff6ff", cursor: "default",
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>📍</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e40af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.name}
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#3b82f6", marginTop: 1 }}>
              {selected.altitudeM} m
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#3b82f6",
            background: "#dbeafe", borderRadius: "var(--radius-sm)", padding: "1px 6px",
          }}>
            {t.newAscent_suggested}
          </span>
          <button
            type="button"
            onClick={dismissChip}
            style={{
              background: "none", border: "none", padding: "0 2px",
              fontSize: 14, color: "#93c5fd", cursor: "pointer", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ) : (
        /* Search input */
        <>
          <input
            type="text"
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => {
              setSelected(null);
              setUserCleared(true);
              setQuery(e.target.value);
              setActiveIndex(-1);
              setOpen(true);
              onSelect?.(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, visible.length - 1));
                setOpen(true);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && activeIndex >= 0 && visible[activeIndex]) {
                e.preventDefault();
                handleSelect(visible[activeIndex]);
              } else if (e.key === "Escape") {
                setOpen(false);
                setActiveIndex(-1);
              }
            }}
            style={{
              width: "100%", padding: "8px 12px",
              border: "1px solid #d1d5db", borderRadius: "var(--radius-md)",
              fontSize: 16, color: "#111827",
              outline: "none", boxSizing: "border-box" as const,
              background: "white",
            }}
          />
          {open && query.trim().length >= 2 && (
            <div ref={listRef} style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "white", border: "1px solid #d1d5db",
              borderRadius: "var(--radius-md)", maxHeight: 240, overflowY: "auto",
              zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
            }}>
              {searching && visible.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 13, color: "#9ca3af" }}>
                  …
                </div>
              ) : visible.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 13, color: "#9ca3af" }}>
                  {t.peak_notFound}
                </div>
              ) : (
                visible.map((peak, idx) => (
                  <div
                    key={peak.id}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(peak); }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    style={{
                      padding: "9px 12px", cursor: "pointer",
                      background: idx === activeIndex ? "#f0f9ff" : selected?.id === peak.id ? "#f0f9ff" : "transparent",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                      {peak.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                      {peak.altitudeM} m{peak.mountainRange ? ` · ${peak.mountainRange}` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
