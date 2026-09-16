"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { RARITIES } from "@/lib/rarity";
import type { RarityId } from "@/lib/rarity";
import { RarityFlower } from "@/components/brand/RarityFlowers";
import { imgUrl } from "@/lib/storage/image-url";
import { SearchField } from "@/components/ui/SearchField";
import { FilterButton } from "@/components/ui/FilterButton";
import { BackBreadcrumb } from "@/components/ui/BackBreadcrumb";
import { BitacoraTabs } from "./BitacoraTabs";
import { progressPct } from "@/lib/progress-pct";
import type { ChallengeDetail, ChallengePeakRow } from "@/lib/services/challenge.service";

const ACCENT = "#2F7A5F";
type StatusFilter = "all" | "done" | "pending";
type SortId = "altitude_desc" | "altitude_asc" | "comarca" | "range";

/** Above this many peaks the notched bar stops being countable and turns to mush,
 *  so it falls back to a plain filled track. The FEEC list is 522. */
const SEGMENTED_MAX = 30;

/** A geographic sort is only worth offering when it would actually reorder anything:
 *  both fields are null on ~90% of the catalogue, so on most challenges they are dead
 *  options that look broken when tapped. */
export function hasGroupingValue(peaks: ChallengePeakRow[], get: (p: ChallengePeakRow) => string | null) {
  const values = new Set(peaks.map(get).filter((v): v is string => !!v));
  return values.size >= 2;
}

/** Group by the field, peaks without a value last, altitude desc inside each group. */
export function byGroupThenAltitude(get: (p: ChallengePeakRow) => string | null) {
  return (a: ChallengePeakRow, b: ChallengePeakRow) => {
    const ga = get(a), gb = get(b);
    if (ga !== gb) {
      if (!ga) return 1;
      if (!gb) return -1;
      return ga.localeCompare(gb);
    }
    return b.altitudeM - a.altitudeM;
  };
}

function rarityEntry(id: RarityId) {
  return RARITIES.find((r) => r.id === id) ?? RARITIES[0];
}

