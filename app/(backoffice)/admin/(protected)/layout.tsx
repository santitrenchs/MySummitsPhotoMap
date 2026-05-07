import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { AdminNav } from "./AdminNav";
import { prisma } from "@/lib/db/client";

function VersionBadge() {
  const env = process.env.RAILWAY_ENVIRONMENT_NAME ?? "local";
  const branch = process.env.RAILWAY_GIT_BRANCH ?? "local";
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const commit = sha ? sha.slice(0, 7) : "local";

  const isProduction = env === "production";
  const isStaging = env === "staging";
  const bg = isProduction ? "#166534" : isStaging ? "#854d0e" : "#1e3a5f";
  const label = isProduction ? "PROD" : isStaging ? "STAGING" : "LOCAL";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        background: bg, color: "white",
        fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
        padding: "2px 7px", borderRadius: 4,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
        {branch}@{commit}
      </span>
    </div>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!dbUser?.isAdmin) redirect("/admin/login?error=unauthorized");

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      {/* Top bar */}
      <header
        style={{
          background: "#1e293b", color: "white",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚙️</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Peakadex Backoffice</span>
          <VersionBadge />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              style={{
                background: "none", border: "1px solid #475569",
                color: "#cbd5e1", borderRadius: 6, padding: "4px 12px",
                fontSize: 13, cursor: "pointer",
              }}
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        <AdminNav />

        {/* Content */}
        <main style={{ flex: 1, padding: 32 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

