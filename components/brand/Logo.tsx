"use client";

import { useState } from "react";

type LogoProps = {
  height?: number;
  iconScale?: number;
  className?: string;
  style?: React.CSSProperties;
  peakClassName?: string;
  adexClassName?: string;
};

export function PeakadexLogo({
  height = 44,
  iconScale = 1.0,
  className,
  style,
  peakClassName,
  adexClassName,
}: LogoProps) {
  const iconSize = Math.round(height * iconScale);
  const [spinning, setSpinning] = useState(false);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        whiteSpace: "nowrap",
        fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
        fontSize: height * 0.72,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        ...style,
      }}
    >
      <span className={peakClassName} style={{ color: "#0D2538", marginRight: Math.round(8 * 1.12) }}>peak</span>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 30 30"
        xmlns="http://www.w3.org/2000/svg"
        onClick={() => setSpinning(true)}
        onAnimationEnd={() => setSpinning(false)}
        style={{
          display: "block",
          flexShrink: 0,
          transform: "translateY(2px)",
          cursor: "pointer",
          animation: spinning ? "ball-spin 0.7s linear" : undefined,
        }}
      >
        <ellipse cx="15" cy="27" rx="8" ry="2.5" fill="rgba(0,0,0,.15)" />
        <circle cx="15" cy="15" r="13" fill="white" />
        <path d="M 2,15 A 13,13 0 0,1 28,15 Z" fill="#DC2626" />
        <circle cx="15" cy="15" r="13" fill="none" stroke="#991B1B" strokeWidth="1.2" />
        <rect x="1" y="13" width="28" height="4" fill="white" />
        <line x1="2" y1="15" x2="28" y2="15" stroke="#991B1B" strokeWidth="1.2" />
        <circle cx="15" cy="15" r="4.5" fill="white" stroke="#991B1B" strokeWidth="1.5" />
        <path d="M 6,8 A 13,13 0 0,1 24,8 Q 22,13 15,14 Q 8,13 6,8 Z" fill="white" opacity=".25" />
      </svg>
      <span className={adexClassName} style={{ color: "#8a9bb0", marginLeft: 7 }}>adex</span>
    </div>
  );
}
