const CF_HOSTS = ["media.peakadex.com", "mediastaging.peakadex.com"];

/**
 * Returns a Cloudflare-transformed image URL for the given width.
 * Falls back to the original URL for non-CF hosts (local dev, legacy r2.dev).
 */
export function imgUrl(url: string | null | undefined, width: number): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!CF_HOSTS.includes(u.hostname)) return url;
    return `${u.origin}/cdn-cgi/image/width=${width},format=webp,quality=80${u.pathname}`;
  } catch {
    return url;
  }
}
