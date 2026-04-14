import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isAdminLogin = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin") && !isAdminLogin;

  // Always allow NextAuth internal API routes and health check
  if (isAuthApi || pathname === "/api/health") return NextResponse.next();

  // ── Backoffice (/admin/*) ──────────────────────────────────
  if (isAdminLogin) {
    // Already logged in as admin → skip login page
    if (isLoggedIn && req.auth?.user?.isAdmin) {
      return NextResponse.redirect(new URL("/admin/users", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
    }
    return NextResponse.next();
  }

  // ── Main app ───────────────────────────────────────────────
  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/map", req.nextUrl));
  }

  // Redirect unauthenticated users to login (except root, which redirects itself)
  if (!isLoggedIn && !isAuthPage && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Run on all routes except static assets and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
