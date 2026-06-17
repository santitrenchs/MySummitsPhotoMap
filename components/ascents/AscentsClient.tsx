"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { AscentCard } from "@/components/cards/AscentCard";
// Capture-reveal plays in place of the just-created card. Imported normally (its
// only client-only piece — the Lottie flower — is dynamically loaded inside it),
// so the feed card stays SSR-stable and doesn't flicker/disappear.
import { CaptureReveal } from "@/components/cards/CaptureReveal";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ScrollToTopButton } from "@/components/ui/ScrollToTopButton";
import { RARITIES, type RarityId } from "@/lib/rarity";

export type AscentData = {
  id: string;
  date: string;
  route: string | null;
  description: string | null;
  wikiloc?: string | null;
  createdByUserId: string;
  peak: { id: string; name: string; altitudeM: number; isMythic: boolean; mountainRange: string | null; latitude: number; longitude: number };
  firstPhotoId: string | null;
  firstPhotoUrl: string | null;
  firstPhotoOriginalKey?: string | null;
  firstPhotoCropAspect?: string | null;
  persons: { id: string; name: string; email?: string | null }[];
  isOwn: boolean;
  isUnseen?: boolean;
  userName: string;
  userAvatarUrl: string | null;
  peakStats?: { totalAscents: number; uniqueClimbers: number };
};

type Rarity = RarityId;
type ViewChip = "mine" | "friends" | "person" | "with-me";
type TimeRange = "all" | "month" | "year";
type Sort = "date-desc" | "elev-desc";

function getRarity(altitudeM: number): Rarity {
  for (let i = RARITIES.length - 1; i >= 0; i--) {
    if (altitudeM >= RARITIES[i].minAlt) return RARITIES[i].id;
  }
  return "daisy";
}

// Derive chip display colors from lib/rarity.ts source of truth
const RARITY_COLORS: Record<Rarity, { bg: string; border: string; text: string; dot: string }> =
  Object.fromEntries(
    RARITIES.map((r) => [r.id, { dot: r.color, text: r.colorDark, bg: r.color + "14", border: r.color + "4D" }])
  ) as Record<Rarity, { bg: string; border: string; text: string; dot: string }>;

const RARITY_LABELS: Record<Rarity, string> =
  Object.fromEntries(RARITIES.map((r) => [r.id, r.label])) as Record<Rarity, string>;

// ─── Main component ──────────────────────────────────────────────────────────