export function ChallengeDetailClient({ challenge }: { challenge: ChallengeDetail }) {
  const t = useT();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [joinFailed, setJoinFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortId>("altitude_desc");
  // Draft lives in the sheet so the list only changes when "show N" is confirmed,
  // matching the peaks/cards filter panels.
  const [draftStatus, setDraftStatus] = useState<StatusFilter>("all");
  const [draftSort, setDraftSort] = useState<SortId>("altitude_desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = challenge.peaks.filter((p) => {
      if (status === "done" && !p.done) return false;
      if (status === "pending" && p.done) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
    // The service already returns altitude desc; the other orders sort a copy.
    if (sort === "altitude_desc") return rows;
    if (sort === "altitude_asc") return [...rows].sort((a, b) => a.altitudeM - b.altitudeM);
    if (sort === "comarca") return [...rows].sort(byGroupThenAltitude((p) => p.comarca));
    return [...rows].sort(byGroupThenAltitude((p) => p.mountainRange));
  }, [challenge.peaks, status, query, sort]);

  const sortOptions = useMemo(() => {
    const opts: { id: SortId; key: "profile_sort_altDesc" | "profile_sort_altAsc" | "challenges_sortComarca" | "profile_filter_range" }[] = [
      { id: "altitude_desc", key: "profile_sort_altDesc" },
      { id: "altitude_asc", key: "profile_sort_altAsc" },
    ];
    if (hasGroupingValue(challenge.peaks, (p) => p.comarca)) {
      opts.push({ id: "comarca", key: "challenges_sortComarca" });
    }
    if (hasGroupingValue(challenge.peaks, (p) => p.mountainRange)) {
      opts.push({ id: "range", key: "profile_filter_range" });
    }
    return opts;
  }, [challenge.peaks]);

  const draftCount = useMemo(() => {
    if (draftStatus === "all") return challenge.peaks.length;
    return challenge.peaks.filter((p) => (draftStatus === "done" ? p.done : !p.done)).length;
  }, [challenge.peaks, draftStatus]);

  const pending = challenge.totalPeaks - challenge.completedPeaks;
  const pct = progressPct(challenge.completedPeaks, challenge.totalPeaks);

  /**
   * Joining from the detail itself. This screen used to be reachable only from "Mis
   * retos", where you are a participant by definition — the Atlas patches are the first
   * door that brings someone here who is not, and without this they landed on a reto
   * they could read but not take.
   */
  async function join() {
    setJoining(true);
    setJoinFailed(false);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/join`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      // The progress comes from the server, so the bar has to arrive with a refresh
      // rather than be faked here.
      router.refresh();
    } catch {
      setJoinFailed(true);
      setJoining(false);
    }
  }

  // The two halves are rendered as different objects, not as one list of rows:
  // a photo means "captured", a text line means "still out there". The split
  // carries the state, so the done rows no longer need to spell it out.
  const doneRows = useMemo(() => filtered.filter((p) => p.done), [filtered]);
  const pendingRows = useMemo(() => filtered.filter((p) => !p.done), [filtered]);

  return (
    <div className="reto-page" style={{ margin: "0 auto", background: "#F4F7FA", minHeight: "100%" }}>
      <style>{`
        .reto-page { max-width: 640px; }
        .reto-body { padding-inline: 16px; }
        .reto-hdr { display: flex; align-items: center; gap: 14px; padding: 12px 16px 4px; }
        .reto-patch { width: 76px; height: 76px; flex: 0 0 76px; object-fit: contain;
                      filter: drop-shadow(0 3px 6px rgba(13,37,56,0.26)); }
        .reto-hdr-main { flex: 1; min-width: 0; }
        .reto-stats { display: flex; align-items: baseline; gap: 6px; margin-top: 7px; flex-wrap: wrap; }
        .reto-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
        .reto-pend { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0;
                     background: white; border-radius: var(--radius-lg);
                     border: 1px solid rgba(13,37,56,0.06);
                     box-shadow: 0 1px 3px rgba(13,37,56,0.06); padding: 0 12px; }
        .reto-pend-row { border: none; border-bottom: 1px solid #F1F5F8; }
        .reto-pend-row:last-child { border-bottom: none; }
        .reto-pend-zone { display: none; }
        .reto-tile img { transition: transform 0.35s ease; }
        /* A long challenge is 500 rows and a wall of photos: skip the layout and
           paint work for whatever is off screen, reserving the real height so the
           scrollbar doesn't jump. */
        .reto-tile { content-visibility: auto; contain-intrinsic-size: auto 200px; }
        .reto-pend-row { content-visibility: auto; contain-intrinsic-size: auto 40px; }
        /* Three tiles across 375px leave no room for the date; it would wrap out of
           the gradient. It comes back when the tiles widen. */
        .reto-tile-date { display: none; }
        .reto-atlas-cta { flex: 0 0 auto; }
        .reto-pend-row:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: -2px; }
        @media (hover: hover) {
          /* The whole row already opens the create-ascent sheet; a tint says so
             without a button stealing width from the peak name. */
          .reto-pend-row:hover { background: #F7FAFC; }
          .reto-tile:hover img { transform: scale(1.05); }
        }
        @media (max-width: 520px) {
          .reto-atlas-cta { order: -1; flex: 1 0 100%; justify-content: center; }
        }
        /* Wider than a phone, the tiles get a fourth column and there is finally
           room for the date, the range and the row action. The column itself stays
           at Bitácora's 640px: the tab strip above is shared, and a wider page made
           it grow past the one on the tab page. */
        @media (min-width: 640px) {
          .reto-grid { grid-template-columns: repeat(4, 1fr); gap: 9px; }
          .reto-tile-date { display: inline; }
          .reto-pend-zone { display: block; }
        }
        @media (prefers-reduced-motion: reduce) {
          .reto-tile img { transition: none; }
          .reto-tile:hover img { transform: none; }
        }
      `}</style>

      {/* Same tab strip as the list, so the detail still reads as part of Bitácora
          instead of a page of its own — and every tab is a way back out. */}
      <BitacoraTabs active="challenges" />

      {/* Breadcrumb + title.
          Deliberately NOT the cordada-detail back button. A breadcrumb names the parent,
          and here the parent is on screen: the tab strip above still shows "Retos". The
          cordada detail loses all navigation, so there a back *control* earns its weight;
          with the context visible, a label is enough and the challenge name gets the room. */}
      <div className="reto-body" style={{ paddingBlock: "14px 0" }}>
        <BackBreadcrumb href="/bitacora?tab=challenges" label={t.challenges_tab} />
      </div>

      {/* Header — the challenge's own patch takes the space that was empty to the left
          of the figures, so the reto is recognisable before a word is read. It is the
          same image the "Disponibles" sheet shows, so joining and opening look alike. */}
      <div className="reto-hdr">
        {challenge.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="reto-patch" src={challenge.coverUrl} alt="" />
        )}
        <div className="reto-hdr-main">
          <div style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: 19, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.025em",
          }}>
            {challenge.name}
          </div>
          {challenge.description && (
            <div style={{
              fontSize: 11.5, color: "#7F93A6", marginTop: 3,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {challenge.description}
            </div>
          )}

          {/* Not a participant → the bar's slot carries the way in instead. A progress
              bar on a reto you have not taken is describing a race you are not in; the
              figures line below still reports the peaks of it you happen to have done,
              which is the real reason to join. */}
          {!challenge.isJoined ? (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={join}
                disabled={joining}
                style={{
                  width: "100%", minHeight: 44, padding: "12px 16px",
                  background: joining ? "#6B9E88" : ACCENT,
                  color: "white", border: "none",
                  borderRadius: "var(--radius-md)",
                  fontFamily: "inherit", fontSize: 14.5, fontWeight: 800,
                  letterSpacing: "-0.01em",
                  cursor: joining ? "default" : "pointer",
                  boxShadow: "0 2px 10px rgba(47,122,95,0.26)",
                }}
              >
                {joining ? t.challenges_joining : t.challenges_join}
              </button>
              {joinFailed && (
                <p role="status" style={{ margin: "8px 0 0", fontSize: 12.5, color: "#B4541F" }}>
                  {t.challenges_joinFailed}
                </p>
              )}
            </div>
          ) : (
          /* Notched like the Cimas catalogue bar (one cell per peak, done first) rather
             than a continuous track with a knob: the knob read as a draggable slider on
             a bar that does nothing when touched. Long challenges fall back to a plain
             fill, where the notches would be unreadable anyway. */
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            {challenge.totalPeaks > 0 && challenge.totalPeaks <= SEGMENTED_MAX ? (
              <div style={{ flex: 1, display: "flex", height: 8, gap: 2 }}>
                {Array.from({ length: challenge.totalPeaks }, (_, idx) => (
                  <div key={idx} style={{
                    flex: 1, borderRadius: "var(--radius-full)",
                    background: idx < challenge.completedPeaks ? ACCENT : "#DCE3EA",
                  }} />
                ))}
              </div>
            ) : (
              <div style={{
                flex: 1, height: 8, borderRadius: "var(--radius-full)", background: "#DCE3EA",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: `linear-gradient(90deg, ${ACCENT}, #4BAE84)`,
                }} />
              </div>
            )}
            <span style={{
              flexShrink: 0, fontFamily: "var(--font-mono-landing, monospace)",
              fontSize: 12, fontWeight: 700, color: ACCENT,
            }}>
              {pct}%
            </span>
          </div>
          )}

          {/* The figures stay on one compact line under the bar. */}
          <div className="reto-stats">
            <span style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: 19, fontWeight: 800, color: "#0D2538", letterSpacing: "-0.025em", lineHeight: 1,
            }}>
              {challenge.completedPeaks}
            </span>
            <span style={{ fontSize: 11.5, color: "#5A6E84" }}>
              / {challenge.totalPeaks} · {i(t.challenges_detailPending, { n: pending })}
            </span>
            {/* The challenge's ceiling, the one figure the progress bar can't carry. */}
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ ...eyebrow, marginBottom: 0 }}>{t.challenges_detailHighest}</span>
              <span style={{
                fontFamily: "var(--font-mono-landing, monospace)",
                fontSize: 12, fontWeight: 700, color: "#0D2538", fontVariantNumeric: "tabular-nums",
              }}>
                {challenge.maxAltitudeM} m
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Shared components — same bar as the Cimas tab, by construction, plus the
          Atlas CTA. Outlined, the same box FilterButton wears at rest: filled navy is
          what FilterButton turns when it IS filtering, so a filled navy button sitting
          next to it reads as a filter already applied. Green is out too — that is
          "create" across the whole app, and opening the Atlas creates nothing. Three
          controls of one family; filled navy keeps meaning exactly one thing.
          On narrow screens the CTA takes its own full-width line above the rest
          (`order: -1`): three controls in 375px would shrink it to a mute icon. */}
      <div className="reto-body" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", paddingBlock: "14px 12px" }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t.challenges_searchPeak}
          variant="outlined"
        />
        <FilterButton
          label={t.challenges_filters}
          active={status !== "all" || sort !== "altitude_desc"}
          onClick={() => { setDraftStatus(status); setDraftSort(sort); setFiltersOpen(true); }}
        />
        <Link
          href={`/map?challenge=${challenge.id}`}
          className="reto-atlas-cta"
          style={{
            /* Mirrors FilterButton's resting box exactly, down to the shadow. */
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 14px", borderRadius: "var(--radius-md)",
            border: "1px solid #E5E7EB", background: "white", color: "#374151",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: 13, fontWeight: 700,
            textDecoration: "none", whiteSpace: "nowrap",
            boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151"
               strokeWidth="2.1" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M9 3.5 3 6v14.5l6-2.5 6 2.5 6-2.5V3.5l-6 2.5z" />
            <path d="M9 3.5v14.5M15 6v14.5" />
          </svg>
          {t.challenges_viewOnMap}
        </Link>
      </div>

      {/* Two halves, not one list. Captured peaks are a photo wall — the photo is the
          reward and the only thing worth the vertical space. Pending peaks are text
          lines: there is no image to show, so a 100px card was 100px of navy placeholder
          repeated 123 times. */}
      {doneRows.length === 0 && pendingRows.length === 0 ? (
        <div className="reto-body" style={{ paddingBlock: "0 32px" }}>
          <div style={{
            background: "white", borderRadius: "var(--radius-lg)", border: "1px solid #E5E7EB",
            padding: "30px 20px", textAlign: "center", fontSize: 13.5, color: "#5A6E84",
          }}>
            {t.challenges_noPeakMatch}
          </div>
        </div>
      ) : (
        <div className="reto-body" style={{ paddingBlock: "0 32px" }}>
          {doneRows.length > 0 && (
            <>
              <SectionHead label={t.challenges_sectionCollection} count={doneRows.length} />
              <div className="reto-grid">
                {doneRows.map((peak) => <PeakTile key={peak.id} peak={peak} />)}
              </div>
            </>
          )}
          {pendingRows.length > 0 && (
            <>
              <SectionHead label={t.challenges_filterPending} count={pendingRows.length} />
              <div className="reto-pend">
                {pendingRows.map((peak) => <PendingRow key={peak.id} peak={peak} />)}
              </div>
            </>
          )}
        </div>
      )}

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
        draftSort={draftSort}
        setDraftSort={setDraftSort}
        sortOptions={sortOptions}
        onApply={() => { setStatus(draftStatus); setSort(draftSort); setFiltersOpen(false); }}
        onClose={() => setFiltersOpen(false)}
      />
    </div>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
  color: "#94A3B8", textTransform: "uppercase", marginBottom: 4,
};

// ── Section head ──────────────────────────────────────────────────────────────

function SectionHead({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 10px" }}>
      <span style={{ ...eyebrow, marginBottom: 0 }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono-landing, monospace)",
        fontSize: 11, fontWeight: 700, color: "#5A6E84",
      }}>
        {count}
      </span>
      <span style={{ flex: 1, height: 1, background: "rgba(13,37,56,0.07)" }} />
    </div>
  );
}

