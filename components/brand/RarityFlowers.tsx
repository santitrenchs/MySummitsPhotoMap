import React from "react";
import { RARITY_COLORS, type RarityId } from "@/lib/rarity";

interface FlowerProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function DaisyFlower({ size = 64, className, style }: FlowerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={i} cx="32" cy="17" rx="2.8" ry="9" fill={i % 2 === 0 ? "#FFFFFF" : "#F8FFF8"} stroke="#D8ECD8" strokeWidth="0.35" transform={`rotate(${i * 25.714} 32 32)`} />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <line key={i} x1="32" y1="23" x2="32" y2="15" stroke="#C8E0C8" strokeWidth="0.4" opacity="0.5" transform={`rotate(${i * 25.714} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="9.5" fill="#F5C842" />
      <circle cx="32" cy="32" r="8" fill="#E8B820" />
      <circle cx="30" cy="30" r="1.1" fill="#C99010" opacity="0.65" />
      <circle cx="34" cy="30" r="1.1" fill="#C99010" opacity="0.65" />
      <circle cx="32" cy="34" r="1.1" fill="#C99010" opacity="0.65" />
      <circle cx="29" cy="33.5" r="0.8" fill="#C99010" opacity="0.55" />
      <circle cx="35" cy="33.5" r="0.8" fill="#C99010" opacity="0.55" />
      <circle cx="31" cy="27.5" r="0.8" fill="#FFE06A" opacity="0.75" />
      <circle cx="33.5" cy="27" r="0.8" fill="#FFE06A" opacity="0.75" />
      <circle cx="36.5" cy="32" r="0.7" fill="#C99010" opacity="0.5" />
      <circle cx="27.5" cy="32" r="0.7" fill="#C99010" opacity="0.5" />
    </svg>
  );
}

export function GentianFlower({ size = 64, className, style }: FlowerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <ellipse cx="32" cy="42" rx="9.5" ry="5.5" fill="#4C1D95" />
      <path d="M22.5 41 Q21 27 32 19 Q43 27 41.5 41Z" fill="#7E22CE" />
      <path d="M27 41 Q25 29 32 21 Q32 29 32 41Z" fill="#6B21A8" opacity="0.5" />
      <path d="M29.5 39 Q28.5 30 32 22" stroke="white" strokeWidth="0.85" strokeOpacity="0.35" fill="none" />
      <path d="M32 39 Q32 30 32 21" stroke="white" strokeWidth="0.85" strokeOpacity="0.35" fill="none" />
      <path d="M34.5 39 Q35.5 30 32 22" stroke="white" strokeWidth="0.85" strokeOpacity="0.35" fill="none" />
      <ellipse cx="32" cy="18" rx="5" ry="3.5" fill="#A855F7" transform="rotate(-8 32 18)" />
      <ellipse cx="40.5" cy="22" rx="5" ry="3.5" fill="#9333EA" transform="rotate(28 40.5 22)" />
      <ellipse cx="43" cy="31" rx="5" ry="3.5" fill="#A855F7" transform="rotate(68 43 31)" />
      <ellipse cx="21" cy="31" rx="5" ry="3.5" fill="#9333EA" transform="rotate(-68 21 31)" />
      <ellipse cx="23.5" cy="22" rx="5" ry="3.5" fill="#A855F7" transform="rotate(-28 23.5 22)" />
      <ellipse cx="32" cy="39.5" rx="4.5" ry="2.5" fill="#14003A" opacity="0.7" />
      <path d="M30 38.5 Q32 36.5 34 38.5" stroke="#4ADE80" strokeWidth="0.7" fill="none" opacity="0.45" />
      <path d="M29.5 40 Q32 38 34.5 40" stroke="#4ADE80" strokeWidth="0.65" fill="none" opacity="0.35" />
      <ellipse cx="32" cy="29" rx="11" ry="9" fill="none" stroke="#C084FC" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

export function EdelweissFlower({ size = 64, className, style }: FlowerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="32" cy="14.5" rx="4.8" ry="10" fill={i % 2 === 0 ? "#E8EDF6" : "#EDF2FA"} stroke="#C5D2E8" strokeWidth="0.3" transform={`rotate(${i * 45} 32 32)`} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="32" y1="24" x2="32" y2="13" stroke="#B0C4DC" strokeWidth="0.45" opacity="0.45" transform={`rotate(${i * 45} 32 32)`} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <React.Fragment key={i}>
          <line x1="30.5" y1="17" x2="29" y2="14" stroke="#C0D0E4" strokeWidth="0.35" opacity="0.4" transform={`rotate(${i * 45} 32 32)`} />
          <line x1="33.5" y1="17" x2="35" y2="14" stroke="#C0D0E4" strokeWidth="0.35" opacity="0.4" transform={`rotate(${i * 45} 32 32)`} />
        </React.Fragment>
      ))}
      <circle cx="32" cy="32" r="8" fill="#C8D8EC" />
      <circle cx="32" cy="32" r="6.5" fill="#D8E6F4" />
      <circle cx="30" cy="30.5" r="3.2" fill="#D4A818" />
      <circle cx="34.5" cy="30.5" r="3.2" fill="#C49010" />
      <circle cx="32" cy="34.5" r="3.2" fill="#D4A818" />
      <circle cx="30" cy="30.5" r="2.2" fill="#F0C030" />
      <circle cx="34.5" cy="30.5" r="2.2" fill="#E4B020" />
      <circle cx="32" cy="34.5" r="2.2" fill="#F0C030" />
      <circle cx="30" cy="30.5" r="0.9" fill="#FFF8D0" />
      <circle cx="34.5" cy="30.5" r="0.9" fill="#FFF8D0" />
      <circle cx="32" cy="34.5" r="0.9" fill="#FFF8D0" />
    </svg>
  );
}

export function SaxifrageFlower({ size = 64, className, style }: FlowerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="32" cy="16" rx="4" ry="7" fill="#3D7A1A" transform={`rotate(${36 + i * 72} 32 32)`} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="32" cy="17.5" rx="7" ry="9.5" fill={i % 2 === 0 ? "#FFF6F2" : "#FFF1EC"} stroke="#FDDCD0" strokeWidth="0.4" transform={`rotate(${i * 72} 32 32)`} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <React.Fragment key={i}>
          <circle cx="32" cy="20" r="1.3" fill="#F97316" opacity="0.85" transform={`rotate(${i * 72} 32 32)`} />
          <circle cx="32" cy="23" r="0.9" fill="#EA6000" opacity="0.65" transform={`rotate(${i * 72} 32 32)`} />
        </React.Fragment>
      ))}
      <circle cx="32" cy="32" r="6.5" fill="#FED7AA" />
      <circle cx="32" cy="32" r="5" fill="#FDBA74" />
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i * 36 * Math.PI) / 180;
        const r = 3.8;
        const x = 32 + r * Math.sin(angle);
        const y = 32 - r * Math.cos(angle);
        return <circle key={i} cx={x} cy={y} r="1.15" fill="#C2410C" />;
      })}
      <circle cx="32" cy="32" r="2.8" fill="#7C2D0A" />
      <circle cx="31.2" cy="31.5" r="1.2" fill="#9A3412" />
      <circle cx="33" cy="32.8" r="1.1" fill="#9A3412" />
    </svg>
  );
}

export function CinquefoilFlower({ size = 64, className, style }: FlowerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="32" cy="15.5" rx="5.5" ry="8.5" fill="#3D7A1A" transform={`rotate(${36 + i * 72} 32 32)`} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="32" cy="17" rx="7.5" ry="9.8" fill={i % 2 === 0 ? "#FDE047" : "#FCD034"} stroke="#CA8A04" strokeWidth="0.2" transform={`rotate(${i * 72} 32 32)`} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1="32" y1="23" x2="32" y2="16" stroke="#A16207" strokeWidth="0.5" opacity="0.35" transform={`rotate(${i * 72} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="9.5" fill="#B45309" />
      <circle cx="32" cy="32" r="8" fill="#D97706" />
      <circle cx="32" cy="32" r="6.5" fill="#F59E0B" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const r = 5;
        const x = 32 + r * Math.sin(angle);
        const y = 32 - r * Math.cos(angle);
        return <circle key={i} cx={x} cy={y} r="1.2" fill="#FDE68A" />;
      })}
      <circle cx="32" cy="32" r="3.2" fill="#92400E" />
      <circle cx="32" cy="32" r="2" fill="#78350F" />
      <circle cx="32" cy="32" r="1" fill="#6B2A0A" />
    </svg>
  );
}

