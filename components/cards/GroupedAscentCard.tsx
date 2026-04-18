"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AscentData } from "@/components/ascents/AscentsClient";
import { useT } from "@/components/providers/I18nProvider";

// ─── Avatar colors (deterministic by index) ───────────────────────────────────

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
  "linear-gradient(135deg, #059669 0%, #34d399 100%)",
  "linear-gradient(135deg, #dc2626 0%, #f87171 100%)",
  "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
];

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

// ─── Mountain placeholder (same SVG as AscentCard) ────────────────────────────

function MountainPlaceholder() {
  return (
    <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="gac-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="60%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="gac-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="gac-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="gac-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <rect width="600" height="750" fill="url(#gac-sky)" />
      <polygon points="0,480 150,260 300,420 500,200 600,380 600,480" fill="#bfdbfe" opacity="0.55" />
      <polygon points="300,60 520,520 80,520" fill="url(#gac-rock)" />
      <polygon points="300,60 370,200 300,185 230,200" fill="url(#gac-snow)" />
      <rect x="0" y="500" width="600" height="250" fill="url(#gac-ground)" />
      <polygon points="60,510 85,440 110,510" fill="#16a34a" />
      <polygon points="90,510 118,430 146,510" fill="#15803d" />
      <polygon points="415,510 443,440 471,510" fill="#16a34a" />
      <polygon points="450,510 480,430 510,510" fill="#15803d" />
    </svg>
  );
}

// ─── GroupedAscentCard ────────────────────────────────────────────────────────

type Props = {
  ascents: AscentData[];
  currentUserEmail?: string | null;
  currentUserName?: string;
  animationIndex?: number;
};

export function GroupedAscentCard({
  ascents,
  currentUserEmail,
  currentUserName,
  animationIndex = 0,
}: Props) {
  const router = useRouter();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  // Use refs for current index — avoids stale closures in touch/mouse handlers
  const currentRef = useRef(0);
  const [currentDisplay, setCurrentDisplay] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Touch state refs
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const isHorizontalRef = useRef<boolean | null>(null); // null = undecided

  const count = ascents.length;

  // The current user's own ascent in the group (if any) — used for the ⋮ menu.
  // If null, no ⋮ is shown (group is all friends' ascents).
  const ownAscent = ascents.find((a) => a.isOwn) ?? null;

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  function goTo(idx: number) {
    const next = Math.max(0, Math.min(idx, count - 1));
    currentRef.current = next;
    setCurrentDisplay(next);
    if (trackRef.current) {
      trackRef.current.style.transition =
        "transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      trackRef.current.style.transform = `translateX(-${next * 100}%)`;
    }
  }

  // Ref so the touch useEffect can always call the latest goTo without
  // being included in its dependency array (avoids re-registering listeners).
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  // ── Touch — registered as non-passive so we can call preventDefault() ──────
  // iOS Safari treats React synthetic touch events as passive, which means
  // the browser interprets a horizontal swipe as image zoom/pan instead of
  // a slide change. Registering directly with { passive: false } fixes this.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const el = wrapper; // non-null capture for closures

    function onTouchStart(e: TouchEvent) {
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      draggingRef.current = true;
      isHorizontalRef.current = null; // reset — direction not yet known
      if (trackRef.current) trackRef.current.style.transition = "none";
    }

    function onTouchMove(e: TouchEvent) {
      if (!draggingRef.current) return;
      const dx = e.touches[0].clientX - startXRef.current;
      const dy = e.touches[0].clientY - startYRef.current;

      // Decide direction on first meaningful move
      if (isHorizontalRef.current === null) {
        if (Math.abs(dx) > Math.abs(dy)) {
          isHorizontalRef.current = true;
        } else {
          // Vertical scroll — hand back to the browser
          isHorizontalRef.current = false;
          draggingRef.current = false;
          return;
        }
      }

      if (!isHorizontalRef.current) return;

      // Prevent iOS from scrolling the page or zooming the image
      e.preventDefault();

      const pct =
        -currentRef.current * 100 +
        (dx / (el.offsetWidth || 1)) * 100;
      if (trackRef.current) trackRef.current.style.transform = `translateX(${pct}%)`;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!draggingRef.current || !isHorizontalRef.current) return;
      draggingRef.current = false;
      const dx = e.changedTouches[0].clientX - startXRef.current;
      if (dx < -50) goToRef.current(currentRef.current + 1);
      else if (dx > 50) goToRef.current(currentRef.current - 1);
      else goToRef.current(currentRef.current);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []); // empty — all state accessed via refs

  // ── Mouse drag (desktop) ───────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent) {
    const capturedCurrent = currentRef.current;
    startXRef.current = e.clientX;
    draggingRef.current = true;
    if (trackRef.current) trackRef.current.style.transition = "none";
    e.preventDefault();

    function onMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - startXRef.current;
      const pct =
        -capturedCurrent * 100 +
        (delta / (wrapperRef.current?.offsetWidth ?? 1)) * 100;
      if (trackRef.current) trackRef.current.style.transform = `translateX(${pct}%)`;
    }

    function onMouseUp(ev: MouseEvent) {
      draggingRef.current = false;
      const delta = ev.clientX - startXRef.current;
      if (delta < -50) goTo(capturedCurrent + 1);
      else if (delta > 50) goTo(capturedCurrent - 1);
      else goTo(capturedCurrent);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // ── Current slide data ─────────────────────────────────────────────────────

  const slide = ascents[currentDisplay];

  // If the current slide is the user's own ascent, exclude themselves from persons
  const slidePersons = slide.isOwn
    ? slide.persons.filter(
        (p) =>
          (currentUserEmail ? p.email !== currentUserEmail : true) &&
          (currentUserName ? p.name !== currentUserName : true)
      )
    : slide.persons;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        className="ascent-card"
        // @ts-expect-error CSS custom property
        style={{ "--card-i": Math.min(animationIndex, 8) }}
      >

        {/* ── Header ────────────────────────────────────────────────────── */}
        {/*
          Avatar stack (circles only, no names — too much text).
          Badge "N perspectivas" without icon.
          ⋮ menu ONLY if current user has an ascent in this group.
          If the group is entirely friends' ascents → no ⋮.
        */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px 8px" }}>

          {/* Overlapping avatar stack — up to 4 shown */}
          <div style={{ display: "flex", flexShrink: 0 }}>
            {ascents.slice(0, 4).map((a, i) => (
              <div
                key={a.id}
                style={{
                  width: 34, height: 34,
                  borderRadius: "50%",
                  border: "2px solid white",
                  marginLeft: i === 0 ? 0 : -10,
                  background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "white",
                  flexShrink: 0,
                  zIndex: ascents.length - i,
                  position: "relative",
                }}
              >
                {a.userAvatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.userAvatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  : initials(a.userName)
                }
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* "N perspectivas" badge — amber, no icon */}
          <div style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            background: "#fef3c7",
            border: "1px solid #fde68a",
            color: "#92400e",
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 9px",
            borderRadius: 20,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}>
            {count} perspectivas
          </div>

          {/* ⋮ menu — only rendered if current user has an ascent in the group */}
          {ownAscent && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  width: 30, height: 30, borderRadius: "50%",
                  color: "#6b7280", fontSize: 20, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >⋮</button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute", right: 0, top: 34, zIndex: 50,
                    background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 120, overflow: "hidden",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setMenuOpen(false); router.push(`/ascents/${ownAscent.id}`); }}
                    style={{
                      display: "block", width: "100%", padding: "10px 16px",
                      textAlign: "left", background: "none", border: "none",
                      fontSize: 13, color: "#111827", cursor: "pointer",
                    }}
                  >
                    {t.edit}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Carousel ─────────────────────────────────────────────────────── */}
        <div
          ref={wrapperRef}
          style={{
            position: "relative", aspectRatio: "4/5",
            overflow: "hidden", background: "#e2e8f0",
            cursor: "grab", userSelect: "none",
            touchAction: "pan-y", // hint: vertical scroll ok, horizontal = ours
          }}
          onMouseDown={handleMouseDown}
        >
          <div ref={trackRef} style={{ display: "flex", height: "100%", willChange: "transform" }}>
            {ascents.map((a, i) => {
              const dateStr = new Date(a.date).toLocaleDateString(t.dateLocale, {
                day: "numeric", month: "short", year: "numeric",
              });
              return (
                <div
                  key={a.id}
                  style={{
                    minWidth: "100%", height: "100%",
                    position: "relative", flexShrink: 0,
                    overflow: "hidden", background: "#e2e8f0",
                  }}
                >
                  {/* Photo */}
                  {a.firstPhotoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img
                        src={a.firstPhotoUrl}
                        alt={a.peak.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                      />
                    : <MountainPlaceholder />
                  }

                  {/* Bottom gradient — exact values from AscentCard */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: 140,
                    background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
                    pointerEvents: "none",
                  }} />

                  {/* Slide counter — top right */}
                  <div style={{
                    position: "absolute", top: 12, right: 12,
                    background: "rgba(0,0,0,0.42)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    color: "white", fontSize: 11, fontWeight: 700,
                    padding: "4px 10px", borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.18)",
                    letterSpacing: "0.03em",
                  }}>
                    {i + 1} / {count}
                  </div>

                  {/* Peak name + route + date — bottom left, exact styles from AscentCard */}
                  <div style={{ position: "absolute", bottom: 12, left: 12, right: 72 }}>
                    <p style={{
                      margin: 0, fontSize: 18, fontWeight: 800, color: "white",
                      lineHeight: 1.2, letterSpacing: "-0.01em",
                      textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {a.peak.name}
                    </p>
                    {a.route && (
                      <p style={{
                        margin: "2px 0 0", fontSize: 12, fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      }}>
                        {a.route}
                      </p>
                    )}
                    <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>
                      {dateStr}
                    </p>
                  </div>

                  {/* Bottom-right: altitud (pill) + lat/lon (texto plano) debajo */}
                  {(() => {
                    const latStr = `${Math.abs(a.peak.latitude).toFixed(4)}°${a.peak.latitude >= 0 ? "N" : "S"}`;
                    const lngStr = `${Math.abs(a.peak.longitude).toFixed(4)}°${a.peak.longitude >= 0 ? "E" : "W"}`;
                    return (
                      <div style={{
                        position: "absolute", bottom: 12, right: 12,
                        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5,
                      }}>
                        <div style={{
                          background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.25)",
                          borderRadius: 20, padding: "5px 10px",
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.01em" }}>
                            {a.peak.altitudeM.toLocaleString(t.dateLocale)} m
                          </span>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 500,
                          color: "rgba(255,255,255,0.75)",
                          textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                          letterSpacing: "0.02em",
                        }}>
                          {latStr} · {lngStr}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Dots ─────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, padding: "10px 0 6px" }}>
          {ascents.map((_, i) => (
            <div
              key={i}
              style={{
                height: 6,
                width: i === currentDisplay ? 20 : 6,
                borderRadius: 3,
                background: i === currentDisplay ? "#0369a1" : "#e5e7eb",
                transition: "width 0.22s ease, background 0.22s ease",
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* ── Caption — current slide, exact styles from AscentCard ─────── */}
        <div style={{ padding: "10px 14px 12px" }}>
          <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.5, margin: 0 }}>
            <span style={{ fontWeight: 700 }}>{slide.userName}</span>
            {slidePersons.length > 0 && (
              <span style={{ fontWeight: 400 }}>
                {" "}{t.detail_with.toLowerCase()}{" "}
                {slidePersons.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && (i === slidePersons.length - 1 ? ` ${t.detail_and} ` : ", ")}
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                  </span>
                ))}
              </span>
            )}
          </p>
          {slide.description && (
            <p style={{
              fontSize: 14, color: "#374151", margin: "4px 0 0", lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {slide.description}
            </p>
          )}
        </div>

      </div>
    </>
  );
}
