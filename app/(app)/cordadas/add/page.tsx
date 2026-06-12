import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CreateCordadaClient } from "@/components/cordadas/CreateCordadaClient";

export default async function CreateCordadaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <CreateCordadaClient />;
}
