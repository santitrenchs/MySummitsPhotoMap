import { RARITY_COLORS, type RarityId } from "@/lib/rarity";

// Renders a tinted ✿ emoji at the requested size, colour-coded by rarity.
export function RarityFlower({ id, size = 20 }: { id: RarityId | string; size?: number }) {
  const color = RARITY_COLORS[id as RarityId] ?? "#94A3B8";
  return (
    <span
      style={{ fontSize: size * 0.85, lineHeight: 1, color, display: "inline-block", userSelect: "none" }}
      aria-hidden
    >
      ✿
    </span>
  );
}
