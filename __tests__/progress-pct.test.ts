import { describe, it, expect } from "vitest";
import { progressPct } from "@/lib/progress-pct";

describe("progressPct", () => {
  it("rounds to an integer", () => {
    expect(progressPct(2, 8)).toBe(25);
    expect(progressPct(1, 8)).toBe(13);
  });

  it("keeps 0% and 100% for the real ends", () => {
    expect(progressPct(0, 8)).toBe(0);
    expect(progressPct(8, 8)).toBe(100);
    expect(progressPct(0, 0)).toBe(0);
  });

  it("never says 100% with a peak still pending, nor 0% with one already done", () => {
    expect(progressPct(521, 522)).toBe(99);
    expect(progressPct(1, 522)).toBe(1);
  });
});
