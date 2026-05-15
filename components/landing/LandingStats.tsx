"use client";

import { useRef, useState, useEffect } from "react";

type Stats = {
  totalRarities: number;
  totalPeaks: number;
  capturedPeaks: number;
  totalAscents: number;
};

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || target === 0) return;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quart
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, active, duration]);

  return value;
}

function StatCard({
  label,
  sublabel,
  target,
  active,
  suffix = "",
  duration,
}: {
  label: string;
  sublabel: string;
  target: number;
  active: boolean;
  suffix?: string;
  duration?: number;
}) {
  const value = useCountUp(target, active, duration);

  return (
    <div style={{ textAlign: "center", padding: "0 16px" }}>
      <div
        style={{
          fontSize: "clamp(36px, 5vw, 60px)",
          fontWeight: 800,
          fontFamily: "var(--font-space, sans-serif)",
          color: "#2F7A5F",
          letterSpacing: "-0.03em",
          lineHeight: 1,
          marginBottom: 8,
          tabularNums: "tabular-nums",
          fontVariantNumeric: "tabular-nums",
        } as React.CSSProperties}
      >
        {value.toLocaleString("es-ES")}{suffix}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0D2538", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: "#5A6E84" }}>
        {sublabel}
      </div>
    </div>
  );
}

export default function LandingStats({ stats }: { stats: Stats }) {
  const [active, setActive] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const s = stats;

  return (
    <section
      ref={sectionRef}
      style={{
        background: "#fff",
        borderTop: "1px solid rgba(13,37,56,0.07)",
        borderBottom: "1px solid rgba(13,37,56,0.07)",
        padding: "56px 0",
      }}
    >
      <div className="ld-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0,
          }}
          className="ld-stats-grid"
        >
          {/* Dividers between columns */}
          {[
            { label: "Cimas en el Azimut", sublabel: "picos catalogados", target: s.totalPeaks, duration: 1600 },
            { label: "Cimas capturadas", sublabel: "ya tiene dueño", target: s.capturedPeaks, duration: 1400 },
            { label: "Ascensiones", sublabel: "registradas en total", target: s.totalAscents, duration: 1200 },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                borderLeft: i === 0 ? "none" : "1px solid rgba(13,37,56,0.08)",
              }}
            >
              <StatCard {...item} active={active} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .ld-stats-grid {
            grid-template-columns: 1fr !important;
            gap: 32px 0 !important;
          }
          .ld-stats-grid > div {
            border-left: none !important;
            border-top: none !important;
          }
        }
      `}</style>
    </section>
  );
}
