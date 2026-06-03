import { NextRequest, NextResponse } from "next/server";
import { getV1Session } from "@/lib/api-v1/auth";
import { getProfileData } from "@/lib/services/profile.service";
import { RARITIES } from "@/lib/rarity";

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d as string);
  return date.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const session = await getV1Session(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const data = await getProfileData(session.tenantId, session.userId);

    const maxAltitude =
      data.peaks.length > 0
        ? Math.max(...data.peaks.map((p) => p.altitudeM))
        : 0;

    return NextResponse.json({
      // Spread user fields explicitly so email is always present (Android User model requires it)
      user: {
        id:        data.user?.id        ?? session.userId,
        name:      data.user?.name      ?? "",
        email:     "",   // not stored in profile select; Android gets it via /api/v1/settings
        username:  data.user?.username  ?? null,
        bio:       data.user?.bio       ?? null,
        avatarUrl: data.user?.avatarUrl ?? null,
      },
      peaks: data.peaks.map((p) => ({
        id:            p.id,
        name:          p.name,
        altitudeM:     p.altitudeM,
        mountainRange: p.mountainRange ?? null,
        country:       p.country ?? null,
        rarityId:      p.rarityId,
        count:         p.count,
        lastDate:      toDateStr(p.lastDate),
        firstDate:     toDateStr(p.firstDate),
        firstPhotoUrl: p.firstPhotoUrl ?? null,
      })),
      photos: data.allPhotos.map((p) => ({
        id:       p.id,
        url:      p.url,
        ascentId: p.ascentId,
        peakName: p.peakName,
        altitudeM: p.altitudeM,
        rarityId: p.rarityId,
        date:     toDateStr(p.date),
      })),
      taggedPhotos: data.taggedPhotos.map((p) => ({
        id:          p.id,
        url:         p.url,
        ascentId:    p.ascentId,
        peakName:    p.peakName,
        altitudeM:   p.altitudeM,
        rarityId:    p.rarityId,
        date:        toDateStr(p.date),
        creatorName: p.creatorName ?? null,
      })),
      stats: {
        totalAscents: data.stats.totalAscents,
        uniquePeaks:  data.stats.uniquePeaks,
        maxAltitude,
        totalPhotos:  data.stats.totalPhotos,
      },
      rarities: RARITIES.map((r) => ({
        id:          r.id,
        label:       r.label,
        color:       r.color,
        colorDark:   r.colorDark,
        minAlt:      r.minAlt,
        ep:          r.ep,
        scoreWeight: r.scoreWeight,
      })),
    });
  } catch (err) {
    console.error("[v1/profile GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
