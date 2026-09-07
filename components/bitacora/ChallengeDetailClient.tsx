"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { RARITIES } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { RarityFlower } from "@/components/brand/RarityFlowers";
import { imgUrl } from "@/lib/storage/image-url";
import type { ChallengeDetail, ChallengePeakRow } from "@/lib/services/challenge.service";

const ACCENT = "#2F7A5F";
type StatusFilter = "all" | "done" | "pending";

function rarityEntry(id: RarityId) {
  return RARITIES.find((r) => r.id === id) ?? RARITIES[0];
}

export function ChallengeDetailClient({ challenge }: { challenge: ChallengeDetail }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  // Draft lives in the sheet so the list only changes when "show N" is confirmed,
  // matching the peaks/cards filter panels.
  const [draftStatus, setDraftStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return challenge.peaks.filter((p) => {
      if (status === "done" && !p.done) return false;
      if (status === "pending" && p.done) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [challenge.peaks, status, query]);

  const draftCount = useMemo(() => {
    if (draftStatus === "all") return challenge.peaks.length;
    return challenge.peaks.filter((p) => (draftStatus === "done" ? p.done : !p.done)).length;
  }, [challenge.peaks, draftStatus]);

  const pending = challenge.totalPeaks - challenge.completedPeaks;
  const pct = challenge.totalPeaks > 0
    ? Math.round((challenge.completedPeaks / challenge.totalPeaks) * 100)
    : 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", background: "#F4F7FA", minHeight: "100%" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "white", borderBottom: "1px solid #E5E7EB", padding: "10px 14px",
        position: "sticky", top: "var(--top-nav-h, 52px)", zIndex: 20,
      }}>
        <Link
          href="/bitacora"
          aria-label={t.close}
          style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "#F1F5F9",
            display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#0D2538" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: 15, fontWeight: 700, color: "#0D2538",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {challenge.name}
        </span>
      </div>

      {/* Stats — same shape as the Cimas tab catalogue header, measuring done/pending */}
      <div style={{ padding: "16px 16px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={eyebrow}>{t.challenges_detailEyebrow}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: 28, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.025em", lineHeight: 1,
              }}>
                {challenge.completedPeaks}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#5A6E84" }}>
                / {challenge.totalPeaks} · {i(t.challenges_detailPending, { n: pending })}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={eyebrow}>{t.challenges_detailHighest}</div>
            <span style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: 19, fontWeight: 800, color: "#0D2538",
            }}>
              {challenge.maxAltitudeM} m
            </span>
          </div>
        </div>

        <div style={{ position: "relative", height: 8, borderRadius: 999, background: "#DCE3EA", marginTop: 14 }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 999,
            background: `linear-gradient(90deg, ${ACCENT}, #4BAE84)`,
          }} />
          <div style={{
            position: "absolute", top: "50%", left: `${pct}%`, width: 14, height: 14,
            borderRadius: "50%", background: "white", border: `3px solid ${ACCENT}`,
            transform: "translate(-50%, -50%)",
          }} />
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 16px 12px" }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 14px",
          borderRadius: "var(--radius-full)", background: "white", border: "1px solid #E5E7EB",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "#9CA3AF" }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.challenges_searchPeak}
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 16, color: "#0D2538", minWidth: 0 }}
          />
        </div>
        <button
          onClick={() => { setDraftStatus(status); setFiltersOpen(true); }}
          style={{
            flexShrink: 0, height: 44, display: "flex", alignItems: "center", gap: 7, padding: "0 16px",
            borderRadius: "var(--radius-lg)", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
            border: `1px solid ${status !== "all" ? "#bfdbfe" : "#E5E7EB"}`,
            background: status !== "all" ? "#eff6ff" : "white",
            color: status !== "all" ? "#0369a1" : "#0D2538",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M4 5h16M7 12h10M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t.challenges_filters}
        </button>
      </div>

      {/* Peak list — always the full challenge, filters only hide rows */}
      <div style={{ padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{
            background: "white", borderRadius: "var(--radius-lg)", border: "1px solid #E5E7EB",
            padding: "30px 20px", textAlign: "center", fontSize: 13.5, color: "#5A6E84",
          }}>
            {t.challenges_noPeakMatch}
          </div>
        ) : (
          filtered.map((peak) => <PeakRow key={peak.id} peak={peak} />)
        )}
      </div>

      <FiltersSheet
        isOpen={filtersOpen}
        draft={draftStatus}
        setDraft={setDraftStatus}
        count={draftCount}
        counts={{
          all: challenge.peaks.length,
          done: challenge.completedPeaks,
          pending: pending,
        }}
        onApply={() => { setStatus(draftStatus); setFiltersOpen(false); }}
        onClose={() => setFiltersOpen(false)}
      />
    </div>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
  color: "#94A3B8", textTransform: "uppercase", marginBottom: 4,
};

// ── Peak row — same anatomy as PeakRowCard in the Cimas tab ───────────────────

