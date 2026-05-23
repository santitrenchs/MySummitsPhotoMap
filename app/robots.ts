import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/en",
          "/ca",
          "/fr",
          "/de",
          "/peaks",
          "/peaks/",
          "/en/peaks",
          "/en/peaks/",
          "/fr/peaks",
          "/fr/peaks/",
          "/de/peaks",
          "/de/peaks/",
          "/ca/peaks",
          "/ca/peaks/",
          "/terms",
          "/privacy",
          "/cookies",
        ],
        disallow: [
          "/api/",
          "/home",
          "/map",
          "/ascents",
          "/social",
          "/settings",
          "/friends",
          "/persons",
          "/admin",
          "/accept-terms",
          "/register",
          "/login",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: "https://www.peakadex.com/sitemap.xml",
  };
}
