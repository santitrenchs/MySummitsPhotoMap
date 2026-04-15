"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = "azitracks_location_decision";
const SS_KEY = "azitracks_location_prompt_shown";

type Decision = "granted" | "denied" | "soft:1" | "soft:2";

function readDecision(): Decision | null {
  try {
    return localStorage.getItem(LS_KEY) as Decision | null;
  } catch {
    return null;
  }
}

function saveDecision(d: Decision) {
  try {
    localStorage.setItem(LS_KEY, d);
  } catch {
    // ignore
  }
}

/**
 * Returns true only if:
 * - The persistent decision allows showing (null or soft:1)
 * - AND the prompt hasn't already been shown this session
 *
 * sessionStorage is cleared on logout/new tab, so a new session always gets
 * a fresh chance to see the prompt (up to the soft-reject limit).
 */
function shouldShowPrompt(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has("location-debug")) return true;
    const d = readDecision();
    if (d !== null && d !== "soft:1") return false;
    if (sessionStorage.getItem(SS_KEY)) return false;
    return true;
  } catch {
    return false;
  }
}

function markShownThisSession() {
  try {
    sessionStorage.setItem(SS_KEY, "1");
  } catch {
    // ignore
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocationPrompt({
  onGpsAcquired,
}: {
  onGpsAcquired: (pos: { lat: number; lon: number }) => void;
}) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dismissedRef = useRef(false); // guard against double-dismiss

  // Touch-to-dismiss (swipe down)
  const touchStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!shouldShowPrompt()) return;

    // Mark as shown for this session immediately so reloads don't re-trigger
    markShownThisSession();

    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setSlideIn(true));
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  function dismiss(soft: boolean) {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    setSlideIn(false);
    setTimeout(() => setVisible(false), 250);

    if (soft) {
      const current = readDecision();
      saveDecision(current === "soft:1" ? "soft:2" : "soft:1");
    }
  }

  function handleAllow() {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    if (!("geolocation" in navigator)) {
      saveDecision("denied");
      setSlideIn(false);
      setTimeout(() => setVisible(false), 250);
      return;
    }

    // Slide out immediately — the OS permission dialog appears on top
    setSlideIn(false);
    setTimeout(() => setVisible(false), 250);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveDecision("granted");
        onGpsAcquired({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => saveDecision("denied"),
      { timeout: 15_000, maximumAge: 60_000 }
    );
  }

  function handleDismiss() {
    dismiss(true);
  }

  // Swipe-to-dismiss (downward only, > 60px)
  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current || touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragY(delta);
  }

  function onTouchEnd() {
    isDragging.current = false;
    if (dragY > 60) {
      setDragY(0);
      dismiss(true);
    } else {
      setDragY(0);
    }
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(var(--bottom-nav-h, 60px) + 12px)",
        // Mobile: full width with margin. Desktop: 380px centered horizontally.
        left: isMobile ? 12 : "50%",
        right: isMobile ? 12 : "auto",
        width: isMobile ? "auto" : 380,
        zIndex: 500,
        borderRadius: 16,
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)",
        padding: "16px 16px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        transform: isMobile
          ? (slideIn ? `translateY(${dragY}px)` : "translateY(calc(100% + 72px))")
          : (slideIn ? `translateX(-50%) translateY(${dragY}px)` : "translateX(-50%) translateY(calc(100% + 72px))"),
        transition: isDragging.current
          ? "none"
          : "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Icon */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 18,
      }}>
        📍
      </div>

      {/* Text + actions */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: "#111827",
          lineHeight: 1.3,
        }}>
          {t.map_locationPrompt}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={handleAllow}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            {t.map_locationAllow}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color: "#374151",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            {t.map_locationDismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
