import type { MetadataRoute } from "next";
import { LANDING_PEAKS, slugifyPeak } from "@/lib/data/landing-peaks";

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

  const peakIndexHreflang = {
    "x-default": `${BASE}/en/peaks`,
    es: `${BASE}/peaks`,
    en: `${BASE}/en/peaks`,
    fr: `${BASE}/fr/peaks`,
    de: `${BASE}/de/peaks`,
    ca: `${BASE}/ca/peaks`,
  };

  const peakIndexPages: MetadataRoute.Sitemap = [
    `${BASE}/peaks`,
    `${BASE}/en/peaks`,
    `${BASE}/fr/peaks`,
    `${BASE}/de/peaks`,
    `${BASE}/ca/peaks`,
  ].map((url) => ({
    url,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    alternates: { languages: peakIndexHreflang },
  }));

  const peakPages: MetadataRoute.Sitemap = LANDING_PEAKS.flatMap((peak) => {
    const slug = slugifyPeak(peak.peakName);
    const peakHreflang = {
      "x-default": `${BASE}/en/peaks/${slug}`,
      es:  `${BASE}/peaks/${slug}`,
      en:  `${BASE}/en/peaks/${slug}`,
      fr:  `${BASE}/fr/peaks/${slug}`,
      de:  `${BASE}/de/peaks/${slug}`,
      ca:  `${BASE}/ca/peaks/${slug}`,
    };
    return [
      { url: `${BASE}/peaks/${slug}`,      locale: "es" },
      { url: `${BASE}/en/peaks/${slug}`,   locale: "en" },
      { url: `${BASE}/fr/peaks/${slug}`,   locale: "fr" },
      { url: `${BASE}/de/peaks/${slug}`,   locale: "de" },
      { url: `${BASE}/ca/peaks/${slug}`,   locale: "ca" },
    ].map(({ url }) => ({
      url,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: { languages: peakHreflang },
    }));
  });

  return [...landingPages, ...legalPages, ...peakIndexPages, ...peakPages];
}
