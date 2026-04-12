import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db/client";

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
          <span style={{ fontWeight: 700, fontSize: 15 }}>MySummits Backoffice</span>
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
        {/* Sidebar */}
        <nav
          style={{
            width: 200, background: "white",
            borderRight: "1px solid #e2e8f0",
            padding: "24px 0",
          }}
        >
          <NavLink href="/admin/users" label="Usuarios" icon="👥" />
        </nav>

        {/* Content */}
        <main style={{ flex: 1, padding: 32 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 20px", fontSize: 14, fontWeight: 500,
        color: "#334155", textDecoration: "none",
        transition: "background 0.1s",
      }}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
