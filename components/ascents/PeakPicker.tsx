"use client";

import { useState, useRef, useEffect } from "react";
import { useT } from "@/components/providers/I18nProvider";

type Peak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
};

export function PeakPicker({
  peaks,
  defaultPeakId,
  defaultPeakName,
  name,
  placeholder,
  suggested = false,
}: {
  peaks: Peak[];
  defaultPeakId?: string;
  defaultPeakName?: string;
  name: string;
  placeholder?: string;
  suggested?: boolean;
}) {
  const t = useT();
  const defaultPeak = peaks.find((p) => p.id === defaultPeakId) ?? null;
  const [selected, setSelected] = useState<Peak | null>(defaultPeak);
  // Use defaultPeakName as initial query so the name appears immediately even before
  // the peaks array loads from the API.
  const [query, setQuery] = useState(defaultPeak?.name ?? defaultPeakName ?? "");
  const [open, setOpen] = useState(false);
  const [showChip, setShowChip] = useState(suggested && !!defaultPeak);
  // Track whether the user has explicitly cleared the field so we don't fall back to
  // defaultPeakId in the hidden input while peaks are still loading.
  const [userCleared, setUserCleared] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync selection when peaks load after initial render (e.g. edit mode where defaultPeakId
  // is provided but the peaks array arrives asynchronously)
  useEffect(() => {
    if (!defaultPeakId || selected) return;
    const found = peaks.find((p) => p.id === defaultPeakId);
    if (found) {
      setSelected(found);
      setQuery(found.name);
    }
  }, [peaks, defaultPeakId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // Only clear the query if nothing is selected AND no defaultPeakId is pending load
        if (!selected && !defaultPeakId) setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [selected, defaultPeakId]);

  const filtered =
    query.trim().length === 0
      ? peaks
      : peaks.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            (p.mountainRange?.toLowerCase().includes(query.toLowerCase()) ?? false)
        );

  function handleSelect(peak: Peak) {
    setSelected(peak);
    setUserCleared(false);
    setQuery(peak.name);
    setOpen(false);
  }

  function dismissChip() {
    setShowChip(false);
    setSelected(null);
    setUserCleared(true);
    setQuery("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Fall back to defaultPeakId while peaks are still loading and user hasn't cleared */}
      <input type="hidden" name={name} value={selected?.id ?? (!userCleared && defaultPeakId ? defaultPeakId : "")} />

      {/* Suggestion chip */}
      {showChip && selected ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px",
          border: "1px solid #bfdbfe", borderRadius: 8,
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
            background: "#dbeafe", borderRadius: 4, padding: "1px 6px",
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
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              const visible = filtered.slice(0, 60);
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
              border: "1px solid #d1d5db", borderRadius: 8,
              fontSize: 16, color: "#111827",
              outline: "none", boxSizing: "border-box" as const,
              background: "white",
            }}
          />
          {open && (
            <div ref={listRef} style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "white", border: "1px solid #d1d5db",
              borderRadius: 8, maxHeight: 240, overflowY: "auto",
              zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 13, color: "#9ca3af" }}>
                  {placeholder ? `${placeholder.replace("…", "")} no encontrada` : "Sin resultados"}
                </div>
              ) : (
                <>
                  {filtered.slice(0, 60).map((peak, idx) => (
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
                  ))}
                  {filtered.length > 60 && (
                    <div style={{ padding: "8px 12px", fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
                      +{filtered.length - 60} más · escribe para filtrar
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