export function SnowLotusFlower({ size = 64, className, style }: FlowerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx="32" cy="13" rx="6" ry="11" fill={i % 2 === 0 ? "#F0ECFF" : "#EAE4FF"} stroke="#C4B8E4" strokeWidth="0.5" opacity="0.72" transform={`rotate(${i * 60} 32 32)`} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1="32" y1="22" x2="32" y2="13" stroke="#A090CC" strokeWidth="0.5" opacity="0.38" transform={`rotate(${i * 60} 32 32)`} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx="32" cy="18.5" rx="4.8" ry="8" fill={i % 2 === 0 ? "#DDD4F8" : "#E4DCF8"} stroke="#B0A0D8" strokeWidth="0.4" opacity="0.88" transform={`rotate(${30 + i * 60} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="10.5" fill="#5B21B6" />
      <circle cx="32" cy="32" r="9" fill="#6D28D9" />
      {([[32,24.5],[36.5,26],[39.5,30],[38.5,35],[35,39],[29,39],[25.5,35],[24.5,30],[27.5,26]] as [number,number][]).map(([cx, cy], i) => (
        <React.Fragment key={i}>
          <circle cx={cx} cy={cy} r="2.1" fill="#8B5CF6" />
          <circle cx={cx} cy={cy} r="1.1" fill="#A78BFA" />
          <circle cx={cx} cy={cy} r="0.65" fill="#FCD34D" />
        </React.Fragment>
      ))}
      <circle cx="32" cy="32" r="2.5" fill="#7C3AED" />
      <circle cx="32" cy="32" r="1.5" fill="#A78BFA" />
      <circle cx="32" cy="32" r="0.8" fill="#FFD700" />
    </svg>
  );
}

export const RARITY_FLOWERS: Record<string, React.ComponentType<FlowerProps>> = {
  daisy: DaisyFlower,
  gentian: GentianFlower,
  edelweiss: EdelweissFlower,
  saxifrage: SaxifrageFlower,
  cinquefoil: CinquefoilFlower,
  snow_lotus: SnowLotusFlower,
};

// Inline flower icon for use at small sizes (badges, tiles, filter chips).
// Uses the full SVG at the requested size.
export function RarityFlower({ id, size = 20 }: { id: RarityId | string; size?: number }) {
  const Component = RARITY_FLOWERS[id];
  if (Component) return <Component size={size} />;
  // Fallback for unknown ids
  const color = RARITY_COLORS[id as RarityId] ?? "#94A3B8";
  return (
    <span style={{ fontSize: size * 0.85, lineHeight: 1, color, display: "inline-block", userSelect: "none" }} aria-hidden>
      ✿
    </span>
  );
}
