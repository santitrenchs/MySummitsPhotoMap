"use client";

import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { BITACORA_TABS, type BitacoraTab } from "./tabs";


/**
 * The Bitácora tab strip, shared by the tab page and the challenge detail.
 *
 * The detail is a separate route, so without this strip it read as "a different page"
 * and lost the sense of still being inside Bitácora. Rendering the same strip there —
 * as links rather than buttons — keeps the context visible and makes every tab a way
 * back out.
 */
export function BitacoraTabs({
  active,
  onSelect,
}: {
  active: BitacoraTab;
  /** Omit to render links (detail view); pass a handler for in-page switching. */
  onSelect?: (tab: BitacoraTab) => void;
}) {
  const t = useT();
  const labels: Record<BitacoraTab, string> = {
    peaks: t.profile_tab_peaks,
    challenges: t.challenges_tab,
    photos: t.field_photos,
    tagged: t.profile_tab_tagged,
  };

  return (
    <div style={{
      display: "flex", borderBottom: "1px solid #e5e7eb",
      position: "sticky", top: "var(--top-nav-h, 48px)", zIndex: 10, background: "white",
    }}>
      {BITACORA_TABS.map((id) => {
        const isActive = active === id;
        const style: React.CSSProperties = {
          flex: 1, padding: "12px 4px", textAlign: "center",
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 600, textDecoration: "none",
          color: isActive ? "#0369a1" : "#6b7280",
          borderBottom: isActive ? "2px solid #0369a1" : "2px solid transparent",
          transition: "color 0.15s",
        };
        return onSelect ? (
          <button key={id} onClick={() => onSelect(id)} style={style}>
            {labels[id]}
          </button>
        ) : (
          <Link key={id} href={`/bitacora?tab=${id}`} style={style}>
            {labels[id]}
          </Link>
        );
      })}
    </div>
  );
}
