"use client";

import { useEffect, useRef, useState } from "react";
import { RARITIES } from "@/lib/rarity";
import { useT } from "@/components/providers/I18nProvider";

// altitude display helper — "< 1.500 m", "1.500 – 2.999 m", "≥ 8.000 m"
function altRange(idx: number, locale: string): string {
  const cur = RARITIES[idx];
  const next = RARITIES[idx + 1];
  if (idx === 0) return `< ${next!.minAlt.toLocaleString(locale)} m`;
  if (!next) return `≥ ${cur.minAlt.toLocaleString(locale)} m`;
  return `${cur.minAlt.toLocaleString(locale)} – ${(next.minAlt - 1).toLocaleString(locale)} m`;
}

const CARD_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  daisy:      { bg: "#f0fdf7", border: "#6ee7b7", text: "#007a46" },
  gentian:    { bg: "#faf5ff", border: "#d8b4fe", text: "#7e22ce" },
  edelweiss:  { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
  saxifrage:  { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  cinquefoil: { bg: "#fefce8", border: "#fde047", text: "#854d0e" },
  snow_lotus: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
};

export default function MapOnboardingModal() {
  const t = useT();
  const [visible, setVisible] = useState(true);
  const [dontShow, setDontShow] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("peakadex_map_onboarding") === "seen") {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  async function handleClose(persist: boolean) {
    if (persist) {
      localStorage.setItem("peakadex_map_onboarding", "seen");
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapOnboardingSeen: true }),
      }).catch(() => {});
    }
    setVisible(false);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const delta = Math.max(0, e.touches[0].clientY - touchStartY.current);
    setDragY(delta);
  }

  function onTouchEnd() {
    isDragging.current = false;
    setDragging(false);
    if (dragY > 80) {
      handleClose(false);
    } else {
      setDragY(0);
    }
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  // derive locale from document lang for number formatting
  const locale = typeof document !== "undefined" ? (document.documentElement.lang || "en") : "en";

  // split title on \n for the line break
  const titleParts = t.map_onboarding_title.split("\n");

  return (
    <>
      <div
        onClick={() => handleClose(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(11,22,40,0.72)",
          backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
          animation: "obFadeIn 0.25s ease forwards",
        }}
      />

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          zIndex: 1101,
          ...(isMobile ? {
            bottom: 0, left: 0, right: 0,
            borderRadius: "20px 20px 0 0",
            maxHeight: "92svh", overflowY: "auto",
            transform: `translateY(${dragY}px)`,
            transition: dragging ? "none" : "transform 0.2s ease",
            animation: "obSlideUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards",
          } : {
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(540px, 92vw)",
            borderRadius: 20,
            maxHeight: "90svh", overflowY: "auto",
            animation: "obModalIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards",
          }),
          background: "#fff",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* accent bar */}
        <div style={{
          height: 4,
          background: "linear-gradient(90deg,#0369a1 0%,#38bdf8 50%,#818cf8 100%)",
          borderRadius: "20px 20px 0 0",
        }} />

        {/* drag handle (mobile only) */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e2e8f0" }} />
          </div>
        )}

        {/* header */}
        <div style={{ padding: isMobile ? "16px 20px 0" : "24px 28px 0" }}>
          <h2 style={{
            fontSize: isMobile ? 22 : 26, fontWeight: 800,
            color: "#0f172a", lineHeight: 1.2, letterSpacing: "-0.4px", margin: "0 0 10px",
          }}>
            {titleParts[0]}{titleParts[1] && <><br />{titleParts[1]}</>}
          </h2>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
            {t.map_onboarding_sub}
          </p>
        </div>

        {/* divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          margin: isMobile ? "16px 20px 12px" : "20px 28px 14px",
        }}>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {t.map_onboarding_rarities}
          </span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>

        {/* rarity grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8, padding: isMobile ? "0 20px" : "0 28px",
        }}>
          {RARITIES.map((r, idx) => {
            const cs = CARD_STYLES[r.id] ?? { bg: "#f8fafc", border: "#e2e8f0", text: "#334155" };
            return (
              <div key={r.id} style={{
                background: cs.bg, border: `1.5px solid ${cs.border}`,
                borderRadius: 12, padding: "12px 8px 10px",
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              }}>
                <span style={{ fontSize: 28, lineHeight: 1, marginBottom: 6, color: r.color }}>✿</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: cs.text, lineHeight: 1.1, marginBottom: 3 }}>
                  {r.label}
                </span>
                <span style={{ fontSize: 9.5, color: cs.text, opacity: 0.65, lineHeight: 1.2 }}>
                  {altRange(idx, locale)}
                </span>
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div style={{
          padding: isMobile ? "16px 20px 28px" : "20px 28px 28px",
          display: "flex", flexDirection: "column", gap: 12, alignItems: "center",
        }}>
          <button
            onClick={() => handleClose(dontShow)}
            style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg,#0369a1 0%,#0ea5e9 100%)",
              color: "#fff", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 18px rgba(3,105,161,0.35)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M16 8L13.5 14.5L8 16L10.5 9.5L16 8Z" />
            </svg>
            {t.map_onboarding_cta}
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: "#0369a1", cursor: "pointer", flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
              {t.map_onboarding_dontShow}
            </span>
          </label>
        </div>
      </div>

      <style>{`
        @keyframes obFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes obSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes obModalIn { from { opacity: 0; transform: translate(-50%,-48%) scale(0.97) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
      `}</style>
    </>
  );
}
