import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildFilters,
  mergeFeedStreams,
  nextStreamCursor,
  type FeedMergeItem,
} from "@/lib/services/feed-merge";

function item(id: string, date: string, isUnseen = false): FeedMergeItem {
  return { id, date, isUnseen };
}

const ids = (list: FeedMergeItem[]) => list.map((a) => a.id);

describe("mergeFeedStreams() — canonical feed order", () => {
  it("first page: unseen friend ascents come first (date desc), then own + seen by date desc", () => {
    const myAscents = [
      item("own-new", "2026-06-30T10:00:00Z"),
      item("own-old", "2026-01-01T10:00:00Z"),
    ];
    const friendAscents = [
      item("friend-seen-newest", "2026-07-01T10:00:00Z", false),
      item("friend-unseen-old", "2025-05-01T10:00:00Z", true),
      item("friend-unseen-new", "2026-02-01T10:00:00Z", true),
    ];
    const result = mergeFeedStreams({ myAscents, friendAscents });
    expect(ids(result)).toEqual([
      // unseen partition, date desc — even though friend-seen-newest is more recent
      "friend-unseen-new",
      "friend-unseen-old",
      // rest, date desc
      "friend-seen-newest",
      "own-new",
      "own-old",
    ]);
  });

  it("later pages (skipUnseen): flat merge by date desc, unseen gets no priority", () => {
    const myAscents = [item("own", "2026-06-01T00:00:00Z")];
    const friendAscents = [
      item("friend-unseen", "2026-01-01T00:00:00Z", true),
      item("friend-seen", "2026-07-01T00:00:00Z", false),
    ];
    const result = mergeFeedStreams({ myAscents, friendAscents, skipUnseen: true });
    expect(ids(result)).toEqual(["friend-seen", "own", "friend-unseen"]);
  });

  it("handles empty streams", () => {
    expect(mergeFeedStreams({ myAscents: [], friendAscents: [] })).toEqual([]);
    const only = [item("a", "2026-01-01T00:00:00Z")];
    expect(ids(mergeFeedStreams({ myAscents: only, friendAscents: [] }))).toEqual(["a"]);
  });

  it("does not duplicate the highlight when it is already in a stream", () => {
    const myAscents = [item("x", "2026-06-01T00:00:00Z")];
    const result = mergeFeedStreams({
      myAscents,
      friendAscents: [],
      highlightAscent: item("x", "2026-06-01T00:00:00Z"),
    });
    expect(ids(result)).toEqual(["x"]);
  });

  it("injects a missing highlight in date order", () => {
    const myAscents = [
      item("new", "2026-06-01T00:00:00Z"),
      item("old", "2026-01-01T00:00:00Z"),
    ];
    const result = mergeFeedStreams({
      myAscents,
      friendAscents: [],
      highlightAscent: item("mid", "2026-03-01T00:00:00Z"),
      skipUnseen: true,
    });
    expect(ids(result)).toEqual(["new", "mid", "old"]);
  });

  it("null highlight leaves the merge untouched", () => {
    const myAscents = [item("a", "2026-01-01T00:00:00Z")];
    const result = mergeFeedStreams({ myAscents, friendAscents: [], highlightAscent: null });
    expect(ids(result)).toEqual(["a"]);
  });
});

describe("nextStreamCursor() — per-stream pagination", () => {
  const PAGE = 3;
  const raw = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2026, 0, 31 - i)) }));

  it("returns the last item's date when the stream returned a full page", () => {
    expect(nextStreamCursor(raw(PAGE), PAGE)).toBe("2026-01-29T00:00:00.000Z");
  });

  it("returns null when the stream is exhausted (partial page)", () => {
    expect(nextStreamCursor(raw(PAGE - 1), PAGE)).toBeNull();
  });

  it("returns null for an empty stream", () => {
    expect(nextStreamCursor([], PAGE)).toBeNull();
  });
});

describe("buildFilters() — WHERE clause fragments", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns no conditions when no filters are set", () => {
    expect(buildFilters({})).toEqual([]);
  });

  it("filters by peakId", () => {
    expect(buildFilters({ peakId: "aneto" })).toEqual([{ peakId: "aneto" }]);
  });

  it("month filter uses exact UTC month boundaries", () => {
    expect(buildFilters({ month: "2026-03" })).toEqual([
      { date: { gte: new Date(Date.UTC(2026, 2, 1)), lt: new Date(Date.UTC(2026, 3, 1)) } },
    ]);
  });

  it("December rolls over to January of the next year", () => {
    expect(buildFilters({ month: "2026-12" })).toEqual([
      { date: { gte: new Date(Date.UTC(2026, 11, 1)), lt: new Date(Date.UTC(2027, 0, 1)) } },
    ]);
  });

  it("explicit month wins over timeRange", () => {
    const conditions = buildFilters({ month: "2026-03", timeRange: "year" });
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toEqual({
      date: { gte: new Date(Date.UTC(2026, 2, 1)), lt: new Date(Date.UTC(2026, 3, 1)) },
    });
  });

  it("timeRange month = rolling 30-day window from now", () => {
    expect(buildFilters({ timeRange: "month" })).toEqual([
      { date: { gte: new Date("2026-06-07T12:00:00Z") } },
    ]);
  });

  it("timeRange year = current calendar year in UTC", () => {
    expect(buildFilters({ timeRange: "year" })).toEqual([
      { date: { gte: new Date(Date.UTC(2026, 0, 1)), lt: new Date(Date.UTC(2027, 0, 1)) } },
    ]);
  });

  it("rarity maps to the altitude range of the 9-tier scheme", () => {
    // Regression: heather/tundra/draba did not exist in the legacy 6-tier feed filter
    expect(buildFilters({ rarity: "heather" })).toEqual([
      { peak: { altitudeM: { gte: 1000, lt: 2000 } } },
    ]);
    expect(buildFilters({ rarity: "gentian" })).toEqual([
      { peak: { altitudeM: { gte: 2000, lt: 3000 } } }, // legacy scheme wrongly used 1500–3000
    ]);
  });

  it("top tier (snow_lotus) has no upper bound", () => {
    expect(buildFilters({ rarity: "snow_lotus" })).toEqual([
      { peak: { altitudeM: { gte: 8000 } } },
    ]);
  });

  it("mythic takes precedence over rarity (mutually exclusive by contract)", () => {
    expect(buildFilters({ mythic: true, rarity: "heather" })).toEqual([
      { peak: { isMythic: true } },
    ]);
  });

  it("combines peakId + month + rarity", () => {
    const conditions = buildFilters({ peakId: "p1", month: "2026-05", rarity: "daisy" });
    expect(conditions).toHaveLength(3);
    expect(conditions[0]).toEqual({ peakId: "p1" });
    expect(conditions[2]).toEqual({ peak: { altitudeM: { gte: 0, lt: 1000 } } });
  });
});
