import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SocialFeedClient } from "@/components/social/SocialFeedClient";

export default async function SocialPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <SocialFeedClient />;
}
