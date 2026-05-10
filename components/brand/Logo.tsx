"use client";

type LogoProps = {
  height?: number;
  iconScale?: number;
  className?: string;
  style?: React.CSSProperties;
  peakClassName?: string;
  adexClassName?: string;
  peakColor?: string;
  adexColor?: string;
  iconBgColor?: string;
};

export function PeakadexLogo({
  height = 44,
  iconScale = 1.0,
  className,
  style,
  peakClassName,
  adexClassName,
  peakColor,
  adexColor,
  iconBgColor,
}: LogoProps) {
  const iconSize = Math.round(height * iconScale);
  const color = "#00995C";

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
      <span className={peakClassName} style={{ color: peakColor ?? "#0D2538", marginRight: Math.round(height * 0.28) }}>peak</span>
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: "50%",
          border: `${Math.max(2, iconSize * 0.065)}px solid ${color}`,
          background: iconBgColor ?? "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: Math.round(iconSize * 0.67),
          color,
          lineHeight: 1,
          transform: "translateY(1px)",
        }}
      >
        ✿
      </div>
      <span className={adexClassName} style={{ color: adexColor ?? "#4E6178", marginLeft: Math.round(height * 0.28) }}>adex</span>
    </div>
  );
}
