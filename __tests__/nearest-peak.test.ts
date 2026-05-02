import { describe, it, expect } from "vitest";
import { nearestPeak } from "@/lib/nearest-peak";

const ANETO = { id: "aneto", latitude: 42.6314, longitude: 0.6558 };
const MALADETA = { id: "maladeta", latitude: 42.6567, longitude: 0.6444 };
const CANIGOU = { id: "canigou", latitude: 42.5196, longitude: 2.4563 };

describe("nearestPeak", () => {
  it("returns null for empty peak list", () => {
    expect(nearestPeak(42.63, 0.65, [])).toBeNull();
  });

  it("returns null when closest peak is beyond threshold", () => {
    // Canigou is ~170 km from Aneto coords — well outside default 5 km
    expect(nearestPeak(42.6314, 0.6558, [CANIGOU])).toBeNull();
  });

  it("returns the nearest peak within threshold", () => {
    const result = nearestPeak(42.632, 0.656, [ANETO, MALADETA, CANIGOU]);
    expect(result?.id).toBe("aneto");
  });

  it("returns null when no peak is within custom threshold", () => {
    // 0.001 km (1 m) threshold — test point is ~150m from Aneto
    expect(nearestPeak(42.632, 0.656, [ANETO, MALADETA], 0.001)).toBeNull();
  });

  it("respects custom threshold", () => {
    // With a 200 km threshold Canigou should be found
    const result = nearestPeak(42.6314, 0.6558, [CANIGOU], 200);
    expect(result?.id).toBe("canigou");
  });

  it("returns a single peak if it is within threshold", () => {
    const result = nearestPeak(42.6314, 0.6558, [ANETO]);
    expect(result?.id).toBe("aneto");
  });

  it("preserves all extra fields on the returned peak", () => {
    const peak = { id: "x", latitude: 42.63, longitude: 0.65, altitudeM: 3404, name: "Test" };
    const result = nearestPeak(42.63, 0.65, [peak]);
    expect(result?.altitudeM).toBe(3404);
    expect(result?.name).toBe("Test");
  });
});
