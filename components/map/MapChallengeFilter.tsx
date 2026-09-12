"use client";

import { useT } from "@/components/providers/I18nProvider";

export type MapChallengeOption = {
  id: string;
  name: string;
  totalPeaks: number;
  completedPeaks: number;
};

/**
 * "Retos" section of the Atlas filter panels (sidebar on desktop, sheet on mobile).
 *
 * A reto is not another filter, it is the *scope*: picking one narrows the Atlas to
 * its peaks, and Estado / Rareza keep working inside it ("Sin capturar" within a reto
 * is exactly the user's to-do list). That is why it sits above them, is single-select,
 * and renders nothing when the user has joined no challenges — an empty section would
 * just be a dead heading on every map.
 */
export function MapChallengeFilter({
  challenges,
  activeId,
  onSelect,
  loading = false,
}: {
  challenges: MapChallengeOption[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
}) {
  const t = useT();
  if (!loading && challenges.length === 0) return null;

  return (
    <div>
      <p style={{
        fontFamily: "var(--font-inter, sans-serif)", fontSize: 10, fontWeight: 800,
        letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase", margin: "0 0 8px",
      }}>
        {t.challenges_tab}
      </p>

      {loading && challenges.length === 0 ? (
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1].map((k) => (
            <div key={k} style={{
              height: 34, width: k === 0 ? 148 : 116,
              borderRadius: "var(--radius-full)", background: "#F1F5F9",
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {challenges.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(active ? null : c.id)}
                title={c.name}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  maxWidth: "100%", padding: "7px 12px",
                  borderRadius: "var(--radius-full)", cursor: "pointer",
                  border: `1.5px solid ${active ? "#0D2538" : "#E5E7EB"}`,
                  background: active ? "#0D2538" : "#f9fafb",
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  fontSize: 12.5, fontWeight: 600, minWidth: 0,
                  color: active ? "white" : "#374151",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {c.name}
                </span>
                <span style={{
                  flexShrink: 0,
                  fontFamily: "var(--font-mono-landing, monospace)",
                  fontSize: 11, fontWeight: 700,
                  color: active ? "#8FD3B4" : "#9ca3af",
                }}>
                  {c.completedPeaks}/{c.totalPeaks}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
