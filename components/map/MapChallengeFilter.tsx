"use client";

import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { ChallengePatch } from "./ChallengePatch";

export type MapChallengeOption = {
  id: string;
  name: string;
  totalPeaks: number;
  completedPeaks: number;
  coverUrl?: string | null;
};

/** Enough of a reto to render its row when the user is scoped to one they never joined. */
export type MapActiveChallenge = {
  id: string;
  name: string;
  coverUrl: string | null;
  totalPeaks: number;
};

const GREEN = "#2F7A5F";
const MUTED = "#9ca3af";

/**
 * "Retos" section of the Atlas filter panels (sidebar on desktop, sheet on mobile).
 *
 * A reto is not another filter, it is the *scope*: picking one narrows the Atlas to
 * its peaks, and Estado / Rareza keep working inside it ("Sin capturar" within a reto
 * is exactly the user's to-do list). That is why it sits above them and is single-select.
 *
 * ⚠️ **This lists your own retos and nothing else, on purpose.** Browsing the whole
 * catalogue from here was built and then dropped: a filter panel exists to narrow what
 * is already on screen, while choosing among dozens of retos is a different task —
 * "where do I want to be", not "what do I hide". Putting it here forced a choice between
 * hiding the other filters behind a sheet and nesting a scroll inside a sheet that
 * already scrolls, and both were worse than not doing it at all.
 *
 * Discovering a reto you have not joined has its own path: the patches on the peak popup
 * open that reto's screen, where you can join it and where "Ver en el Atlas" brings you
 * back here already scoped. Joined retos are few by definition (a curated catalogue, not
 * a feed), so this list needs no cap, no search and no scroll of its own.
 */
export function MapChallengeFilter({
  challenges,
  activeChallenge,
  activeId,
  onSelect,
  loading = false,
}: {
  /** The user's joined retos, with progress. */
  challenges: MapChallengeOption[];
  /**
   * The active reto when it is NOT one of the above — someone who arrived from a patch
   * or a shared link. Without this row the panel would contradict the navy scope chip.
   */
  activeChallenge?: MapActiveChallenge | null;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
}) {
  const t = useT();

  const showActiveRow = !!activeChallenge
    && !!activeId
    && !challenges.some((c) => c.id === activeId);

  if (loading && challenges.length === 0 && !showActiveRow) {
    return (
      <div>
        <SectionLabel>{t.map_retos_labelMany}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[0, 1].map((k) => (
            <div key={k} style={{ height: 48, borderRadius: 8, background: "#F1F5F9" }} />
          ))}
        </div>
      </div>
    );
  }

  // Nothing joined and no scope → no dead heading on every map.
  if (challenges.length === 0 && !showActiveRow) return null;

  return (
    <div>
      <SectionLabel>{t.map_retos_labelMany}</SectionLabel>

      {/* Rows break out of the panel's 20px side padding so they read as list rows. */}
      <div style={{ margin: "0 -20px" }}>
        {showActiveRow && activeChallenge && (
          <ChallengeRow
            name={activeChallenge.name}
            coverUrl={activeChallenge.coverUrl}
            totalPeaks={activeChallenge.totalPeaks}
            completedPeaks={null}
            active
            subtitle={i(t.challenges_peaksCount, { n: activeChallenge.totalPeaks })}
            onClick={() => onSelect(null)}
          />
        )}
        {challenges.map((c) => (
          <ChallengeRow
            key={c.id}
            name={c.name}
            coverUrl={c.coverUrl ?? null}
            totalPeaks={c.totalPeaks}
            completedPeaks={c.completedPeaks}
            active={c.id === activeId}
            subtitle={i(t.challenges_peaksCount, { n: c.totalPeaks })}
            onClick={() => onSelect(c.id === activeId ? null : c.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--font-inter, sans-serif)", fontSize: 10, fontWeight: 800,
      letterSpacing: "0.1em", color: MUTED, textTransform: "uppercase", margin: "0 0 8px",
    }}>
      {children}
    </p>
  );
}

/**
 * One reto.
 *
 * **Progress is what tells the two apart**: the fraction and the green bar appear only
 * for a reto you joined — a reto you don't follow has no progress to show, so it carries
 * its peak count instead. No "Joined" badge: that would repeat in decoration what the
 * bar already says with data.
 *
 * Selected is blue, not navy: this is a selection *inside a panel*. Navy is what the
 * Filtrar button turns when it is filtering the list.
 */
function ChallengeRow({
  name, coverUrl, totalPeaks, completedPeaks, active, subtitle, onClick,
}: {
  name: string;
  coverUrl: string | null;
  totalPeaks: number;
  completedPeaks: number | null;
  active: boolean;
  subtitle: string;
  onClick: () => void;
}) {
  const joined = completedPeaks !== null;
  const pct = joined && totalPeaks > 0
    ? Math.max(1, Math.min(100, Math.round((completedPeaks / totalPeaks) * 100)))
    : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "flex", alignItems: "center", gap: 11,
        width: "100%", minHeight: 48, padding: "8px 20px",
        background: active ? "#eff6ff" : "transparent",
        border: "none",
        borderLeft: `3px solid ${active ? "#0369a1" : "transparent"}`,
        cursor: "pointer", textAlign: "left", font: "inherit",
      }}
    >
      <ChallengePatch name={name} coverUrl={coverUrl} size={32} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: "block", fontSize: 13, fontWeight: 700,
          color: active ? "#075985" : "#111827",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {name}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
          {joined ? (
            <>
              <span style={{
                fontFamily: "var(--font-mono-landing, monospace)", fontSize: 10.5,
                fontWeight: 600, color: MUTED, flexShrink: 0,
              }}>
                <b style={{ color: GREEN, fontWeight: 600 }}>{completedPeaks}</b>/{totalPeaks}
              </span>
              <span style={{
                flex: 1, maxWidth: 84, height: 3, borderRadius: 999,
                background: "#e8edf2", overflow: "hidden",
              }}>
                <span style={{ display: "block", height: "100%", width: `${pct}%`, background: GREEN, borderRadius: 999 }} />
              </span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: MUTED }}>{subtitle}</span>
          )}
        </span>
      </span>
    </button>
  );
}
