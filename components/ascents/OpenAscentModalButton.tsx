"use client";

export function OpenAscentModalButton({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <button
      onClick={() => document.dispatchEvent(new CustomEvent("open-ascent-modal"))}
      style={{ border: "none", cursor: "pointer", ...style }}
    >
      {label}
    </button>
  );
}
