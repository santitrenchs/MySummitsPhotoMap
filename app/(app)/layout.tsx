import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav/NavBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <NavBar
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? null}
      />
      <main style={{ flex: 1, paddingBottom: "var(--bottom-nav-h, 0px)" }}>
        {children}
      </main>
      {/* CSS variables for nav heights — used by map and other full-bleed sections */}
      <style>{`
        :root {
          --top-nav-h: 3rem;
          --bottom-nav-h: 0px;
        }
        @media (max-width: 639px) {
          :root {
            --top-nav-h: 0px;
            --bottom-nav-h: calc(60px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </div>
  );
}
