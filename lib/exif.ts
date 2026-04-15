export type ImageMeta = {
  date: string | null;  // "YYYY-MM-DD"
  lat: number | null;
  lng: number | null;
};

export async function extractImageMeta(file: File): Promise<ImageMeta> {
  try {
    const exifr = await import("exifr");
    const data = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "GPSLatitude", "GPSLongitude"],
      gps: true,
    });

    if (!data) return { date: null, lat: null, lng: null };

    let date: string | null = null;
    if (data.DateTimeOriginal instanceof Date && !isNaN(data.DateTimeOriginal.getTime())) {
      const d = data.DateTimeOriginal;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      date = `${y}-${m}-${day}`;
    }

    const lat = typeof data.latitude === "number" ? data.latitude : null;
    const lng = typeof data.longitude === "number" ? data.longitude : null;

    return { date, lat, lng };
  } catch {
    return { date: null, lat: null, lng: null };
  }
}
