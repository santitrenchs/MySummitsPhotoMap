// ─── Ascent PATCH — shared schema + field-isolation mapping ───────────────────
//
// Single source of truth for the PATCH /api/ascents/[id] (web) and
// PATCH /api/v1/ascents/[id] (mobile) update payload.
//
// CRITICAL field-isolation pattern: only fields present in the body may be
// written. Without the `in` guards, `undefined ?? null` would wipe every field
// the caller didn't intend to update. See CLAUDE.md "PATCH API — Field Isolation
// Pattern" and __tests__/ascent-patch.test.ts.

import { z } from "zod";

export const AscentPatchSchema = z.object({
  peakId:      z.string().uuid().optional(),
  route:       z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  wikiloc:     z.string().max(500).nullable().optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// v1 (mobile) does not expose wikiloc.
export const AscentPatchSchemaV1 = AscentPatchSchema.omit({ wikiloc: true });

export type AscentPatchInput = z.infer<typeof AscentPatchSchema>;

/**
 * Maps a parsed PATCH body to the Prisma `data` object.
 * A key absent from the body is absent from the result (field untouched);
 * an explicit `null` clears the field; `date` strings become Date instances.
 */
export function buildAscentPatchData(input: AscentPatchInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if ("peakId"      in input) data.peakId      = input.peakId;
  if ("route"       in input) data.route       = input.route ?? null;
  if ("description" in input) data.description = input.description ?? null;
  if ("wikiloc"     in input) data.wikiloc     = input.wikiloc ?? null;
  if ("date"        in input) data.date        = input.date ? new Date(input.date) : null;
  return data;
}
