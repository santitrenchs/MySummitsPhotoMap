"use client";

import React from "react";

/**
 * The app's search input. Use this — never hand-roll another one.
 *
 * Two variants, because the app genuinely has two contexts and they must not be mixed:
 *
 *  · "filled"   — grey field on a WHITE band. Used in list+add headers (Amigos/Cordadas,
 *                 Retos) and inside sheets. It needs white behind it: on the #F4F7FA list
 *                 background it turns muddy, which is exactly the bug this replaces.
 *  · "outlined" — white field with a border, on the #F4F7FA catalogue background. Used in
 *                 filter bars (tab Cimas, detalle de un reto).
 *
 * Font size is never below 16px on the outlined variant: iOS Safari auto-zooms on focus
 * under that, which shifts the whole viewport.
 */

type Variant = "filled" | "outlined";

export function SearchField({
  value,
  onChange,
  placeholder,
  variant = "outlined",
  clearLabel = "Clear",
  autoFocus,
  onKeyDown,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  variant?: Variant;
  clearLabel?: string;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  /** For programmatic focus — e.g. focusing after a sheet's open animation. */
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  if (variant === "filled") {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", gap: 10,
        background: "#f3f4f6", borderRadius: 12, padding: "0 12px", height: 44,
        minWidth: 0,
      }}>
        <SearchIcon size={16} stroke="#9ca3af" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 16, color: "#111827", minWidth: 0,
          }}
        />
        {value && (
          <button
            onClick={() => onChange("")}
            aria-label={clearLabel}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9ca3af" }}
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
      <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
        <SearchIcon size={14} stroke="#94A3B8" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        style={{
          width: "100%", padding: "10px 12px 10px 32px",
          background: "white", border: "1px solid #E5E7EB",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
          fontSize: 16, color: "#0D2538", outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function SearchIcon({ size, stroke }: { size: number; stroke: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth="2.2" strokeLinecap="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
