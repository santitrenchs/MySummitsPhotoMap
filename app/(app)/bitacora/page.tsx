import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfileData } from "@/lib/services/profile.service";
import { BitacoraClient } from "@/components/bitacora/BitacoraClient";
import { isBitacoraTab } from "@/components/bitacora/tabs";
import { listChallenges } from "@/lib/services/challenge.service";
import { getLocale } from "@/lib/i18n/server";

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // In parallel: the Retos tab is server-rendered like the rest, so switching to it
  // shows content straight away instead of a client fetch on mount.
  const [data, challenges] = await Promise.all([
    getProfileData(session.user.tenantId, session.user.id),
    listChallenges(session.user.id, await getLocale()),
  ]);
  if (!data.user) redirect("/login");

  // Read on the server so returning from a challenge detail lands on the right tab
  // without needing useSearchParams (and its Suspense boundary) on the client.
  const { tab } = await searchParams;

  return (
    <BitacoraClient
      peaks={data.peaks}
      photos={data.allPhotos}
      taggedPhotos={data.taggedPhotos}
      challenges={challenges}
      initialTab={isBitacoraTab(tab) ? tab : "peaks"}
    />
  );
}
