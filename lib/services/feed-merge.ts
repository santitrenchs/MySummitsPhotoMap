// ─── Pure feed logic ──────────────────────────────────────────────────────────
//
// Filter building + canonical stream merging for the ascents feed.
// No DB imports — everything here is unit-testable (see __tests__/feed-merge.test.ts).
// The Prisma-coupled orchestration lives in ascent-feed.ts.

import { RARITIES, type RarityId } from "@/lib/rarity";

export type View = "mine" | "friends" | "with-me" | "person";
export type Rarity = RarityId;
export type TimeRange = "all" | "month" | "year";

const RARITY_ID_SET: ReadonlySet<string> = new Set(RARITIES.map((r) => r.id));

/** Validates a raw `?rarity=` query param against the canonical 9-tier scheme. */
export function isFeedRarity(value: string): value is Rarity {
  return RARITY_ID_SET.has(value);
}

/**
 * Altitude range covered by a rarity tier: [minAlt, next tier's minAlt).
 * Derived from RARITIES so the feed filter can never drift from the display scheme.
 */
export function rarityAltRange(r: Rarity): { min: number; max: number | null } {
  const idx = RARITIES.findIndex((t) => t.id === r);
  return {
    min: RARITIES[idx].minAlt,
    max: idx < RARITIES.length - 1 ? RARITIES[idx + 1].minAlt : null,
  };
}

// Build the "filter" portion of a WHERE clause — applied to both own and friends queries.
// Excludes the stream selector (createdBy / tenantId) and the cursor (date.lt), which are
// stream-specific.
export function buildFilters(opts: {
  peakId?: string;
  month?: string;
  rarity?: Rarity;
  mythic?: boolean;
  timeRange?: TimeRange;
}) {
  const conditions: Record<string, unknown>[] = [];
  if (opts.peakId) conditions.push({ peakId: opts.peakId });

  // Date range — explicit month wins over timeRange shortcut
  if (opts.month) {
    const [y, m] = opts.month.split("-").map((s) => parseInt(s, 10));
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    conditions.push({ date: { gte: start, lt: end } });
  } else if (opts.timeRange === "month") {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    conditions.push({ date: { gte: cutoff } });
  } else if (opts.timeRange === "year") {
    const yr = new Date().getFullYear();
    conditions.push({ date: { gte: new Date(Date.UTC(yr, 0, 1)), lt: new Date(Date.UTC(yr + 1, 0, 1)) } });
  }

  if (opts.mythic) {
    conditions.push({ peak: { isMythic: true } });
  } else if (opts.rarity) {
    const { min, max } = rarityAltRange(opts.rarity);
    conditions.push({ peak: { altitudeM: max !== null ? { gte: min, lt: max } : { gte: min } } });
  }

  return conditions;
}

export type FeedMergeItem = { id: string; date: string; isUnseen: boolean };

/**
 * Canonical feed order (single source of truth for web + Android + iOS):
 * unseen friend ascents first (date desc), then own + seen friends (date desc).
 * With `skipUnseen` (pages after the first) everything merges flat by date desc.
 * The highlight ascent is injected only if not already present.
 */
export function mergeFeedStreams<T extends FeedMergeItem>({
  myAscents,
  friendAscents,
  highlightAscent,
  skipUnseen,
}: {
  myAscents: T[];
  friendAscents: T[];
  highlightAscent?: T | null;
  skipUnseen?: boolean;
}): T[] {
  const byDate = (a: FeedMergeItem, b: FeedMergeItem) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();

  let ascents: T[];
  if (!skipUnseen) {
    const unseenFriends = friendAscents.filter((a) => a.isUnseen).sort(byDate);
    const rest = [...myAscents, ...friendAscents.filter((a) => !a.isUnseen)].sort(byDate);
    ascents = [...unseenFriends, ...rest];
  } else {
    ascents = [...myAscents, ...friendAscents].sort(byDate);
  }

  if (highlightAscent && !ascents.find((a) => a.id === highlightAscent.id)) {
    ascents = [...ascents, highlightAscent].sort(byDate);
  }

  return ascents;
}

/**
 * Per-stream cursor for the next page. A stream is "exhausted" when it returns
 * less than a full page — then there is nothing older to fetch.
 */
export function nextStreamCursor(raw: { date: Date }[], pageSize: number): string | null {
  return raw.length === pageSize ? raw[raw.length - 1].date.toISOString() : null;
}
