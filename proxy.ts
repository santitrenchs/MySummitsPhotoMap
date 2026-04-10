import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAuthApi = pathname.startsWith("/api/auth");

  // Always allow NextAuth internal API routes
  if (isAuthApi) return NextResponse.next();

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
