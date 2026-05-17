"use client";

import { useState, useMemo } from "react";
import type { RarityId } from "@/lib/rarity";

export type PhotoSortId = "recent" | "altitude_desc" | "alpha";

export type PhotoForFilter = {
  id: string;
  url: string;
  ascentId: string;
  peakName: string;
  altitudeM: number;
  rarityId: RarityId;
  date: Date;
  creatorName?: string;
};

export function usePhotoFilters(photos: PhotoForFilter[]) {
  const [query, setQuery]   = useState("");
  const [tier, setTier]     = useState<RarityId | null>(null);
  const [sort, setSort]     = useState<PhotoSortId>("recent");

  const filtered = useMemo(() => {
    let result = photos;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((p) => p.peakName.toLowerCase().includes(q));
    }
    if (tier) result = result.filter((p) => p.rarityId === tier);
    return [...result].sort((a, b) => {
      if (sort === "altitude_desc") return b.altitudeM - a.altitudeM;
      if (sort === "alpha")         return a.peakName.localeCompare(b.peakName);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [photos, query, tier, sort]);

  const hasActiveFilters = tier !== null || sort !== "recent";
  const activeFilterCount = [tier !== null, sort !== "recent"].filter(Boolean).length;

  function clearAll() { setQuery(""); setTier(null); setSort("recent"); }

  return { query, setQuery, tier, setTier, sort, setSort, filtered, hasActiveFilters, activeFilterCount, clearAll };
}
