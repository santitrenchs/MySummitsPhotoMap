import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { NewAscentForm } from "@/components/ascents/NewAscentForm";

export default async function NewAscentPage({
  searchParams,
}: {
  searchParams: Promise<{ peakId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { peakId } = await searchParams;

  const peaks = await prisma.peak.findMany({
    orderBy: [{ mountainRange: "asc" }, { altitudeM: "desc" }],
    select: { id: true, name: true, altitudeM: true, mountainRange: true },
  });

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>
        Log ascent
      </h1>
      <NewAscentForm peaks={peaks} defaultPeakId={peakId} />
    </div>
  );
}