export function AscentsClient({
  ascents,
  allPersons,
  allYears,
  currentUserId,
  hasFriends = true,
  hasMore: initialHasMore = false,
  initialBeforeOwn = null,
  initialBeforeFriends = null,
  friendUserIds = [],
  revealId,
}: {
  ascents: AscentData[];
  allPersons: { id: string; name: string }[];
  allYears: number[];
  currentUserId?: string;
  hasFriends?: boolean;
  hasMore?: boolean;
  initialBeforeOwn?: string | null;
  initialBeforeFriends?: string | null;
  friendUserIds?: string[];
  revealId?: string;
}) {
  const t = useT();
  const searchParams = useSearchParams();

  const [localAscents, setLocalAscents] = useState<AscentData[]>(ascents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  // Per-stream cursors — each stream advances independently to prevent one stream's older items
  // from causing the other stream's items to be skipped (see ascent-feed.ts comments).
  const [beforeOwn, setBeforeOwn] = useState<string | null>(initialBeforeOwn);
  const [beforeFriends, setBeforeFriends] = useState<string | null>(initialBeforeFriends);
  // Full-reload (view/filter change) in flight — drives a loading state instead of
  // showing the stale "0 results" + empty state of the previous view's data.
  const [isRefetching, setIsRefetching] = useState(false);
  // Per-(filter signature) cache so switching back to an already-loaded view/filter
  // is instant (no network). Seeded with the SSR page and warmed in the background.
  type FeedCacheEntry = { ascents: AscentData[]; beforeOwn: string | null; beforeFriends: string | null; hasMore: boolean };
  const feedCacheRef = useRef<Map<string, FeedCacheEntry>>(new Map());

  useEffect(() => {
    const handler = (e: Event) => {
      const { id, date, route, description, persons, photoUrl, photoId, photoOriginalKey, photoCropAspect, peakId, peakName, peakAltitudeM } =
        (e as CustomEvent).detail;
      setLocalAscents((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          return {
            ...a,
            date,
            route,
            description,
            persons,
            firstPhotoUrl: photoUrl ?? a.firstPhotoUrl,
            firstPhotoId: photoId !== undefined ? photoId : a.firstPhotoId,
            firstPhotoOriginalKey: photoOriginalKey !== undefined ? photoOriginalKey : a.firstPhotoOriginalKey,
            firstPhotoCropAspect: photoCropAspect !== undefined ? photoCropAspect : a.firstPhotoCropAspect,
            peak: peakId && peakId !== a.peak.id
              ? { ...a.peak, id: peakId, name: peakName, altitudeM: peakAltitudeM ?? a.peak.altitudeM }
              : a.peak,
          };
        })
      );
    };
    document.addEventListener("ascent-updated", handler);
    return () => document.removeEventListener("ascent-updated", handler);
  }, []);

  const [search, setSearch] = useState("");
  const [viewChip, setViewChip] = useState<ViewChip>(() => {
    if (searchParams.get("highlight")) return "mine";
    const v = searchParams.get("view");
    if (v === "mine" || v === "friends" || v === "with-me") return v;
    return "friends";
  });
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [mythicFilter, setMythicFilter] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [monthFilter, setMonthFilter] = useState<string | null>(() => searchParams.get("month"));
  const [sort, setSort] = useState<Sort>("date-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  // Virtuoso handle for imperative scroll (highlight from URL)
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // "Mark as seen" tracking refs — driven by Virtuoso's rangeChanged
  const cardTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingSeenRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Peak filter seeded from ?peak= URL param
  const [peakFilter, setPeakFilter] = useState<string>(() => searchParams.get("peak") ?? "");
  const peakFilterName = peakFilter
    ? (localAscents.find((a) => a.peak.id === peakFilter)?.peak.name ?? "")
    : "";

  const selectedPerson = allPersons.find((p) => p.id === selectedPersonId);

  // Highlight + scroll to newly created ascent from ?highlight= URL param
  const [highlightId, setHighlightId] = useState<string | null>(() => searchParams.get("highlight"));

  // Capture-reveal: when arriving with ?reveal=1 (right after creating), the
  // highlighted card plays the cinematic reveal in place, then settles to normal.
  // NOTE: this is intentionally separate from `highlightId` — the ring auto-clears
  // after 2.5s, which would otherwise cut the (longer) reveal short. It is cleared
  // only by the reveal's own onFinished.
  // Initialize from the SERVER-provided prop (read server-side from ?reveal=1), NOT
  // from useSearchParams: this component is inside <Suspense>, where useSearchParams
  // is unreliable on the first client render → revealCardId came back null, the
  // reveal was silently skipped, and initialTopMostItemIndex then scrolled to the
  // highlight index (the "jumps to another card, no reveal" bug). The prop is
  // deterministic (SSR === client) so the first paint already renders CaptureReveal
  // in place — no swap, no Virtuoso re-measure/collapse.
  const [revealCardId, setRevealCardId] = useState<string | null>(revealId ?? null);
  // The card whose reveal just finished — its plain AscentCard skips the entrance
  // animation so the CaptureReveal → AscentCard swap doesn't replay cardFadeUp.
  const [settledRevealId, setSettledRevealId] = useState<string | null>(null);

  // TEMP TRACE — diagnose Chrome-only reveal failure. The `build` marker confirms
  // whether the browser is running the new bundle (vs a stale cached one).
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[reveal-debug]", {
      build: "TRACE-1",
      href: window.location.href,
      revealIdProp: revealId ?? null,
      revealCardId,
      ascentsLen: ascents.length,
      revealInAscents: ascents.some((a) => a.id === revealId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // Strip ?reveal=1 so a refresh doesn't replay the animation. State is already
    // set from the prop — this only cleans the URL.
    const p = new URLSearchParams(window.location.search);
    if (p.get("reveal") === "1") {
      const u = new URL(window.location.href);
      u.searchParams.delete("reveal");
      window.history.replaceState(null, "", u.toString());
    }
  }, []);
  // Captured once at first render: when the page opens straight into a reveal we
  // must NOT also drive Virtuoso's initialTopMostItemIndex — the new card is at the
  // top of "mine", and positioning it triggers the collapse race. Frozen via useRef
  // so it doesn't flip to true after onFinished clears revealCardId.
  const skipInitialScroll = useRef(revealCardId !== null).current;

  // Lock body scroll when sheet open
  useEffect(() => {
    if (filtersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [filtersOpen]);

  const filtered = useMemo(() => {
    let r = localAscents;

    if (peakFilter) r = r.filter((a) => a.peak.id === peakFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((a) =>
        a.peak.name.toLowerCase().includes(q) ||
        (a.route ?? "").toLowerCase().includes(q) ||
        a.persons.some((p) => p.name.toLowerCase().includes(q))
      );
    }

    if (viewChip === "mine") r = r.filter((a) => a.isOwn);
    else if (viewChip === "friends") r = r.filter((a) => !a.isOwn);
    else if (viewChip === "with-me" && currentUserId) r = r.filter((a) => !a.isOwn && a.persons.some((p) => p.id === currentUserId));
    else if (viewChip === "person" && selectedPersonId) r = r.filter((a) => a.createdByUserId === selectedPersonId || a.persons.some((p) => p.id === selectedPersonId));

    if (mythicFilter) r = r.filter((a) => a.peak.isMythic);
    else if (rarity) r = r.filter((a) => getRarity(a.peak.altitudeM) === rarity);

    if (monthFilter) {
      r = r.filter((a) => a.date.startsWith(monthFilter));
    } else if (timeRange === "month") {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      r = r.filter((a) => new Date(a.date).getTime() >= cutoff);
    } else if (timeRange === "year") {
      const yr = new Date().getFullYear();
      r = r.filter((a) => new Date(a.date).getFullYear() === yr);
    }

    return [...r].sort((a, b) => {
      if (sort === "elev-desc") return b.peak.altitudeM - a.peak.altitudeM;
      // Default: unseen friends first (by altitude desc), then rest by date desc
      const aUnseen = a.isUnseen ?? false;
      const bUnseen = b.isUnseen ?? false;
      if (aUnseen !== bUnseen) return bUnseen ? 1 : -1;
      if (aUnseen && bUnseen) return b.peak.altitudeM - a.peak.altitudeM;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [localAscents, peakFilter, search, viewChip, selectedPersonId, rarity, mythicFilter, timeRange, monthFilter, sort, currentUserId]);

  // Position the list at the highlighted card on the FIRST paint. A post-mount
  // virtuosoRef.scrollToIndex races with Virtuoso's measurement under
  // useWindowScroll and silently lands at the top ("the first of mine").
  // initialTopMostItemIndex is applied by Virtuoso before paint, from the
  // SSR-provided list (which already includes the injected highlight ascent).
  const initialHighlightIndex = useMemo(() => {
    if (!highlightId) return undefined;
    const idx = filtered.findIndex((a) => a.id === highlightId);
    return idx >= 0 ? { index: idx, align: "center" as const } : undefined;
    // Compute ONCE at mount — deliberately empty deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup mark-as-seen timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of cardTimersRef.current.values()) clearTimeout(timer);
      cardTimersRef.current.clear();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  // Build URL params from current filter state. Sent to server on every fetch (initial + loadMore +
  // filter-triggered refetch). Server applies these as WHERE clauses so pagination only returns
  // items that match — no more endless auto-retry just to find one matching ascent.
  const buildFilterParams = useCallback((viewOverride?: ViewChip) => {
    const v = viewOverride ?? viewChip;
    const p = new URLSearchParams();
    if (v !== "friends") p.set("view", v);
    if (v === "person" && selectedPersonId) p.set("personId", selectedPersonId);
    if (peakFilter) p.set("peakId", peakFilter);
    if (monthFilter) p.set("month", monthFilter);
    if (rarity) p.set("rarity", rarity);
    if (mythicFilter) p.set("mythic", "1");
    if (timeRange !== "all") p.set("timeRange", timeRange);
    return p;
  }, [viewChip, selectedPersonId, peakFilter, monthFilter, rarity, mythicFilter, timeRange]);

  // Fetch sequence: prevents stale responses from contaminating localAscents when the user changes
  // a filter while a previous loadMore is in flight (and only the latest fetch clears isFetchingMore).
  const fetchSeqRef = useRef(0);

  // Load more from server when Virtuoso reaches the end — APPENDS to localAscents
  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingMore || isRefetching) return;
    const seq = ++fetchSeqRef.current;
    setIsFetchingMore(true);
    const oldIds = new Set(localAscents.map((a) => a.id));
    const params = buildFilterParams();
    if (beforeOwn) params.set("beforeOwn", beforeOwn);
    if (beforeFriends) params.set("beforeFriends", beforeFriends);
    fetch(`/api/ascents/feed?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { ascents: AscentData[]; hasMore: boolean; nextBeforeOwn: string | null; nextBeforeFriends: string | null }) => {
        if (fetchSeqRef.current !== seq) return; // stale — a newer fetch superseded us
        const newItems = data.ascents.filter((a) => !oldIds.has(a.id));
        if (newItems.length > 0) {
          setLocalAscents((prev) => [...prev, ...newItems]);
        }
        setHasMore(data.hasMore);
        setBeforeOwn(data.nextBeforeOwn);
        setBeforeFriends(data.nextBeforeFriends);
      })
      .catch(() => {})
      .finally(() => {
        if (fetchSeqRef.current === seq) setIsFetchingMore(false);
      });
  }, [hasMore, isFetchingMore, isRefetching, localAscents, beforeOwn, beforeFriends, buildFilterParams]);

  // Refetch from scratch when a server-affecting filter changes — REPLACES localAscents
  const isInitialFilterMount = useRef(true);
  useEffect(() => {
    // While the capture-reveal is playing, never refetch/replace the list — that
    // would swap the list for the loading spinner and unmount the revealing card.
    if (revealCardId) return;
    const key = buildFilterParams().toString();
    if (isInitialFilterMount.current) {
      isInitialFilterMount.current = false;
      // Seed the cache with the SSR page so returning to this view/filter is instant.
      feedCacheRef.current.set(key, { ascents: localAscents, beforeOwn, beforeFriends, hasMore });
      return;
    }
    // Cache hit → restore instantly, no network, no loading flash.
    const cached = feedCacheRef.current.get(key);
    if (cached) {
      setLocalAscents(cached.ascents);
      setHasMore(cached.hasMore);
      setBeforeOwn(cached.beforeOwn);
      setBeforeFriends(cached.beforeFriends);
      setIsRefetching(false);
      return;
    }
    const seq = ++fetchSeqRef.current;
    setIsRefetching(true);
    fetch(`/api/ascents/feed?${key}`)
      .then((r) => r.json())
      .then((data: { ascents: AscentData[]; hasMore: boolean; nextBeforeOwn: string | null; nextBeforeFriends: string | null }) => {
        if (fetchSeqRef.current !== seq) return; // stale — a newer fetch superseded us
        setLocalAscents(data.ascents);
        setHasMore(data.hasMore);
        setBeforeOwn(data.nextBeforeOwn);
        setBeforeFriends(data.nextBeforeFriends);
        feedCacheRef.current.set(key, { ascents: data.ascents, beforeOwn: data.nextBeforeOwn, beforeFriends: data.nextBeforeFriends, hasMore: data.hasMore });
      })
      .catch(() => {})
      .finally(() => {
        if (fetchSeqRef.current === seq) setIsRefetching(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewChip, selectedPersonId, peakFilter, monthFilter, rarity, mythicFilter, timeRange, revealCardId]);

  // Warm the opposite primary view (mine↔friends) in the background on mount so
  // the first toggle is instant. Only when no other server filters are active.
  useEffect(() => {
    if (selectedPersonId || peakFilter || monthFilter || rarity || mythicFilter || timeRange !== "all") return;
    const other: ViewChip = viewChip === "mine" ? "friends" : "mine";
    const key = buildFilterParams(other).toString();
    if (feedCacheRef.current.has(key)) return;
    fetch(`/api/ascents/feed?${key}`)
      .then((r) => r.json())
      .then((data: { ascents: AscentData[]; hasMore: boolean; nextBeforeOwn: string | null; nextBeforeFriends: string | null }) => {
        feedCacheRef.current.set(key, { ascents: data.ascents, beforeOwn: data.nextBeforeOwn, beforeFriends: data.nextBeforeFriends, hasMore: data.hasMore });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch more when client-side filters reduce the result set below the viewport-fill threshold.
  // Without this, with restrictive filters (e.g. by person) the rendered list can stay so short that
  // the user never scrolls — and Virtuoso's endReached fires once but never re-fires, leaving the
  // user thinking there are no more items even though the server still has data.
  const MIN_GROUPS_TO_FILL = 15;
  useEffect(() => {
    if (!hasMore || isFetchingMore || isRefetching) return;
    if (filtered.length < MIN_GROUPS_TO_FILL) {
      loadMore();
    }
  }, [filtered.length, hasMore, isFetchingMore, isRefetching, loadMore]);

  // Mark unseen friend ascents as seen after 1s in the rendered range
  const handleRangeChanged = useCallback(
    ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
      const flush = () => {
        const ids = Array.from(pendingSeenRef.current);
        if (ids.length === 0) return;
        pendingSeenRef.current.clear();
        document.dispatchEvent(new CustomEvent("unseen-feed-count-changed", { detail: { delta: -ids.length } }));
        fetch("/api/feed/seen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ascentIds: ids }),
        }).catch(() => {});
      };
      for (let i = startIndex; i <= endIndex; i++) {
        const a = filtered[i];
        if (!a || !a.isUnseen) continue;
        const key = a.id;
        if (cardTimersRef.current.has(key)) continue;
        cardTimersRef.current.set(
          key,
          setTimeout(() => {
            cardTimersRef.current.delete(key);
            pendingSeenRef.current.add(a.id);
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
            flushTimerRef.current = setTimeout(flush, 1000);
          }, 1000)
        );
      }
    },
    [filtered]
  );

  // Scroll to highlighted ascent when present in the list
  useEffect(() => {
    if (!highlightId) return;
    const idx = filtered.findIndex((a) => a.id === highlightId);
    if (idx < 0) return;
    virtuosoRef.current?.scrollToIndex({ index: idx, align: "center", behavior: "smooth" });
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightId, filtered]);

  // Scroll to top when the filter SET changes — NOT on data updates (which also re-derive `filtered`).
  // Depend on the raw filter inputs so pagination/localAscents updates don't trigger a scroll reset.
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [viewChip, selectedPersonId, rarity, mythicFilter, timeRange, monthFilter, sort, peakFilter, search]);

  const uniquePeaks = useMemo(
    () => new Set(filtered.map((a) => a.peak.id)).size,
    [filtered]
  );

  const isDirty =
    viewChip !== "friends" || rarity !== null || mythicFilter || timeRange !== "all" ||
    sort !== "date-desc" || peakFilter !== "";

  function resetFilters() {
    setViewChip("friends");
    setSelectedPersonId("");
    setPersonSearch("");
    setRarity(null);
    setMythicFilter(false);
    setTimeRange("all");
    setSort("date-desc");
  }

  // ── Active chips data ────────────────────────────────────────────────────────

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; color: { bg: string; border: string; text: string } }[] = [];
    if (viewChip === "friends")  chips.push({ key: "view", label: t.filter_friends, color: { bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" } });
    if (viewChip === "with-me")  chips.push({ key: "view", label: t.filter_withMe, color: { bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" } });
    if (viewChip === "person" && selectedPerson) chips.push({ key: "view", label: selectedPerson.name, color: { bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" } });
    if (mythicFilter) {
      chips.push({ key: "rarity", label: "⭐ Mythic", color: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" } });
    } else if (rarity) {
      const c = RARITY_COLORS[rarity];
      chips.push({ key: "rarity", label: `✿ ${RARITY_LABELS[rarity]}`, color: { bg: c.bg, border: c.border, text: c.text } });
    }
    if (monthFilter) {
      const [yr, mo] = monthFilter.split("-");
      const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${yr}-${mo}-15`));
      chips.push({ key: "month", label: `📅 ${label}`, color: { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" } });
    } else if (timeRange === "month") {
      chips.push({ key: "time", label: `📅 ${t.filter_lastMonth}`, color: { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" } });
    } else if (timeRange === "year") {
      chips.push({ key: "time", label: `📅 ${new Date().getFullYear()}`, color: { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" } });
    }
    if (sort === "elev-desc") chips.push({ key: "sort", label: `⛰ ${t.ascents_sort_highest}`, color: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" } });
    if (peakFilter && peakFilterName) chips.push({ key: "peak", label: `⛰️ ${peakFilterName}`, color: { bg: "#eff6ff", border: "#bfdbfe", text: "#0369a1" } });
    return chips;
  }, [viewChip, selectedPerson, rarity, mythicFilter, timeRange, monthFilter, sort, peakFilter, peakFilterName]);

  function clearChip(key: string) {
    if (key === "view") { setViewChip("friends"); setSelectedPersonId(""); setPersonSearch(""); }
    if (key === "rarity") { setRarity(null); setMythicFilter(false); }
    if (key === "time") setTimeRange("all");
    if (key === "month") {
      setMonthFilter(null);
      const u = new URL(window.location.href);
      u.searchParams.delete("month");
      window.history.replaceState(null, "", u.toString());
    }
    if (key === "sort") setSort("date-desc");
    if (key === "peak") {
      setPeakFilter("");
      const u = new URL(window.location.href);
      u.searchParams.delete("peak");
      window.history.replaceState(null, "", u.toString());
    }
  }

  const filteredPersons = personSearch.trim()
    ? allPersons.filter((p) => p.name.toLowerCase().includes(personSearch.toLowerCase()))
    : allPersons;

  // ── Drag-to-close ────────────────────────────────────────────────────────────

  function onTouchStart(e: React.TouchEvent) { dragStartY.current = e.touches[0].clientY; }
  function onTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0 && sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - dragStartY.current;
    if (sheetRef.current) sheetRef.current.style.transform = "";
    if (dy > 80) setFiltersOpen(false);
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const fchip = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "8px 14px", borderRadius: "var(--radius-full)",
    border: `1.5px solid ${active ? "#0369a1" : "#e5e7eb"}`,
    background: active ? "#eff6ff" : "#f9fafb",
    color: active ? "#0369a1" : "#6b7280",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent",
    ...extra,
  });

  const rarityChip = (r: Rarity, active: boolean): React.CSSProperties => {
    const c = RARITY_COLORS[r];
    return {
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "8px 14px", borderRadius: "var(--radius-full)",
      border: `1.5px solid ${active ? c.border : "#e5e7eb"}`,
      background: active ? c.bg : "#f9fafb",
      color: active ? c.text : "#6b7280",
      fontSize: 13, fontWeight: 600, cursor: "pointer",
      whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent",
    };
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
    color: "#9ca3af", textTransform: "uppercase", marginBottom: 10,
  };

  const chipRow: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };

  return (
    <>
      <style>{`
        .asc-fchip { transition: opacity 0.1s; }
        .asc-fchip:active { opacity: 0.7; transform: scale(0.97); }
        .asc-sheet { transition: transform 0.34s cubic-bezier(0.32,0.72,0,1); }
        @keyframes chipIn {
          from { opacity:0; transform:scale(0.85); }
          to   { opacity:1; transform:scale(1); }
        }
        .asc-chip-in { animation: chipIn 0.18s ease forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Search + filter button ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: activeChips.length ? 10 : 16 }}>
        {/* Search input */}
        <div style={{ flex: 1, position: "relative" }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={t.ascents_search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px 10px 32px", fontSize: 16,
              border: "1px solid #E5E7EB", borderRadius: "var(--radius-md)",
              boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
              outline: "none", background: "white", boxSizing: "border-box",
              color: "#0D2538",
            }}
          />
        </div>
        {/* Filter button */}
        <button
          className="asc-fchip"
          onClick={() => setFiltersOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 14px", borderRadius: "var(--radius-md)",
            border: `1px solid ${filtersOpen ? "#0D2538" : "#E5E7EB"}`,
            background: filtersOpen ? "#0D2538" : "white",
            boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
            cursor: "pointer", flexShrink: 0,
            position: "relative",
          }}
        >
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none"
            stroke={filtersOpen ? "white" : "#374151"}
            strokeWidth="1.8" strokeLinecap="round"
          >
            <line x1="0" y1="2" x2="14" y2="2" />
            <line x1="2" y1="6" x2="12" y2="6" />
            <line x1="4" y1="10" x2="10" y2="10" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: filtersOpen ? "white" : "#374151" }}>
            {t.profile_filter_button}
          </span>
          {isDirty && (
            <div style={{
              position: "absolute", top: -6, right: -6,
              width: 16, height: 16, borderRadius: "50%",
              background: filtersOpen ? "white" : "#FF5D2D",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: "var(--font-mono-landing, monospace)",
                fontSize: 10, fontWeight: 800,
                color: filtersOpen ? "#0D2538" : "white",
              }}>{activeChips.length}</span>
            </div>
          )}
        </button>
      </div>

      {/* ── Active filter chips ─────────────────────────────────────────── */}
      {activeChips.length > 0 && (
        <div style={{
          display: "flex", gap: 6, flexWrap: "nowrap",
          overflowX: "auto", scrollbarWidth: "none",
          marginBottom: 14, paddingBottom: 2,
        }}>
          {activeChips.map((chip) => (
            <div
              key={chip.key + chip.label}
              className="asc-chip-in"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 10px 5px 12px", borderRadius: "var(--radius-full)",
                background: chip.color.bg, border: `1px solid ${chip.color.border}`,
                color: chip.color.text, fontSize: 12, fontWeight: 600,
                whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer", lineHeight: 1,
              }}
              onClick={() => clearChip(chip.key)}
            >
              {chip.label}
              <span style={{
                width: 14, height: 14, borderRadius: "50%",
                background: chip.color.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, opacity: 0.8,
              }}>✕</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter bottom sheet ─────────────────────────────────────────── */}
      {filtersOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }}
          onClick={() => setFiltersOpen(false)}
        />
      )}
      <div
        ref={sheetRef}
        className="asc-sheet"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 201,
          background: "white", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          maxHeight: "92svh", display: "flex", flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: filtersOpen ? "translateY(0)" : "translateY(110%)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.14)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>
            {t.filter_title}
          </span>
          {isDirty ? (
            <button
              onClick={resetFilters}
              style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#0369a1", cursor: "pointer", padding: "4px 0" }}
            >
              {t.ascents_clearAll}
            </button>
          ) : (
            <button
              onClick={() => setFiltersOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, lineHeight: 1 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 24, scrollbarWidth: "none" }}>

          {/* EXPLORAR */}
          <div>
            <p style={sectionLabel}>{t.filter_sectionExplore}</p>
            <div style={chipRow}>
              {([
                { v: "mine",    label: t.filter_mine },
                { v: "friends", label: t.filter_friends },
                { v: "person",  label: t.filter_person },
                { v: "with-me", label: t.filter_withMe },
              ] as { v: ViewChip; label: string }[]).map(({ v, label }) => (
                <div
                  key={v}
                  className="asc-fchip"
                  style={fchip(viewChip === v)}
                  onClick={() => {
                    setViewChip(v);
                    if (v !== "person") { setSelectedPersonId(""); setPersonSearch(""); }
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Person search — visible when "De una persona" */}
            {viewChip === "person" && allPersons.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  type="text"
                  placeholder={t.filter_searchPerson}
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%", padding: "10px 14px", fontSize: 16,
                    border: "1.5px solid #e5e7eb", borderRadius: "var(--radius-md)",
                    outline: "none", background: "#f9fafb", boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {filteredPersons.length > 0 && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "var(--radius-md)", overflow: "hidden", background: "white" }}>
                    {filteredPersons.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        className="asc-fchip"
                        onClick={() => setSelectedPersonId(p.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", cursor: "pointer",
                          background: selectedPersonId === p.id ? "#eff6ff" : "white",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "#1d4ed8",
                        }}>
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: selectedPersonId === p.id ? 700 : 500, color: selectedPersonId === p.id ? "#0369a1" : "#111827", flex: 1 }}>
                          {p.name}
                        </span>
                        {selectedPersonId === p.id && (
                          <span style={{ fontSize: 13, color: "#0369a1", fontWeight: 700 }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RAREZA */}
          <div>
            <p style={sectionLabel}>{t.filter_sectionRarity}</p>
            <div style={chipRow}>
              <div
                className="asc-fchip"
                style={fchip(rarity === null && !mythicFilter)}
                onClick={() => { setRarity(null); setMythicFilter(false); }}
              >
                {t.filter_allRarities}
              </div>
              {RARITIES.map(({ id: r }) => (
                <div
                  key={r}
                  className="asc-fchip"
                  title={RARITY_LABELS[r]}
                  style={rarityChip(r, !mythicFilter && rarity === r)}
                  onClick={() => { setMythicFilter(false); setRarity(rarity === r ? null : r); }}
                >
                  <span style={{ color: RARITY_COLORS[r].dot, fontSize: 15, lineHeight: 1 }}>✿</span>
                </div>
              ))}
              <div
                className="asc-fchip"
                style={{
                  ...fchip(mythicFilter),
                  ...(mythicFilter ? { background: "#fffbeb", border: "1.5px solid #f59e0b", color: "#92400e" } : {}),
                }}
                onClick={() => { setMythicFilter(!mythicFilter); setRarity(null); }}
              >
                ⭐ Mythic
              </div>
            </div>
          </div>

          {/* CUÁNDO */}
          <div>
            <p style={sectionLabel}>{t.filter_sectionWhen}</p>
            <div style={chipRow}>
              {([
                { v: "month", label: t.filter_lastMonth },
                { v: "year",  label: t.filter_thisYear },
                { v: "all",   label: t.filter_allTime },
              ] as { v: TimeRange; label: string }[]).map(({ v, label }) => (
                <div
                  key={v}
                  className="asc-fchip"
                  style={fchip(timeRange === v)}
                  onClick={() => setTimeRange(v)}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ORDENAR POR */}
          <div>
            <p style={sectionLabel}>{t.filter_sectionSort}</p>
            <div style={chipRow}>
              <div className="asc-fchip" style={fchip(sort === "date-desc")} onClick={() => setSort("date-desc")}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                {t.ascents_sort_newest}
              </div>
              <div className="asc-fchip" style={fchip(sort === "elev-desc", sort === "elev-desc" ? { borderColor: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" } : {})} onClick={() => setSort("elev-desc")}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L13 12H3L8 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                </svg>
                {t.ascents_sort_highest}
              </div>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setFiltersOpen(false)}
            style={{ borderRadius: 14, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(3,105,161,0.32)", gap: 6 }}
          >
            {isRefetching ? (
              <span style={{ fontSize: 15, fontWeight: 800 }}>…</span>
            ) : (
              <>
                <span style={{ fontSize: 15, fontWeight: 800 }}>
                  {i(t.filter_results, { n: filtered.length })}
                </span>
                <span style={{ opacity: 0.45, fontSize: 14 }}>·</span>
                <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.8 }}>
                  {i(t.filter_uniquePeaks, { n: uniquePeaks })}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Feed ──────────────────────────────────────────────────────── */}
      {isRefetching ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0", marginTop: 8 }}>
          <div style={{ width: 28, height: 28, border: "3px solid #e5e7eb", borderTopColor: "#0369a1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        viewChip === "friends" && !hasFriends ? (
          <div style={{
            background: "linear-gradient(135deg,#eff6ff,#f0f9ff)",
            border: "1.5px dashed #bfdbfe", borderRadius: "var(--radius-lg)", padding: "32px 22px",
            textAlign: "center", marginTop: 16,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
              {t.home_motivationNoFriends}
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
              {t.home_motivationNoFriendsSub}
            </p>
            <Link href="/friends" style={{
              display: "inline-block", background: "#0369a1", color: "white",
              padding: "8px 18px", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              {t.home_inviteFriends}
            </Link>
          </div>
        ) : (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: 52, margin: "0 0 12px", color: RARITY_COLORS[rarity ?? "daisy"].dot, lineHeight: 1 }}>✿</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>{t.ascents_noResults}</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{t.ascents_noResultsSub}</p>
        </div>
        )
      ) : (
        <div style={{ marginTop: 8 }}>
          <Virtuoso
            ref={virtuosoRef}
            useWindowScroll
            {...(initialHighlightIndex && !skipInitialScroll ? { initialTopMostItemIndex: initialHighlightIndex } : {})}
            data={filtered}
            endReached={loadMore}
            rangeChanged={handleRangeChanged}
            increaseViewportBy={{ top: 200, bottom: 800 }}
            computeItemKey={(_index, a) => a.id}
            itemContent={(index, a) => {
              const others = a.persons.filter((p) => p.id !== a.createdByUserId);
              const cardData = {
                id: a.id,
                date: a.date,
                route: a.route,
                description: a.description,
                wikiloc: a.wikiloc,
                peak: a.peak,
                photoUrl: a.firstPhotoUrl,
                photoId: a.firstPhotoId,
                originalStorageKey: a.firstPhotoOriginalKey,
                cropAspect: a.firstPhotoCropAspect,
                persons: others,
                user: { name: a.userName, avatarUrl: a.userAvatarUrl },
                peakStats: a.peakStats,
              };
              // The just-created card plays the reveal in place; the ring appears
              // once it finishes (so it doesn't show during the build).
              const isRevealing = revealCardId === a.id;
              return (
                <div id={`ascent-${a.id}`} style={{ paddingBottom: 24 }}>
                  {/* Highlight ring wraps ONLY the card (radius matches .peak-card = 28px)
                      so it hugs the card and isn't enlarged by the bottom padding. */}
                  <div
                    style={{
                      borderRadius: 28,
                      transition: "box-shadow 0.4s ease",
                      ...(highlightId === a.id && !isRevealing ? { boxShadow: "0 0 0 3px #0ea5e9, 0 4px 24px rgba(14,165,233,0.35)" } : {}),
                    }}
                  >
                    {isRevealing ? (
                      <CaptureReveal
                        ascent={cardData}
                        locale={t.dateLocale}
                        variant={a.isOwn ? "profile" : "social"}
                        onFinished={() => {
                          // End the reveal. Do NOT show the highlight ring afterwards —
                          // the cinematic reveal already drew all attention to the card,
                          // so the extra ring (+ its box-shadow transition) just produces
                          // a jarring shift on settle. Clear highlightId so no ring flashes.
                          setRevealCardId(null);
                          setHighlightId(null);
                          setSettledRevealId(a.id);
                        }}
                      />
                    ) : (
                      <AscentCard
                        variant={a.isOwn ? "profile" : "social"}
                        locale={t.dateLocale}
                        animationIndex={index}
                        ascent={cardData}
                        disableEntrance={settledRevealId === a.id}
                      />
                    )}
                  </div>
                </div>
              );
            }}
            components={{
              Footer: () =>
                isFetchingMore ? (
                  <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 24, height: 24, border: "2.5px solid #e5e7eb", borderTopColor: "#0369a1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  </div>
                ) : null,
            }}
          />
        </div>
      )}

      <ScrollToTopButton />
    </>
  );
}
