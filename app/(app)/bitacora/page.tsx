import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfileData } from "@/lib/services/profile.service";
import { BitacoraClient } from "@/components/bitacora/BitacoraClient";

export default async function BitacoraPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await getProfileData(session.user.tenantId, session.user.id);
  if (!data.user) redirect("/login");

  return (
    <BitacoraClient
      peaks={data.peaks}
      photos={data.allPhotos}
      taggedPhotos={data.taggedPhotos}
      stats={data.stats}
    />
  );
}
