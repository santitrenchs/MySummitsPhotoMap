import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { AscentEditForm } from "@/components/ascents/AscentEditForm";
import { getServerT } from "@/lib/i18n/server";

export default async function AscentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const t = await getServerT();

  const { id } = await params;
  const db = await getTenantConnection(session.user.tenantId);

  const ascent = await db.ascent.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: {
      id: true,
      date: true,
      route: true,
      description: true,
      wikiloc: true,
      peak: { select: { name: true, altitudeM: true } },
    },
  });

  if (!ascent) notFound();

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
        {t.ascents_editTitle}
      </h1>
      <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 24px" }}>
        {ascent.peak.name} · {ascent.peak.altitudeM.toLocaleString(t.dateLocale)} m
      </p>
      <AscentEditForm
        id={ascent.id}
        defaultDate={ascent.date.toISOString().split("T")[0]}
        defaultRoute={ascent.route ?? ""}
        defaultDescription={ascent.description ?? ""}
        defaultWikiloc={ascent.wikiloc ?? ""}
      />
    </div>
  );
}