function PeakRow({ peak }: { peak: ChallengePeakRow }) {
  const t = useT();
  const r = rarityEntry(peak.rarityId);

  const body = (
    <>
      {/* Rarity strip */}
      <div style={{ width: 4, background: r.color, flexShrink: 0 }} />

      {/* Photo, or the app's existing missing-photo fallback for peaks not climbed yet */}
      <div style={{ width: 100, flexShrink: 0, position: "relative", overflow: "hidden", background: "#0D2538" }}>
        {peak.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl(peak.photoUrl, 400)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, opacity: 0.4,
          }}>
            🏔
          </div>
        )}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(13,37,56,0.62) 0%, transparent 60%)",
          padding: "14px 8px 6px",
        }}>
          <span style={{
            fontFamily: "var(--font-mono-landing, monospace)",
            fontSize: 11, fontWeight: 700, color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}>
            {peak.altitudeM} m
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 14, fontWeight: 700, color: "#0D2538", letterSpacing: "-0.015em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {peak.name}
          </span>
          {peak.done && (
            <span style={{
              flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
          padding: "2px 7px", borderRadius: "var(--radius-full)", background: r.color + "22",
        }}>
          <RarityFlower id={r.id as RarityId} size={11} />
          <span style={{ fontSize: 10, fontWeight: 700, color: r.colorDark }}>{r.label}</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
          {peak.done ? (
            <div>
              <div style={{
                fontFamily: "var(--font-mono-landing, monospace)", fontSize: 8, fontWeight: 700,
                color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em",
              }}>
                {t.challenges_lastLabel}
              </div>
              <div style={{ fontFamily: "var(--font-mono-landing, monospace)", fontSize: 11, fontWeight: 700, color: "#0D2538" }}>
                {peak.lastAscentDate
                  ? new Date(peak.lastAscentDate).toLocaleDateString(t.dateLocale, { day: "numeric", month: "short", year: "2-digit" })
                  : ""}
              </div>
            </div>
          ) : (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#B5C0CB", fontStyle: "italic" }}>
              {t.challenges_noAscent}
            </span>
          )}
          <span style={{
            fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden",
            textOverflow: "ellipsis", maxWidth: 110,
          }}>
            {peak.mountainRange ?? peak.country ?? ""}
          </span>
        </div>
      </div>
    </>
  );

  const shell: React.CSSProperties = {
    display: "flex", background: "white", borderRadius: "var(--radius-lg)",
    border: "1px solid rgba(13,37,56,0.06)",
    boxShadow: "0 1px 3px rgba(13,37,56,0.06), 0 4px 12px rgba(13,37,56,0.05)",
    overflow: "hidden", textDecoration: "none",
  };

  // A climbed peak links to its cards; a pending one opens the create-ascent modal
  // with the peak preselected, the same event the map panel dispatches.
  if (peak.done) {
    return <Link href={`/ascents?peak=${peak.id}&view=mine`} style={shell}>{body}</Link>;
  }
  return (
    <button
      type="button"
      aria-label={`${t.challenges_logAscent}: ${peak.name}`}
      onClick={() => document.dispatchEvent(
        new CustomEvent("open-ascent-modal", { detail: { peakId: peak.id, peakName: peak.name } }),
      )}
      style={{ ...shell, padding: 0, cursor: "pointer", textAlign: "left", font: "inherit" }}
    >
      {body}
    </button>
  );
}

// ── Filters sheet ─────────────────────────────────────────────────────────────

function FiltersSheet({
  isOpen, draft, setDraft, count, counts, onApply, onClose,
}: {
  isOpen: boolean;
  draft: StatusFilter;
  setDraft: (v: StatusFilter) => void;
  count: number;
  counts: Record<StatusFilter, number>;
  onApply: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const options: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t.challenges_filterAll },
    { id: "done", label: t.challenges_filterDone },
    { id: "pending", label: t.challenges_filterPending },
  ];

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)",
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none", transition: "opacity 0.3s",
        }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 301, background: "white",
        borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        paddingBottom: "env(safe-area-inset-bottom)",
        transform: isOpen ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.34s cubic-bezier(0.32,0.72,0,1)",
        boxShadow: "0 -4px 40px rgba(0,0,0,0.14)",
      }}>
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0" }} />
        <div style={{ padding: "14px 20px 4px" }}>
          <span style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 17, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.3px",
          }}>
            {t.challenges_filters}
          </span>
        </div>
        <p style={{ ...eyebrow, padding: "14px 20px 8px", margin: 0 }}>{t.challenges_filterStatus}</p>
        <div style={{ display: "flex", gap: 8, padding: "0 20px", flexWrap: "wrap" }}>
          {options.map((o) => {
            const active = draft === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setDraft(o.id)}
                style={{
                  border: `1.5px solid ${active ? "#bfdbfe" : "#E5E7EB"}`,
                  background: active ? "#eff6ff" : "#f9fafb",
                  color: active ? "#0369a1" : "#5A6E84",
                  fontSize: 13, fontWeight: 600, padding: "8px 14px",
                  borderRadius: "var(--radius-full)", cursor: "pointer",
                }}
              >
                {o.label} · {counts[o.id]}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "18px 20px 20px" }}>
          <button
            onClick={onApply}
            style={{
              width: "100%", height: 46, borderRadius: "var(--radius-lg)", border: "none",
              background: ACCENT, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            {i(t.challenges_filterShow, { n: count })}
          </button>
        </div>
      </div>
    </>
  );
}
