/**
 * Which retos a peak belongs to, for the Atlas marks.
 *
 * The index is global (`GET /api/challenges/peak-index`) and the membership half is
 * per-user (`GET /api/challenges`); this is where the two meet.
 */

export type PeakChallengeIndex = {
  challenges: {
    id: string;
    name: string;
    coverUrl: string | null;
    totalPeaks: number;
    isActive: boolean;
  }[];
  byPeak: Record<string, number[]>;
};

export type PeakReto = {
  id: string;
  name: string;
  coverUrl: string | null;
  totalPeaks: number;
  isJoined: boolean;
};

/**
 * Builds the `peakId → retos` lookup used by the popup and the list rows.
 *
 * Two rules live here, both inherited from the service rather than invented:
 *
 * - **A retired reto is shown only to someone who joined it.** Same asymmetry as
 *   "Mis retos" (retiring a reto must not erase the progress of whoever followed it)
 *   and the same gate `getChallengeMapPeaks` applies to the scope.
 * - **The reto that is the current scope is not marked.** In challenge mode every
 *   visible peak belongs to it, so the mark would be noise on every single peak; the
 *   navy chip already says where you are. Other retos still mark — that is exactly
 *   when the information is worth something.
 *
 * Order is the index's own order, which is the admin's `sortOrder`: the same peak
 * shows its patches in the same order on the popup and on the row.
 */
export function makeRetoResolver(
  index: PeakChallengeIndex | null,
  joinedIds: Set<string>,
  activeChallengeId: string | null,
): (peakId: string) => PeakReto[] {
  if (!index) return () => [];

  const visible = index.challenges.map((c) => {
    const isJoined = joinedIds.has(c.id);
    return {
      reto: { id: c.id, name: c.name, coverUrl: c.coverUrl, totalPeaks: c.totalPeaks, isJoined },
      show: (c.isActive || isJoined) && c.id !== activeChallengeId,
    };
  });

  return (peakId: string) => {
    const idxs = index.byPeak[peakId];
    if (!idxs) return [];
    const out: PeakReto[] = [];
    for (const i of idxs) {
      const entry = visible[i];
      if (entry?.show) out.push(entry.reto);
    }
    return out;
  };
}