// ── Captured peak — photo tile ────────────────────────────────────────────────

function PeakTile({ peak }: { peak: ChallengePeakRow }) {
  const t = useT();
  const r = rarityEntry(peak.rarityId);

  return (
    <Link
      href={`/ascents?peak=${peak.id}&view=mine`}
      className="reto-tile"
      style={{
        position: "relative", display: "block", aspectRatio: "4 / 5", maxWidth: "100%",
        borderRadius: "var(--radius-md)", overflow: "hidden", background: "#0D2538",
        textDecoration: "none",
      }}
    >
      {peak.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl(peak.photoUrl, 400)}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 26, opacity: 0.4,
        }}>
          🏔
        </div>
      )}

      {/* Same rarity badge the photo grid in the Fotos tab uses, so a wall of
          summit photos reads the same wherever it appears. */}
      <span style={{
        position: "absolute", top: 5, left: 5, width: 20, height: 20, borderRadius: "50%",
        background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <RarityFlower id={r.id as RarityId} size={13} />
      </span>

      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 7px 6px",
        background: "linear-gradient(to top, rgba(13,37,56,0.88), transparent)",
        display: "flex", flexDirection: "column", gap: 1,
      }}>
        <span style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: 10.5, fontWeight: 700, color: "white", letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {peak.name}
        </span>
        <span style={{
          fontFamily: "var(--font-mono-landing, monospace)",
          fontSize: 9, color: "rgba(255,255,255,0.78)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {peak.altitudeM} m
          {peak.lastAscentDate && (
            <span className="reto-tile-date">
              {` · ${new Date(peak.lastAscentDate).toLocaleDateString(t.dateLocale, { day: "numeric", month: "short", year: "2-digit" })}`}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}

// ── Pending peak — text row ───────────────────────────────────────────────────

function PendingRow({ peak }: { peak: ChallengePeakRow }) {
  const t = useT();
  const r = rarityEntry(peak.rarityId);

  return (
    <button
      type="button"
      className="reto-pend-row"
      aria-label={`${t.challenges_logAscent}: ${peak.name}`}
      onClick={() => document.dispatchEvent(
        new CustomEvent("open-ascent-modal", { detail: { peakId: peak.id, peakName: peak.name } }),
      )}
      style={{
        display: "flex", alignItems: "center", gap: 9, height: 40, width: "100%",
        minWidth: 0, overflow: "hidden", padding: 0, background: "none",
        font: "inherit", textAlign: "left", cursor: "pointer",
      }}
    >
      <RarityFlower id={r.id as RarityId} size={11} />
      <span style={{
        flex: "0 1 auto", minWidth: 0,
        fontSize: 13, fontWeight: 600, color: "#0D2538",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {peak.name}
      </span>
      <span style={{ flex: 1 }} />
      <span className="reto-pend-zone" style={{
        fontSize: 10.5, color: "#9AA9B8",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110,
      }}>
        {peak.mountainRange ?? peak.comarca ?? ""}
      </span>
      <span style={{
        flexShrink: 0, minWidth: 54, textAlign: "right",
        fontFamily: "var(--font-mono-landing, monospace)",
        fontSize: 11.5, fontWeight: 700, color: "#5A6E84", fontVariantNumeric: "tabular-nums",
      }}>
        {peak.altitudeM}<span style={{ fontWeight: 500, color: "#9AA9B8" }}> m</span>
      </span>
    </button>
  );
}

// ── Filters sheet ─────────────────────────────────────────────────────────────

function FiltersSheet({
  isOpen, draft, setDraft, draftSort, setDraftSort, sortOptions, count, counts, onApply, onClose,
}: {
  isOpen: boolean;
  draft: StatusFilter;
  setDraft: (v: StatusFilter) => void;
  draftSort: SortId;
  setDraftSort: (v: SortId) => void;
  /** Geographic orders are dropped when the challenge's peaks have no such data. */
  sortOptions: { id: SortId; key: "profile_sort_altDesc" | "profile_sort_altAsc" | "challenges_sortComarca" | "profile_filter_range" }[];
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
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: "var(--radius-full)", cursor: "pointer",
                  border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`,
                  background: active ? "#eff6ff" : "#f9fafb",
                  color: active ? "#0369a1" : "#6b7280",
                  fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                {o.label} · {counts[o.id]}
              </button>
            );
          })}
        </div>
        <p style={{ ...eyebrow, padding: "18px 20px 8px", margin: 0 }}>{t.filter_sectionSort}</p>
        <div style={{ display: "flex", gap: 8, padding: "0 20px", flexWrap: "wrap" }}>
          {sortOptions.map((o) => {
            const active = draftSort === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setDraftSort(o.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: "var(--radius-full)", cursor: "pointer",
                  border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`,
                  background: active ? "#eff6ff" : "#f9fafb",
                  color: active ? "#0369a1" : "#6b7280",
                  fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                {t[o.key]}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f3f4f6", marginTop: 18 }}>
          <button
            onClick={onApply}
            style={{
              width: "100%", padding: "16px",
              background: ACCENT, color: "white", border: "none",
              borderRadius: "var(--radius-lg)", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0 4px 14px rgba(47,122,95,0.32)", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {i(t.challenges_filterShow, { n: count })}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
