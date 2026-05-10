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
}: LogoProps) {
  const iconSize = Math.round(height * iconScale);

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-icon.svg"
        width={iconSize}
        height={iconSize}
        alt=""
        style={{ display: "block", flexShrink: 0, transform: "translateY(1px)" }}
      />
      <span className={adexClassName} style={{ color: adexColor ?? "#4E6178", marginLeft: Math.round(height * 0.28) }}>adex</span>
    </div>
  );
}
