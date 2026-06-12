import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function CordadasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0D2538", marginBottom: 8 }}>Cordadas</h1>
      <p style={{ fontSize: 14, color: "#6b7280" }}>Próximamente — gestión de amigos y cordadas.</p>
    </div>
  );
}
