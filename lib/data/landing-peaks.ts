// ─── Shared peak data for landing carousel + SEO peak pages ──────────────────
//
// Locale-neutral facts only. Everything the reader reads in their own language
// (the demo comment, the formatted date, the country/range names) lives in
// `lib/i18n/peak-content.ts`.

export type PeakCardData = {
  peakName: string; altitudeM: number;
  country: string; flag: string; mountainRange: string;
  lat: number; lng: number;
  photo?: string; mapImg: string;
  route: string;
  /** ISO date (YYYY-MM-DD) — rendered per locale, never shown raw */
  dateISO: string;
  user: string; userColor: string;
  ascents: number; climbers: number;
  /** Peaks every mountaineer should have — award special crains points */
  mythic?: boolean;
};

// ─── Rarity helpers ───────────────────────────────────────────────────────────
export function rarityForAlt(m: number): { name: string; color: string; ep: string; flower: string } {
  if (m >= 8000) return { name: "Snow Lotus",  color: "#94A3B8", ep: "2.000 EP", flower: "✿" };
  if (m >= 7000) return { name: "Cinquefoil",  color: "#EAB308", ep: "1.000 EP", flower: "✿" };
  if (m >= 6000) return { name: "Saxifrage",   color: "#F97316", ep: "500 EP",   flower: "✿" };
  if (m >= 5000) return { name: "Draba",       color: "#EC4899", ep: "250 EP",   flower: "✿" };
  if (m >= 4000) return { name: "Edelweiss",   color: "#A855F7", ep: "120 EP",   flower: "✿" };
  if (m >= 3000) return { name: "Tundra",      color: "#0E7490", ep: "60 EP",    flower: "✿" };
  if (m >= 2000) return { name: "Gentian",     color: "#1E40AF", ep: "30 EP",    flower: "✿" };
  if (m >= 1000) return { name: "Heather",     color: "#06B6D4", ep: "20 EP",    flower: "✿" };
  return          { name: "Daisy",        color: "#00995C", ep: "10 EP",    flower: "✿" };
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────
export function slugifyPeak(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPeakBySlug(slug: string): PeakCardData | undefined {
  return LANDING_PEAKS.find((p) => slugifyPeak(p.peakName) === slug);
}

// ─── Peak catalog ─────────────────────────────────────────────────────────────
export const LANDING_PEAKS: PeakCardData[] = [
  { peakName: "Aneto",               mythic: true, altitudeM: 3404, flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat:  42.6313, lng:   0.6560, photo: "/images/landing-aneto.webp",         mapImg: "/images/landing-aneto-map.webp",         route: "Vía del Portillón",           dateISO: "2024-08-14", user: "Iker Etxeberria",   userColor: "#1E40AF", ascents:  847, climbers: 312 },
  { peakName: "Monte Perdido",       mythic: true, altitudeM: 3355, flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat:  42.6761, lng:   0.0361, photo: "/images/landing-monteperdido.webp",  mapImg: "/images/landing-monteperdido-map.webp",  route: "Vía del Cilindro",            dateISO: "2023-09-02", user: "Javier Ordesa",     userColor: "#A855F7", ascents:  423, climbers: 167 },
  { peakName: "Posets",              mythic: true, altitudeM: 3375, flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat:  42.6500, lng:   0.4167, photo: "/images/landing-posets.webp",        mapImg: "/images/landing-posets-map.webp",        route: "Arista NO",                   dateISO: "2024-07-27", user: "Marta Ribagorza",   userColor: "#0E7490", ascents:  298, climbers: 128 },
  { peakName: "Pica d'Estats",       mythic: true, altitudeM: 3143, flag: "🇦🇩", country: "Andorra",       mountainRange: "Pirineos",         lat:  42.6642, lng:   1.3942, photo: "/images/landing-picadestats.webp",   mapImg: "/images/landing-picadestats-map.webp",   route: "Vía normal SO",               dateISO: "2023-08-11", user: "Oriol Casanovas",   userColor: "#00995C", ascents:  612, climbers: 241 },
  { peakName: "Mont Blanc",          mythic: true, altitudeM: 4808, flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes",            lat:  45.8326, lng:   6.8652, photo: "/images/landing-montblanc.webp",     mapImg: "/images/landing-montblanc-map.webp",     route: "Vía Goûter",                  dateISO: "2023-07-22", user: "Luc Moreau",        userColor: "#EC4899", ascents: 1284, climbers: 489 },
  { peakName: "Barre des Écrins",    mythic: true, altitudeM: 4102, flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes Dauphinois", lat:  44.9244, lng:   6.3567, photo: "/images/landing-ecrins.webp",        mapImg: "/images/landing-ecrins-map.webp",        route: "Arista O",                    dateISO: "2024-07-18", user: "Camille Durand",    userColor: "#1E40AF", ascents:  312, climbers: 124 },
  { peakName: "La Meije",            mythic: true, altitudeM: 3983, flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes Dauphinois", lat:  45.0072, lng:   6.4467, photo: "/images/landing-lameije.webp",       mapImg: "/images/landing-lameije-map.webp",       route: "Gran Couloir",                dateISO: "2022-08-05", user: "Étienne Charlet",   userColor: "#F97316", ascents:  178, climbers:  89 },
  { peakName: "Mont Aiguille",       mythic: true, altitudeM: 2087, flag: "🇫🇷", country: "Francia",       mountainRange: "Vercors",          lat:  44.8017, lng:   5.5150, photo: "/images/landing-montaiguille.webp",  mapImg: "/images/landing-montaiguille-map.webp",  route: "Vía normal S",                dateISO: "2024-05-30", user: "Pierre Vaucher",    userColor: "#A855F7", ascents:  534, climbers: 210 },
  { peakName: "Dufourspitze",        mythic: true, altitudeM: 4634, flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Peninos",    lat:  45.9369, lng:   7.8669, photo: "/images/landing-dufourspitze.webp",  mapImg: "/images/landing-dufourspitze-map.webp",  route: "Arista NE",                   dateISO: "2023-08-14", user: "Lukas Zurbuchen",   userColor: "#0E7490", ascents:  267, climbers: 118 },
  { peakName: "Matterhorn",          mythic: true, altitudeM: 4478, flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Peninos",    lat:  45.9766, lng:   7.6586, photo: "/images/landing-matterhorn.webp",    mapImg: "/images/landing-matterhorn-map.webp",    route: "Arista Hörnli",               dateISO: "2022-07-29", user: "Matthias Hörnli",   userColor: "#EC4899", ascents:  723, climbers: 298 },
  { peakName: "Gran Paradiso",       mythic: true, altitudeM: 4061, flag: "🇮🇹", country: "Italia",        mountainRange: "Alpes Graios",     lat:  45.5175, lng:   7.2686, photo: "/images/landing-granparadiso.webp",  mapImg: "/images/landing-granparadiso-map.webp",  route: "Vía normal",                  dateISO: "2024-08-03", user: "Giulia Rinaldi",    userColor: "#00995C", ascents:  891, climbers: 342 },
  { peakName: "Jungfrau",            mythic: true, altitudeM: 4158, flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Berneses",   lat:  46.5375, lng:   7.9622, photo: "/images/landing-jungfrau.webp",      mapImg: "/images/landing-jungfrau-map.webp",      route: "Ruta del Rottal",             dateISO: "2023-07-20", user: "Anna Albrecht",     userColor: "#F97316", ascents: 1031, climbers: 401 },
  { peakName: "Eiger",               mythic: true, altitudeM: 3967, flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Berneses",   lat:  46.5775, lng:   8.0050, photo: "/images/landing-eiger.webp",         mapImg: "/images/landing-eiger-map.webp",         route: "Arista O (vía normal)",       dateISO: "2023-09-16", user: "Franz Eigermann",   userColor: "#1E40AF", ascents:  156, climbers:  78 },
  { peakName: "Zugspitze",           mythic: true, altitudeM: 2962, flag: "🇩🇪", country: "Alemania",      mountainRange: "Alpes Bávaros",    lat:  47.4211, lng:  10.9853, photo: "/images/landing-zugspitze.webp",     mapImg: "/images/landing-zugspitze-map.webp",     route: "Vía normal SE",               dateISO: "2024-10-12", user: "Tobias Kramer",     userColor: "#A855F7", ascents: 1423, climbers: 534 },
  { peakName: "Watzmann",            mythic: true, altitudeM: 2713, flag: "🇩🇪", country: "Alemania",      mountainRange: "Berchtesgaden",    lat:  47.5508, lng:  12.9444, photo: "/images/landing-watzmann.webp",      mapImg: "/images/landing-watzmann-map.webp",      route: "Arista SO",                   dateISO: "2024-08-08", user: "Sepp Watzl",        userColor: "#0E7490", ascents:  612, climbers: 234 },
  { peakName: "Alpspitze",           mythic: true, altitudeM: 2628, flag: "🇩🇪", country: "Alemania",      mountainRange: "Wetterstein",      lat:  47.4558, lng:  10.9986, photo: "/images/landing-alpspitze.webp",     mapImg: "/images/landing-alpspitze-map.webp",     route: "Vía normal E",                dateISO: "2024-06-25", user: "Leonhard Alper",    userColor: "#EC4899", ascents:  489, climbers: 198 },
  { peakName: "Ben Nevis",           mythic: true, altitudeM: 1345, flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Escocia",        mountainRange: "Grampian",         lat:  56.7969, lng:  -5.0035, photo: "/images/landing-bennevis.webp",      mapImg: "/images/landing-bennevis-map.webp",      route: "Mountain Track",              dateISO: "2024-05-17", user: "Callum MacLeod",    userColor: "#F97316", ascents: 2134, climbers: 812 },
  { peakName: "Scafell Pike",        mythic: true, altitudeM:  978, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "Inglaterra",     mountainRange: "Lake District",    lat:  54.4541, lng:  -3.2114, photo: "/images/landing-scafellpike.webp",   mapImg: "/images/landing-scafellpike-map.webp",   route: "Ruta desde Wasdale Head",     dateISO: "2023-11-03", user: "Oliver Scaford",    userColor: "#00995C", ascents: 1876, climbers: 723 },
  { peakName: "Snowdon",             mythic: true, altitudeM: 1085, flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", country: "Gales",          mountainRange: "Eryri",            lat:  53.0685, lng:  -4.0762, photo: "/images/landing-snowdon.webp",       mapImg: "/images/landing-snowdon-map.webp",       route: "Llanberis Path",              dateISO: "2024-04-22", user: "Gareth Llewelyn",   userColor: "#1E40AF", ascents: 2891, climbers: 1045 },
  { peakName: "Buachaille Etive Mòr",mythic: true, altitudeM: 1021, flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Escocia",        mountainRange: "Glen Coe",         lat:  56.6469, lng:  -4.8988, photo: "/images/landing-buachaille.webp",    mapImg: "/images/landing-buachaille-map.webp",    route: "Vía SE por Coire na Tulaich", dateISO: "2024-06-09", user: "Ewan MacFarlane",   userColor: "#A855F7", ascents:  345, climbers: 142 },
];
