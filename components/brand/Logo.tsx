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
  const color = "#DC2626";

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
      <span className={peakClassName} style={{ color: peakColor ?? "#0D2538", marginRight: Math.round(8 * 1.12) }}>peak</span>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 30 30"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", flexShrink: 0, transform: "translateY(2px)" }}
      >
        <path d="M15 3 Q20.5 9 15 15 Q9.5 9 15 3Z" fill={color}/>
        <path d="M26.4 11.3 Q22.4 18.4 15 15 Q19 7.9 26.4 11.3Z" fill={color}/>
        <path d="M22.1 24.7 Q14.1 23.1 15 15 Q23 16.6 22.1 24.7Z" fill={color}/>
        <path d="M7.9 24.7 Q7 16.6 15 15 Q15.9 23.1 7.9 24.7Z" fill={color}/>
        <path d="M3.6 11.3 Q11 7.9 15 15 Q7.6 18.4 3.6 11.3Z" fill={color}/>
        <path d="M15 3 Q20.5 9 15 15 Q9.5 9 15 3Z" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5"/>
        <path d="M26.4 11.3 Q22.4 18.4 15 15 Q19 7.9 26.4 11.3Z" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5"/>
        <path d="M22.1 24.7 Q14.1 23.1 15 15 Q23 16.6 22.1 24.7Z" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5"/>
        <path d="M7.9 24.7 Q7 16.6 15 15 Q15.9 23.1 7.9 24.7Z" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5"/>
        <path d="M3.6 11.3 Q11 7.9 15 15 Q7.6 18.4 3.6 11.3Z" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5"/>
        <path d="M15 4.5 Q17.5 8 16 12 Q14 12 13 8 Q12 5.5 15 4.5Z" fill="white" opacity="0.3"/>
        <circle cx="15" cy="15" r="4" fill="white"/>
        <circle cx="15" cy="15" r="4" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5"/>
      </svg>
      <span className={adexClassName} style={{ color: adexColor ?? "#8a9bb0", marginLeft: 7 }}>adex</span>
    </div>
  );
}
