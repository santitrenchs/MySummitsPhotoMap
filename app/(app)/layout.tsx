import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/ui/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-6 shrink-0">
        <Link href="/map" className="font-semibold text-gray-900 text-sm">
          MySummits
        </Link>
        <nav className="flex gap-4 text-sm text-gray-500">
          <Link href="/map" className="hover:text-gray-900 transition-colors">
            Map
          </Link>
          <Link href="/ascents" className="hover:text-gray-900 transition-colors">
            Ascents
          </Link>
          <Link href="/persons" className="hover:text-gray-900 transition-colors">
            People
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm text-gray-500">
          <span>{session.user.name}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
