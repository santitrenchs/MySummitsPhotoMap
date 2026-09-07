"use client";

import { useState } from "react";
import { PeaksTabV2 } from "@/components/profile/PeaksTabV2";
import { PhotosTabV2 } from "@/components/profile/PhotosTabV2";
import { ChallengesTab } from "./ChallengesTab";
import { BitacoraTabs } from "./BitacoraTabs";
import type { BitacoraTab } from "./tabs";
import type { RarityId } from "@/lib/rarity";
import type { PeakForFilter } from "@/components/profile/usePeakFilters";

type Photo = {
  id: string;
  url: string;
  ascentId: string;
  peakName: string;
  altitudeM: number;
  rarityId: RarityId;
  date: Date;
  creatorName?: string;
};

type Props = {
  peaks: PeakForFilter[];
  photos: Photo[];
  taggedPhotos: Photo[];
  /** From `?tab=` so returning from a challenge detail lands back on Retos. */
  initialTab?: BitacoraTab;
};

export function BitacoraClient({ peaks, photos, taggedPhotos, initialTab = "peaks" }: Props) {
  const [tab, setTab] = useState<BitacoraTab>(initialTab);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 32 }}>
      <BitacoraTabs active={tab} onSelect={setTab} />

      <div style={{ padding: "0 16px" }}>
        {tab === "peaks" && (
          <PeaksTabV2 peaks={peaks} />
        )}
        {tab === "challenges" && (
          <ChallengesTab />
        )}
        {tab === "photos" && (
          <PhotosTabV2 photos={photos} />
        )}
        {tab === "tagged" && (
          <PhotosTabV2 photos={taggedPhotos} isTagged />
        )}
      </div>
    </div>
  );
}
