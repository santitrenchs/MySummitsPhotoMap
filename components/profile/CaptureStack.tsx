"use client";

import { RARITY_COLORS } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";

export function CaptureStack({ count, rarityId }: { count: number; rarityId: RarityId }) {
  const accent = RARITY_COLORS[rarityId] ?? "#94A3B8";

  if (count === 1) {
    return (
      <span style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>
        ×1
      </span>
    );
  }

  const visible = Math.min(count, 4);
  const overflow = count > 4 ? count - 4 : 0;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {Array.from({ length: visible }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 18, height: 22, borderRadius: 4,
            border: `1.5px solid ${accent}`,
            marginLeft: i === 0 ? 0 : -6,
            background: i === 0 ? accent : "white",
            boxShadow: i > 0 ? "0 1px 4px rgba(13,37,56,0.12)" : undefined,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, zIndex: visible - i,
            position: "relative",
          }}
        >
          {i === 0 && (
            <span style={{
              fontFamily: "var(--font-mono-landing, monospace)",
              fontSize: 11, fontWeight: 800, color: "white",
              letterSpacing: "0.01em", whiteSpace: "nowrap",
            }}>
              ×{count}
            </span>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <span style={{
          marginLeft: 4,
          fontFamily: "var(--font-mono-landing, monospace)",
          fontSize: 10, fontWeight: 700, color: accent,
        }}>
          +{overflow}
        </span>
      )}
    </div>
  );
}
