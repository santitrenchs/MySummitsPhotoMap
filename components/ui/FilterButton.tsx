"use client";

/**
 * The app's filter button, always paired with a <SearchField variant="outlined">.
 * Use this — never hand-roll another one.
 *
 * Active state is NAVY (#0D2538), not the blue used by chips. Blue is for a selected
 * option inside a panel; navy is for "this control is doing something to the list".
 */
export function FilterButton({
  label,
  active,
  onClick,
  badgeCount,
}: {
  label: string;
  /** Panel open, or filters applied — both render the same navy state. */
  active: boolean;
  onClick: () => void;
  /** Shows the orange counter bubble when > 0. */
  badgeCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px", borderRadius: "var(--radius-md)",
        border: `1px solid ${active ? "#0D2538" : "#E5E7EB"}`,
        background: active ? "#0D2538" : "white",
        boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        flexShrink: 0, position: "relative",
      }}
    >
      <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke={active ? "white" : "#374151"} strokeWidth="1.8" strokeLinecap="round">
        <line x1="0" y1="2" x2="14" y2="2" />
        <line x1="2" y1="6" x2="12" y2="6" />
        <line x1="4" y1="10" x2="10" y2="10" />
      </svg>
      <span style={{
        fontFamily: "var(--font-inter, sans-serif)",
        fontSize: 13, fontWeight: 700,
        color: active ? "white" : "#374151",
      }}>
        {label}
      </span>
      {!!badgeCount && badgeCount > 0 && (
        <div style={{
          position: "absolute", top: -6, right: -6,
          width: 16, height: 16, borderRadius: "50%",
          background: active ? "white" : "#FF5D2D",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "var(--font-mono-landing, monospace)",
            fontSize: 10, fontWeight: 800,
            color: active ? "#0D2538" : "white",
          }}>
            {badgeCount}
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * The green "+ Añadir" action that sits next to a filled search field.
 * Green (#2F7A5F) is the app's create/positive colour everywhere, web and Android.
 */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 14px", height: 44, borderRadius: 12, border: "none",
        background: "#2F7A5F", color: "white",
        fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </button>
  );
}
