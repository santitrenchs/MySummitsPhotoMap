import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
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

  const peaks = await prisma.peak.findMany({
    orderBy: [{ mountainRange: "asc" }, { altitudeM: "desc" }],
    select: { id: true, name: true, altitudeM: true, mountainRange: true, latitude: true, longitude: true },
  });

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>
        {t.ascents_logTitle}
      </h1>
      <NewAscentForm peaks={peaks} defaultPeakId={peakId} />
    </div>
  );
}
