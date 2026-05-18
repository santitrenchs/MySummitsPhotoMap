"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_KEY = "cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 24 months

function getConsent(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setConsent(value: "all" | "necessary") {
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  function accept() {
    setConsent("all");
    setVisible(false);
  }

  function necessary() {
    setConsent("necessary");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#0D2538",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.3)",
      }}
    >
      <p
        style={{
          flex: 1,
          minWidth: 220,
          fontSize: 13,
          color: "rgba(240,244,255,0.7)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Usamos cookies técnicas para el funcionamiento de la plataforma y, con tu consentimiento, cookies de analítica para mejorar el servicio.{" "}
        <Link
          href="/cookies"
          style={{ color: "rgba(240,244,255,0.55)", textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          Más información
        </Link>
      </p>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={necessary}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            background: "transparent",
            border: "1px solid rgba(240,244,255,0.2)",
            color: "rgba(240,244,255,0.65)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Solo necesarias
        </button>
        <button
          onClick={accept}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            background: "#2F7A5F",
            border: "none",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Aceptar todas
        </button>
      </div>
    </div>
  );
}
