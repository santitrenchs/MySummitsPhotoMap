import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getCordadaDetail } from "@/lib/services/cordada.service";
import { CordadaDetailClient } from "@/components/cordadas/CordadaDetailClient";

export default async function CordadaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const cordada = await getCordadaDetail(id, session.user.id);
  if (!cordada) notFound();

  return <CordadaDetailClient cordada={cordada} currentUserId={session.user.id} />;
}
