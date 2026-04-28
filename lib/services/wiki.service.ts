const LANGS = ["en", "es", "ca", "fr", "de"] as const;
type WikiLang = (typeof LANGS)[number];

export type WikiTextResult = {
  lang: WikiLang;
  title: string;
  extract: string;
};

async function fetchOneWikiText(
  lang: WikiLang,
  peakName: string
): Promise<WikiTextResult | null> {
  try {
    // 1. OpenSearch to find the best matching title
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(peakName)}&limit=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "AziAtlas/1.0 (https://www.aziatlas.com)" },
      next: { revalidate: 0 },
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const titles: string[] = searchData[1] ?? [];
    if (titles.length === 0) return null;
    const title = titles[0];

    // 2. REST summary endpoint for clean plain-text extract
    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: { "User-Agent": "AziAtlas/1.0 (https://www.aziatlas.com)" },
      next: { revalidate: 0 },
    });
    if (!summaryRes.ok) return null;
    const summaryData = await summaryRes.json();
    const extract: string = summaryData.extract ?? "";
    if (!extract) return null;

    return { lang, title: summaryData.title ?? title, extract };
  } catch {
    return null;
  }
}

export async function fetchWikiTextsForPeak(
  peakName: string
): Promise<WikiTextResult[]> {
  const results = await Promise.allSettled(
    LANGS.map((lang) => fetchOneWikiText(lang, peakName))
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<WikiTextResult> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}
