import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfileData } from "@/lib/services/profile.service";
import { BitacoraClient } from "@/components/bitacora/BitacoraClient";
import { isBitacoraTab } from "@/components/bitacora/tabs";

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await getProfileData(session.user.tenantId, session.user.id);
  if (!data.user) redirect("/login");

  // Read on the server so returning from a challenge detail lands on the right tab
  // without needing useSearchParams (and its Suspense boundary) on the client.
  const { tab } = await searchParams;

  return (
    <BitacoraClient
      peaks={data.peaks}
      photos={data.allPhotos}
      taggedPhotos={data.taggedPhotos}
      initialTab={isBitacoraTab(tab) ? tab : "peaks"}
    />
  );
}
