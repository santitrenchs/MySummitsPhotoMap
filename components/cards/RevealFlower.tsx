"use client";

import { useMemo } from "react";
import Lottie from "lottie-react";
import { replaceColor } from "lottie-colorify";
import flowerData from "@/components/cards/flower-bloom.json";

// Source colors in the daisy Lottie (see flower-bloom.json):
//   petals fill        → #D9E0E6 (light gray)
//   center fill+stroke → #2497F5 (blue)
// Petal black outlines (#000000) and vein lines (#A1ADB7) are left untouched.
const PETAL_SRC = "#D9E0E6";
const CENTER_SRC = "#2497F5";

function darken(hex: string, f: number): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

type Props = {
  /** Petal color (rarity color, or gold for the mythic copy). */
  color: string;
  onComplete?: () => void;
  style?: React.CSSProperties;
};

/**
 * The daisy flower, recolored per rarity at runtime (lottie-colorify — lottie-web
 * has no keyPath API like Android). Petals = `color`, center disc = a darker shade.
 * Blooms once. For the mythic gold cross-fade, render a second copy with color="#FFD700".
 */
export function RevealFlower({ color, onComplete, style }: Props) {
  const data = useMemo(() => {
    const center = darken(color, 0.55);
    let d = replaceColor(PETAL_SRC, color, flowerData);
    d = replaceColor(CENTER_SRC, center, d);
    return d;
  }, [color]);

  return (
    <Lottie
      animationData={data}
      loop={false}
      autoplay
      onComplete={onComplete}
      style={style}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
    />
  );
}
