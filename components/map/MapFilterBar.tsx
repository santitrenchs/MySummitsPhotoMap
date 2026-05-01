"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { RarityDef } from "./MapView";
import { RARITY_COLORS } from "./MapView";

type Filter = "all" | "climbed" | "not-climbed";

interface MapFilterBarProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  rarityFilter: string[];
  onRarityChange: (ids: string[]) => void;
  mythicOnly: boolean;
  onMythicToggle: () => void;
  rarities: RarityDef[];
  climbedCount: number;
  hillshade: boolean;
  onHillshadeToggle: () => void;
  terrain3d: boolean;
  onTerrain3dToggle: () => void;
}

// ─── Dropdown wrapper ────────────────────────────────────────────────────────
// Menu renders as a portal in document.body (position:fixed) so it escapes
// any overflow or stacking-context parent — including the maplibre canvas.

function Dropdown({ label, active, children }: { label: string; active: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 6, left: r.left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={() => open ? setOpen(false) : openMenu()}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "7px 13px", borderRadius: 999,
          border: `1.5px solid ${active ? "#1e293b" : "#d1d5db"}`,
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          background: active ? "#1e293b" : "white",
          color: active ? "white" : "#374151",
          whiteSpace: "nowrap",
          transition: "background 0.15s, color 0.15s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
      >
        {label}
        <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 1 }}>▾</span>
      </button>

      {open && menuPos && createPortal(
        <div style={{
          position: "fixed", top: menuPos.top, left: menuPos.left,
          background: "white", borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          border: "1px solid #e5e7eb",
          zIndex: 9999, minWidth: 180,
          overflow: "hidden",
        }}>
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapFilterBar({
  filter, onFilterChange,
  rarityFilter, onRarityChange,
  mythicOnly, onMythicToggle,
  rarities, climbedCount,
  hillshade, onHillshadeToggle,
  terrain3d, onTerrain3dToggle,
}: MapFilterBarProps) {
  const statusOptions: { value: Filter; label: string; color?: string }[] = [
    { value: "all",         label: "Todas las cimas" },
    { value: "climbed",     label: `Escaladas (${climbedCount})`, color: "#16a34a" },
    { value: "not-climbed", label: "No escaladas" },
  ];

  const rarityActive = rarityFilter.length > 0;
  const rarityLabel = rarityActive ? `Rareza · ${rarityFilter.length}` : "Rareza";

  function toggleRarity(id: string) {
    onRarityChange(
      rarityFilter.includes(id)
        ? rarityFilter.filter((r) => r !== id)
        : [...rarityFilter, id]
    );
  }

  return (
    <div style={{ display: "contents" }}>
      {/* Estado */}
      <Dropdown
        label={filter === "all" ? "Estado" : filter === "climbed" ? `✓ Escaladas (${climbedCount})` : "No escaladas"}
        active={filter !== "all"}
      >
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onFilterChange(opt.value); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "11px 16px",
              background: filter === opt.value ? "#f3f4f6" : "none",
              border: "none", cursor: "pointer", textAlign: "left",
              fontSize: 13, fontWeight: filter === opt.value ? 700 : 500,
              color: opt.color ?? "#111827",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            {filter === opt.value && <span style={{ fontSize: 11 }}>✓</span>}
            {opt.label}
          </button>
        ))}
      </Dropdown>

      {/* Rareza */}
      <Dropdown label={rarityLabel} active={rarityActive || mythicOnly}>
        <div style={{ padding: "8px 0" }}>
          {rarities.filter((r) => r.id !== "mythic").map((r) => {
            const checked = rarityFilter.includes(r.id);
            const color = RARITY_COLORS[r.id] ?? "#6b7280";
            return (
              <button
                key={r.id}
                onClick={() => toggleRarity(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 16px",
                  background: checked ? "#f8fafc" : "none",
                  border: "none", cursor: "pointer", textAlign: "left",
                  fontSize: 13, fontWeight: checked ? 700 : 500,
                  color,
                }}
              >
                <span style={{
                  fontSize: 18, color, flexShrink: 0, lineHeight: 1,
                  opacity: checked ? 1 : 0.65,
                  transition: "opacity 0.15s",
                }}>✿</span>
                <span style={{ flex: 1 }}>{r.name}</span>
                {checked && <span style={{ fontSize: 11, color }}>✓</span>}
              </button>
            );
          })}
        </div>
      </Dropdown>

      {/* Mythic — independent toggle, brand name not translated */}
      <button
        onClick={onMythicToggle}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "7px 13px", borderRadius: 999,
          border: `1.5px solid ${mythicOnly ? "#1e293b" : "#d1d5db"}`,
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          background: mythicOnly ? "#1e293b" : "white",
          color: mythicOnly ? "white" : "#374151",
          whiteSpace: "nowrap", flexShrink: 0,
          transition: "background 0.15s, color 0.15s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
      >
        ✨ Mythic
      </button>

      {/* Relieve — pill style */}
      <button
        onClick={onHillshadeToggle}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "7px 13px", borderRadius: 999, flexShrink: 0,
          border: `1.5px solid ${hillshade ? "#1e293b" : "#d1d5db"}`,
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          background: hillshade ? "#1e293b" : "white",
          color: hillshade ? "white" : "#374151",
          whiteSpace: "nowrap",
          transition: "background 0.15s, color 0.15s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
      >Relieve</button>

      {/* 3D — pill style */}
      <button
        onClick={onTerrain3dToggle}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "7px 13px", borderRadius: 999, flexShrink: 0,
          border: `1.5px solid ${terrain3d ? "#1e293b" : "#d1d5db"}`,
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          background: terrain3d ? "#1e293b" : "white",
          color: terrain3d ? "white" : "#374151",
          whiteSpace: "nowrap",
          transition: "background 0.15s, color 0.15s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
      >3D</button>
    </div>
  );
}
