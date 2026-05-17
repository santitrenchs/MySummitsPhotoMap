import { auth } from "@/auth";
import { NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["ca", "en", "fr", "de", "es"] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];
const LOCALE_COOKIE = "pdx_locale";

/**
 * Parse the Accept-Language header and return the best-matching supported locale.
 * Falls back to "es" (Spanish) if nothing matches.
 */
function detectLocale(acceptLang: string): SupportedLocale {
  const candidates = acceptLang
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      const lang = tag.split("-")[0].toLowerCase();
      return { lang, q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of candidates) {
    if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
      return lang as SupportedLocale;
    }
  }
  return "en";
}

function withPathname(pathname: string): NextResponse {
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  return res;
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // ── Locale-prefixed auth routes (/en/login, /fr/register, etc.) ───────────
  // Strip the locale prefix, persist the locale cookie, redirect to the bare route.
  const localePrefixMatch = pathname.match(/^\/(en|ca|fr|de)(\/.*)?$/);
  if (localePrefixMatch) {
    const prefixLocale = localePrefixMatch[1] as SupportedLocale;
    const rest = localePrefixMatch[2] ?? "/";
    const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/accept-terms"];
    if (authRoutes.includes(rest)) {
      const res = NextResponse.redirect(new URL(rest, req.nextUrl));
      res.cookies.set(LOCALE_COOKIE, prefixLocale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
      return res;
    }
  }

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/cookies";

  // Accept-terms is only for authenticated users; unauthenticated ones get sent to login
  if (pathname === "/accept-terms") {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.nextUrl));
    return withPathname(pathname);
  }
  // Public ascent share pages — accessible without auth
  const isPublicAscentPage = pathname.startsWith("/ascent/");

  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublicApi =
    pathname === "/api/stats/landing" ||
    pathname.match(/^\/api\/ascents\/[^/]+\/share$/) !== null ||
    pathname.match(/^\/api\/og-data\/[^/]+$/) !== null || // OG data endpoint
    pathname.match(/^\/api\/og\/[^/]+$/) !== null;       // OG image (sharp-composed card)
  const isAdminLogin = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin") && !isAdminLogin;

  // Always allow NextAuth internal API routes, health check and public stats
  if (isAuthApi || isPublicApi || pathname === "/api/health") return withPathname(pathname);

  // ── Backoffice (/admin/*) ──────────────────────────────────
  if (isAdminLogin) {
    // Already logged in as admin → skip login page
    if (isLoggedIn && req.auth?.user?.isAdmin) {
      return NextResponse.redirect(new URL("/admin/users", req.nextUrl));
    }
    return withPathname(pathname);
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
    }
    return withPathname(pathname);
  }

  // ── Main app ───────────────────────────────────────────────
  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/map", req.nextUrl));
  }

  const isLanding =
    pathname === "/" ||
    pathname === "/en" ||
    pathname === "/fr" ||
    pathname === "/de" ||
    pathname === "/ca";

  // Authenticated users on any landing page → let them through (don't force into app)

  // ── Locale auto-detection for landing ─────────────────────────────────────
  if (isLanding) {
    const localeCookie = req.cookies.get(LOCALE_COOKIE)?.value as SupportedLocale | undefined;

    if (pathname === "/") {
      // Detect locale: cookie first, then Accept-Language header
      const detected: SupportedLocale =
        localeCookie && SUPPORTED_LOCALES.includes(localeCookie)
          ? localeCookie
          : detectLocale(req.headers.get("accept-language") ?? "");

      if (detected !== "es") {
        // Redirect to the detected locale page; cookie will be set when they land there
        return NextResponse.redirect(new URL(`/${detected}`, req.nextUrl));
      }
      // Spanish — always refresh the cookie so auth pages pick up the right locale
      const res = withPathname(pathname);
      res.cookies.set(LOCALE_COOKIE, "es", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
      return res;
    } else {
      // /en, /fr, /de, /ca — always overwrite cookie with current locale
      const chosenLocale = pathname.slice(1) as SupportedLocale;
      const res = withPathname(pathname);
      res.cookies.set(LOCALE_COOKIE, chosenLocale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
      return res;
    }
  }

  // Redirect unauthenticated users to login (except landing pages, auth pages, and public ascent pages)
  if (!isLoggedIn && !isAuthPage && !isLanding && !isPublicAscentPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return withPathname(pathname);
});

export const config = {
  // Run on all routes except static assets and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json)$).*)"],
};
