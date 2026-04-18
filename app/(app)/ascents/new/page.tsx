import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { NewAscentForm } from "@/components/ascents/NewAscentForm";
import { getServerT } from "@/lib/i18n/server";

export default async function NewAscentPage({
  searchParams,
}: {
  searchParams: Promise<{ peakId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const t = await getServerT();

  const { peakId } = await searchParams;

  const [peaks, db] = await Promise.all([
    prisma.peak.findMany({
      orderBy: [{ mountainRange: "asc" }, { altitudeM: "desc" }],
      select: { id: true, name: true, altitudeM: true, mountainRange: true, latitude: true, longitude: true },
    }),
    getTenantConnection(session.user.tenantId),
  ]);

  // Pares peakId+fecha del usuario para el check de duplicados en el form
  const rawAscents = await db.ascent.findMany({
    where: { tenantId: session.user.tenantId, createdBy: session.user.id },
    select: { peakId: true, date: true },
  });
  const existingAscents = rawAscents.map((a) => ({
    peakId: a.peakId,
    date: a.date.toISOString().substring(0, 10),
  }));

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>
        {t.ascents_logTitle}
      </h1>
      <NewAscentForm peaks={peaks} defaultPeakId={peakId} existingAscents={existingAscents} />
    </div>
  );
}
