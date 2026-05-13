import { RARITY_COLORS, type RarityId } from "@/lib/rarity";

// Placeholder: renders a tinted ✿ glyph until botanical SVGs land.
// Replace individual entries with proper <svg> components as they are designed.
export function RarityFlower({ id, size = 20 }: { id: RarityId | string; size?: number }) {
  const color = RARITY_COLORS[id] ?? "#94A3B8";
  return (
    <span
      style={{
        fontSize: size * 0.85,
        lineHeight: 1,
        color,
        display: "inline-block",
        userSelect: "none",
      }}
      aria-hidden
    >
      ✿
    </span>
  );
}

export const RARITY_FLOWERS = Object.fromEntries(
  Object.keys(RARITY_COLORS).map((id) => [id, (size?: number) => <RarityFlower id={id} size={size} />])
) as Record<string, (size?: number) => React.ReactNode>;
