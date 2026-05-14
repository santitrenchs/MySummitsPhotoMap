"use client";

import { useState, useMemo } from "react";
import type { RarityId } from "@/lib/rarity";

export type SortId = "altitude_desc" | "altitude_asc" | "count_desc" | "recent" | "alpha";

export type PeakForFilter = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  country: string | null;
  rarityId: RarityId;
  isMythic: boolean;
  count: number;
  firstDate: Date;
  lastDate: Date;
  firstPhotoUrl: string | null;
};

export function usePeakFilters(peaks: PeakForFilter[]) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<RarityId | null>(null);
  const [mythic, setMythic] = useState(false);
  const [range, setRange] = useState<string | null>(null);
  const [sort, setSort] = useState<SortId>("altitude_desc");

  const filtered = useMemo(() => {
    let result = peaks;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (mythic) {
      result = result.filter((p) => p.isMythic);
    }
    if (tier) {
      result = result.filter((p) => p.rarityId === tier);
    }
    if (range) {
      result = result.filter((p) => p.mountainRange === range);
    }

    return [...result].sort((a, b) => {
      switch (sort) {
        case "altitude_asc":  return a.altitudeM - b.altitudeM;
        case "count_desc":    return b.count - a.count || b.altitudeM - a.altitudeM;
        case "recent":        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
        case "alpha":         return a.name.localeCompare(b.name);
        case "altitude_desc":
        default:              return b.altitudeM - a.altitudeM;
      }
    });
  }, [peaks, query, tier, mythic, range, sort]);

  const ranges = useMemo(() => {
    const set = new Set<string>();
    for (const p of peaks) if (p.mountainRange) set.add(p.mountainRange);
    return Array.from(set).sort();
  }, [peaks]);

  const hasActiveFilters = tier !== null || mythic || range !== null || sort !== "altitude_desc";

  function clearAll() {
    setQuery("");
    setTier(null);
    setMythic(false);
    setRange(null);
    setSort("altitude_desc");
  }

  return {
    query, setQuery,
    tier, setTier,
    mythic, setMythic,
    range, setRange,
    sort, setSort,
    filtered,
    ranges,
    hasActiveFilters,
    clearAll,
  };
}
