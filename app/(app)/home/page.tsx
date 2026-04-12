import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n/server";
import { getHomeData } from "@/lib/services/home.service";
import { HomeClient } from "@/components/home/HomeClient";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [t, data] = await Promise.all([
    getServerT(),
    getHomeData(session.user.id),
  ]);

  return <HomeClient data={data} locale={t.dateLocale} t={t} />;
}
