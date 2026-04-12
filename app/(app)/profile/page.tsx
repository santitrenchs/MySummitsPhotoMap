import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfileData } from "@/lib/services/profile.service";
import { ProfileClient } from "@/components/profile/ProfileClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await getProfileData(session.user.tenantId, session.user.id);
  if (!data.user) redirect("/login");

  return (
    <ProfileClient
      user={{
        name: data.user.name,
        username: data.user.username ?? null,
        bio: data.user.bio ?? null,
      }}
      ascents={data.ascents}
      peaks={data.peaks}
      photos={data.allPhotos}
      stats={data.stats}
    />
  );
}
