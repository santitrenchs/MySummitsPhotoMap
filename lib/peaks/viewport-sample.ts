import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";

// ── Spatially even viewport sampling ──────────────────────────────────────────

/**
 * Which peaks to send for a viewport, when the viewport holds far more than the
 * budget.
 *
 * ⚠️ The obvious answer — `ORDER BY "altitudeM" DESC LIMIT 600` — is a GLOBAL
 * altitude cut wearing a viewport's clothes, and it empties half the map. Measured
 * on a zoom-7 viewport over the Pyrenees + Catalonia: 8,479 peaks inside, the 600th
 * sits at 2,732 m, and of the 3,552 peaks in the southern half exactly ZERO are
 * sent. Montserrat and the Montseny are not filtered out on the client — they never
 * leave the database. 84% of the catalogue is below 2,000 m, so this ships the
 * highest 6% of the world and calls it a map.
 *
 * Instead: cut the viewport into a GRID x GRID mesh and hand out the budget
 * round-robin — every cell's best peak before any cell's second. A cell with four
 * 800 m hills gets all four; the Mont Blanc cell keeps taking more as `rn` climbs,
 * so the full budget is still spent. Empty cells simply do not bid.
 *
 * This decides WHICH peaks travel, not which ones are drawn: the client still
 * scores and thins them (MapView → computeViewportScores).
 */
/** Web's viewport budget. The mobile route passes its own, smaller by zoom. */
export const VIEWPORT_BUDGET = 600;

/**
 * Grid resolution for a given budget. Aiming at ~8 peaks per cell: a mesh so fine
 * that most cells get a single peak stops ranking anything, and one so coarse that a
 * cell spans a whole massif is the altitude cut again with extra steps.
 */
function gridFor(budget: number): number {
  return Math.min(8, Math.max(2, Math.round(Math.sqrt(budget / 8))));
}

export async function sampleViewportPeakIds(
  north: number, south: number, east: number, west: number, budget: number,
): Promise<string[]> {
  const GRID = gridFor(budget);
  // A viewport crossing the antimeridian arrives with east < west. Unrolling the
  // east edge past 180° and shifting the peaks that fall beyond it makes the grid
  // arithmetic identical in both cases — width_bucket needs a monotonic axis.
  const eastAdj = east >= west ? east : east + 360;
  // Degenerate spans (a fully zoomed-in viewport, or a rounding collapse) would make
  // width_bucket throw on equal bounds.
  const latHi = north > south  ? north   : south + 1e-9;
  const lonHi = eastAdj > west ? eastAdj : west  + 1e-9;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH vp AS (
      SELECT id, "altitudeM", importance, latitude,
             CASE WHEN longitude < ${west}::float8 THEN longitude + 360 ELSE longitude END AS lon
      FROM peaks
      WHERE latitude BETWEEN ${south}::float8 AND ${north}::float8
        AND (CASE WHEN longitude < ${west}::float8 THEN longitude + 360 ELSE longitude END)
            BETWEEN ${west}::float8 AND ${eastAdj}::float8
    ),
    binned AS (
      -- ⚠️ Every argument is cast. Prisma binds a JS number as numeric (or bigint
      -- when it happens to be integral), and width_bucket has no overload for that
      -- mix — the call fails with 42883 at runtime while the same SQL typed by hand
      -- in psql works fine, because there the literals resolve to one type.
      SELECT id, "altitudeM", importance,
             LEAST(GREATEST(width_bucket(
               latitude::float8, ${south}::float8, ${latHi}::float8, ${GRID}::int), 1), ${GRID}) AS gy,
             LEAST(GREATEST(width_bucket(
               lon::float8,      ${west}::float8,  ${lonHi}::float8, ${GRID}::int), 1), ${GRID}) AS gx
      FROM vp
    ),
    ranked AS (
      SELECT id, "altitudeM", importance,
             -- importance, not altitude: ordering a massif by height hands the whole
             -- cell to one mountain's sub-summits. COALESCE keeps rows the backfill
             -- has not reached yet from sorting as NULL-last and vanishing.
             row_number() OVER (
               PARTITION BY gx, gy
               ORDER BY COALESCE(importance, 0) DESC, "altitudeM" DESC, id
             ) AS rn
      FROM binned
    )
    SELECT id FROM ranked
    ORDER BY rn ASC, COALESCE(importance, 0) DESC, "altitudeM" DESC
    LIMIT ${budget}::int
  `);

  return rows.map((r) => r.id);
}
