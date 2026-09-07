import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getChallengeDetail } from "@/lib/services/challenge.service";
import { ChallengeDetailClient } from "@/components/bitacora/ChallengeDetailClient";
import { getLocale } from "@/lib/i18n/server";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  // Scoped to the session user: done/pending reflects their ascents only, and an
  // inactive challenge they never joined comes back null (→ 404, not reachable).
  const challenge = await getChallengeDetail(id, session.user.id, await getLocale());
  if (!challenge) notFound();

  return <ChallengeDetailClient challenge={challenge} />;
}
