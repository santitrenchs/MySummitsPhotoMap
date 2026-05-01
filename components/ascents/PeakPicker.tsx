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
  // Use defaultPeakName as initial query so the name appears immediately in edit mode
  // even before the peaks array loads from the API.
  const [query, setQuery] = useState(defaultPeak?.name ?? defaultPeakName ?? "");
  const [open, setOpen] = useState(false);
  const [showChip, setShowChip] = useState(suggested && !!defaultPeak);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setQuery(peak.name);
    setOpen(false);
  }

  function dismissChip() {
    setShowChip(false);
    setSelected(null);
    setQuery("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input type="hidden" name={name} value={selected?.id ?? ""} />

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
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            style={{
              width: "100%", padding: "8px 12px",
              border: "1px solid #d1d5db", borderRadius: 8,
              fontSize: 16, color: "#111827",
              outline: "none", boxSizing: "border-box" as const,
              background: "white",
            }}
          />
          {open && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "white", border: "1px solid #d1d5db",
              borderRadius: 8, maxHeight: 240, overflowY: "auto",
              zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 13, color: "#9ca3af" }}>
                  —
                </div>
              ) : (
                filtered.slice(0, 60).map((peak) => (
                  <div
                    key={peak.id}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(peak); }}
                    style={{
                      padding: "9px 12px", cursor: "pointer",
                      background: selected?.id === peak.id ? "#f0f9ff" : "transparent",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        selected?.id === peak.id ? "#f0f9ff" : "transparent";
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
