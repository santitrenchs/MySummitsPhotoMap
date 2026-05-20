"use client";

import { useEffect, useState } from "react";

const SHOW_THRESHOLD_PX = 1500;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_THRESHOLD_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={handleClick}
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(var(--bottom-nav-h, 0px) + 16px + env(safe-area-inset-bottom))",
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "none",
        background: "rgba(13, 37, 56, 0.92)",
        color: "white",
        boxShadow: "0 4px 14px rgba(13, 37, 56, 0.25)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.18s ease, transform 0.18s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>
  );
}
