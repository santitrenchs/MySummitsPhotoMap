import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { AdminNav } from "./AdminNav";
import { DarkModeToggle } from "./DarkModeToggle";
import { prisma } from "@/lib/db/client";
import "../admin.css";

function VersionBadge() {
  const env = process.env.RAILWAY_ENVIRONMENT_NAME ?? "local";
  const branch = process.env.RAILWAY_GIT_BRANCH ?? "local";
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const commit = sha ? sha.slice(0, 7) : "local";

  const label = env === "production" ? "PROD" : env === "staging" ? "STAGING" : "LOCAL";
  const variant = env === "production" ? "badge badge-danger" : env === "staging" ? "badge badge-warning" : "badge badge-info";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span className={variant} style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span className="admin-header-version">
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
    <>
      {/* Anti-flash dark mode script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('admin-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){}})();`,
        }}
      />
      <div className="admin-container">
        <header className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Peakadex Admin
            </div>
            <VersionBadge />
          </div>
          <div className="admin-header-right">
            <span style={{ fontSize: 13 }}>{session.user.name}</span>
            <DarkModeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button type="submit" className="btn btn-secondary btn-sm">
                Salir
              </button>
            </form>
          </div>
        </header>

        <div className="admin-body">
          <AdminNav />
          <main className="admin-main">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
