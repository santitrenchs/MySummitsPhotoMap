import { describe, it, expect } from "vitest";
import { makeRetoResolver, type PeakChallengeIndex } from "@/components/map/peak-challenges";

/**
 * The marks on the Atlas: which retos a peak carries a patch for.
 *
 * The two rules under test are inherited from the service, not invented here — an
 * active reto is public, a retired one belongs to whoever joined it — so they must
 * keep matching `listChallenges` and `getChallengeMapPeaks`.
 */

const index: PeakChallengeIndex = {
  challenges: [
    { id: "act", name: "Els 3000 del Pirineu", coverUrl: "/a.png", totalPeaks: 8, isActive: true },
    { id: "ret", name: "Reto retirado", coverUrl: null, totalPeaks: 20, isActive: false },
    { id: "act2", name: "Los 3000 de Buyse", coverUrl: "/b.png", totalPeaks: 239, isActive: true },
  ],
  byPeak: {
    // In all three, in index order.
    aneto: [0, 1, 2],
    // In none.
    tossa: [],
  },
};

describe("makeRetoResolver", () => {
  it("marks nothing without an index — the Atlas simply works as before", () => {
    expect(makeRetoResolver(null, new Set(), null)("aneto")).toEqual([]);
  });

  it("marks an active reto for someone who has not joined it", () => {
    const resolve = makeRetoResolver(index, new Set(), null);
    expect(resolve("aneto").map((r) => r.id)).toEqual(["act", "act2"]);
  });

  it("hides a retired reto from a non-participant, and keeps it for a participant", () => {
    expect(makeRetoResolver(index, new Set(), null)("aneto").map((r) => r.id))
      .not.toContain("ret");
    expect(makeRetoResolver(index, new Set(["ret"]), null)("aneto").map((r) => r.id))
      .toEqual(["act", "ret", "act2"]);
  });

  it("does not mark the reto that is the current scope", () => {
    // In challenge mode every visible peak belongs to it: the patch would be noise on
    // every single one, and the navy chip already says where you are.
    const resolve = makeRetoResolver(index, new Set(), "act");
    expect(resolve("aneto").map((r) => r.id)).toEqual(["act2"]);
  });

  it("keeps the index order, which is the admin's sortOrder", () => {
    const resolve = makeRetoResolver(index, new Set(["ret"]), null);
    expect(resolve("aneto").map((r) => r.name))
      .toEqual(["Els 3000 del Pirineu", "Reto retirado", "Los 3000 de Buyse"]);
  });

  it("returns nothing for a peak in no reto, and for an unknown peak", () => {
    const resolve = makeRetoResolver(index, new Set(), null);
    expect(resolve("tossa")).toEqual([]);
    expect(resolve("does-not-exist")).toEqual([]);
  });

  it("carries the name and patch each surface needs", () => {
    const [first] = makeRetoResolver(index, new Set(["act"]), null)("aneto");
    expect(first).toEqual({
      id: "act",
      name: "Els 3000 del Pirineu",
      coverUrl: "/a.png",
      totalPeaks: 8,
      isJoined: true,
    });
  });
});
