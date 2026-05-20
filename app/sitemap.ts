import type { MetadataRoute } from "next";

const BASE = "https://www.peakadex.com";

const LANG_ALTERNATES = {
  "x-default": `${BASE}/en`,
  es: BASE,
  en: `${BASE}/en`,
  ca: `${BASE}/ca`,
  fr: `${BASE}/fr`,
  de: `${BASE}/de`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const landingPages: MetadataRoute.Sitemap = [
    { url: BASE,         priority: 1.0 },
    { url: `${BASE}/en`, priority: 0.9 },
    { url: `${BASE}/ca`, priority: 0.9 },
    { url: `${BASE}/fr`, priority: 0.9 },
    { url: `${BASE}/de`, priority: 0.9 },
  ].map((entry) => ({
    ...entry,
    lastModified: now,
    changeFrequency: "weekly" as const,
    alternates: { languages: LANG_ALTERNATES },
  }));

  const legalPages: MetadataRoute.Sitemap = [
    "/terms",
    "/privacy",
    "/cookies",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.3,
  }));

  return [...landingPages, ...legalPages];
}
