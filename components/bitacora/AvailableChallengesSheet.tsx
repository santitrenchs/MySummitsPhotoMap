"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { SearchField } from "@/components/ui/SearchField";
import type { ChallengeAvailable } from "./ChallengesTab";

const ACCENT = "#2F7A5F";

type Props = {
  isOpen: boolean;
  available: ChallengeAvailable[];
  onClose: () => void;
  onJoined: (challenge: ChallengeAvailable) => void;
};

/**
 * Discovery surface for challenges the user has not joined.
 *
 * Cards with cover art live here and nowhere else: this is the moment where a challenge
 * has to look appealing. Once joined it becomes a flat row in the list, like the
 * friends/cordadas screen.
 */
export function AvailableChallengesSheet({ isOpen, available, onClose, onJoined }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((c) => c.name.toLowerCase().includes(q));
  }, [available, query]);

  async function join(challenge: ChallengeAvailable) {
    setJoiningId(challenge.id);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/join`, { method: "POST" });
      if (!res.ok) return;
      onJoined(challenge);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)",
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301,
          background: "white", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          maxHeight: "82svh", display: "flex", flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: isOpen ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.34s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.14)",
        }}
      >
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 12px", flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 17, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.3px",
          }}>
            {t.challenges_availableTitle}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, lineHeight: 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search — client-side over the sheet's own list. The catalogue is curated and
            small, so there is nothing to gain from a server round-trip here. */}
        {available.length > 0 && (
          <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t.challenges_availableSearch}
              variant="filled"
              clearLabel={t.cancel}
            />
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          {available.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, color: "#94A3B8", padding: "22px 0" }}>
              {t.challenges_allJoined}
            </p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, color: "#94A3B8", padding: "22px 0" }}>
              {t.challenges_noAvailable}
            </p>
          ) : (
            filtered.map((c) => (
              <AvailableCard
                key={c.id}
                challenge={c}
                joining={joiningId === c.id}
                onJoin={() => join(c)}
                joinLabel={t.challenges_join}
                joiningLabel={t.challenges_joining}
                peaksLabel={i(t.challenges_peaksCount, { n: c.totalPeaks })}
                joinedLabel={t.challenges_joinedBadge}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function AvailableCard({
  challenge, joining, onJoin, joinLabel, joiningLabel, peaksLabel, joinedLabel,
}: {
  challenge: ChallengeAvailable;
  joining: boolean;
  onJoin: () => void;
  joinLabel: string;
  joiningLabel: string;
  peaksLabel: string;
  joinedLabel: string;
}) {
  // A joined challenge stays listed but reads as already taken: dimmed, with a tick
  // where the join button was. Hiding it would make what you just joined disappear.
  const joined = challenge.isJoined;
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: joined ? "#F8FAFC" : "white", borderRadius: "var(--radius-lg)",
      border: "1px solid rgba(13,37,56,0.06)",
      boxShadow: joined ? "none" : "0 1px 3px rgba(13,37,56,0.06), 0 4px 12px rgba(13,37,56,0.05)",
      overflow: "hidden", opacity: joined ? 0.72 : 1,
      // Sin esto la columna flex de la hoja encoge las tarjetas en vez de scrollear:
      // con muchos retos se aplastaban unas sobre otras y el texto salía cortado.
      flexShrink: 0,
    }}>
      {/* Disco centrado, no una banda a sangre: las portadas de reto son logos
          redondos sobre lienzo cuadrado, y un `cover` sobre una columna alta y
          estrecha les rebanaba los costados. Misma forma que el icono de la fila
          de "Mis retos", así que un reto se reconoce igual en las dos pantallas. */}
      <div style={{
        width: 70, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: challenge.coverUrl ? undefined : "linear-gradient(160deg,#8fd6b4,#2F7A5F)",
        }}>
          {challenge.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={challenge.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="rgba(255,255,255,0.6)">
              <path d="M2 19 L9 7 L13 13 L16 8 L22 19 Z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dos filas, no tres: el CTA vive a la derecha en vez de en una fila propia.
          Así caben más retos en pantalla y la descripción tiene su sitio fijo. */}
      <div style={{ flex: 1, minWidth: 0, padding: "12px 4px 12px 0", display: "flex", flexDirection: "column", gap: 3 }}>
        {/* El nombre manda en su propia fila y a todo el ancho. La píldora de cimas
            vivía aquí y le robaba ~70px: en móvil casi todos los retos quedaban
            cortados a la tercera palabra ("Los 400…"). El recuento baja a la línea
            de datos, donde acompaña a la descripción sin competir por el ancho. */}
        <div style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: 14.5, fontWeight: 700, color: "#0D2538", letterSpacing: "-0.01em", lineHeight: 1.25,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {challenge.name}
        </div>

        {/* Recuento + descripción en un mismo bloque recortado a 2 líneas: sin el
            recorte la descripción o estiraba la tarjeta o se perdía entera. */}
        <div style={{
          fontSize: 12, color: "#5A6E84", lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          <span style={{
            fontFamily: "var(--font-mono-landing, monospace)",
            fontSize: 10.5, fontWeight: 700, color: "#0D2538",
          }}>
            {peaksLabel}
          </span>
          {challenge.description ? ` · ${challenge.description}` : ""}
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: "0 12px 0 10px", display: "flex", alignItems: "center" }}>
        {joined ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#5A6E84" }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%", background: ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {joinedLabel}
          </span>
        ) : (
          <button
            onClick={onJoin}
            disabled={joining}
            style={{
              fontSize: 13.5, fontWeight: 600, color: "white",
              background: ACCENT, border: "none", borderRadius: 10,
              padding: "9px 16px", cursor: joining ? "default" : "pointer",
              opacity: joining ? 0.7 : 1, whiteSpace: "nowrap",
            }}
          >
            {joining ? joiningLabel : joinLabel}
          </button>
        )}
      </div>
    </div>
  );
}
