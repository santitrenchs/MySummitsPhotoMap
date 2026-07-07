import { describe, it, expect } from "vitest";
import {
  AscentPatchSchema,
  AscentPatchSchemaV1,
  buildAscentPatchData,
} from "@/lib/services/ascent-patch";

// Parse through the real schema first — mirrors exactly what the routes do,
// including Zod dropping absent optional keys and stripping unknown ones.
function dataFor(body: unknown) {
  const parsed = AscentPatchSchema.safeParse(body);
  if (!parsed.success) throw new Error("body should be valid in this test");
  return buildAscentPatchData(parsed.data);
}

describe("buildAscentPatchData() — field isolation (the undefined-wipe regression)", () => {
  it("an empty body updates nothing", () => {
    expect(dataFor({})).toEqual({});
  });

  it("updating only route leaves every other field untouched (key absent, not null)", () => {
    const data = dataFor({ route: "Cara norte" });
    expect(data).toEqual({ route: "Cara norte" });
    // The critical assertion: absent ≠ null. A null here would wipe the DB column.
    expect("description" in data).toBe(false);
    expect("wikiloc" in data).toBe(false);
    expect("date" in data).toBe(false);
    expect("peakId" in data).toBe(false);
  });

  it("an explicit null clears the field", () => {
    expect(dataFor({ route: null })).toEqual({ route: null });
    expect(dataFor({ description: null })).toEqual({ description: null });
    expect(dataFor({ wikiloc: null })).toEqual({ wikiloc: null });
  });

  it("empty string is preserved, not coerced to null", () => {
    expect(dataFor({ description: "" })).toEqual({ description: "" });
  });

  it("date strings become Date instances; null date clears it", () => {
    const data = dataFor({ date: "2026-05-10" });
    expect(data.date).toBeInstanceOf(Date);
    expect((data.date as Date).toISOString()).toBe("2026-05-10T00:00:00.000Z");
    expect(dataFor({ date: null })).toEqual({ date: null });
  });

  it("updates several fields at once without touching the rest", () => {
    const data = dataFor({ route: "Normal", description: null });
    expect(Object.keys(data).sort()).toEqual(["description", "route"]);
  });
});

describe("AscentPatchSchema — validation", () => {
  it("rejects a non-UUID peakId", () => {
    expect(AscentPatchSchema.safeParse({ peakId: "not-a-uuid" }).success).toBe(false);
  });

  it("accepts a valid UUID peakId", () => {
    expect(
      AscentPatchSchema.safeParse({ peakId: "d9b2d63d-a233-4123-847a-717d0d6ababc" }).success,
    ).toBe(true);
  });

  it("rejects malformed dates (must be YYYY-MM-DD)", () => {
    expect(AscentPatchSchema.safeParse({ date: "10/05/2026" }).success).toBe(false);
    expect(AscentPatchSchema.safeParse({ date: "2026-5-1" }).success).toBe(false);
  });

  it("enforces max lengths (route 500, description 2000, wikiloc 500)", () => {
    expect(AscentPatchSchema.safeParse({ route: "x".repeat(501) }).success).toBe(false);
    expect(AscentPatchSchema.safeParse({ description: "x".repeat(2001) }).success).toBe(false);
    expect(AscentPatchSchema.safeParse({ wikiloc: "x".repeat(501) }).success).toBe(false);
    expect(AscentPatchSchema.safeParse({ route: "x".repeat(500) }).success).toBe(true);
  });

  it("strips unknown keys so they can never reach the Prisma update", () => {
    const parsed = AscentPatchSchema.safeParse({ route: "ok", createdBy: "attacker-id" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("createdBy" in parsed.data).toBe(false);
      expect("createdBy" in buildAscentPatchData(parsed.data)).toBe(false);
    }
  });
});

describe("AscentPatchSchemaV1 — mobile variant", () => {
  it("silently drops wikiloc (not exposed on mobile)", () => {
    const parsed = AscentPatchSchemaV1.safeParse({ route: "ok", wikiloc: "https://wikiloc.com/x" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const data = buildAscentPatchData(parsed.data);
      expect("wikiloc" in data).toBe(false);
      expect(data.route).toBe("ok");
    }
  });

  it("shares the same validation rules as the web schema", () => {
    expect(AscentPatchSchemaV1.safeParse({ date: "bad" }).success).toBe(false);
    expect(AscentPatchSchemaV1.safeParse({ route: null }).success).toBe(true);
  });
});
