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
  /** `Peak.id` in the production catalogue — the join key for challenges and facts. */
  peakId: string;
  /** How the catalogue files it, when that differs (Snowdon → "Yr Wyddfa"). */
  catalogName: string;
  /** `Peak.comarca`: the district/county. Null where the catalogue has none. */
  comarca: string | null;
  /** OpenStreetMap node id — becomes `sameAs` in the JSON-LD. */
  osmId: string;
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
  { peakName: "Aneto",               mythic: true, altitudeM: 3404, flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat: 42.631073, lng: 0.656646, photo: "/images/landing-aneto.webp",         mapImg: "/images/landing-aneto-map.webp",         route: "Vía del Portillón",           dateISO: "2024-08-14", user: "Iker Etxeberria",   userColor: "#1E40AF", ascents:  847, climbers: 312, peakId: "2dc908d9-0853-4734-bc91-bc50ab52360f", catalogName: "Tuca d'Aneto / Maladeta de Corones", comarca: "Benasque", osmId: "4252339778" },
  { peakName: "Monte Perdido",       mythic: true, altitudeM: 3355, flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat: 42.675548, lng: 0.034357, photo: "/images/landing-monteperdido.webp",  mapImg: "/images/landing-monteperdido-map.webp",  route: "Vía del Cilindro",            dateISO: "2023-09-02", user: "Javier Ordesa",     userColor: "#A855F7", ascents:  423, climbers: 167, peakId: "1642aef2-124e-4ec4-97a0-3798e36ddd53", catalogName: "Punta de Treserols / Monte Perdido", comarca: "Bielsa", osmId: "948790896" },
  { peakName: "Posets",              mythic: true, altitudeM: 3375, flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat: 42.654629, lng: 0.435227, photo: "/images/landing-posets.webp",        mapImg: "/images/landing-posets-map.webp",        route: "Arista NO",                   dateISO: "2024-07-27", user: "Marta Ribagorza",   userColor: "#0E7490", ascents:  298, climbers: 128, peakId: "83bb286d-d708-4c4c-ae85-080de921881f", catalogName: "Tuca de Posets", comarca: "Ribagorza", osmId: "26864263" },
  { peakName: "Pica d'Estats",       mythic: true, altitudeM: 3143, flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat: 42.666952, lng: 1.397899, photo: "/images/landing-picadestats.webp",   mapImg: "/images/landing-picadestats-map.webp",   route: "Vía normal SO",               dateISO: "2023-08-11", user: "Oriol Casanovas",   userColor: "#00995C", ascents:  612, climbers: 241, peakId: "21b88d79-2d12-4e7d-91d2-e8aec02015c0", catalogName: "Pica d'Estats", comarca: "Pallars Sobirà", osmId: "26864258" },
  { peakName: "Mont Blanc",          mythic: true, altitudeM: 4808, flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes",            lat: 45.832706, lng: 6.865171, photo: "/images/landing-montblanc.webp",     mapImg: "/images/landing-montblanc-map.webp",     route: "Vía Goûter",                  dateISO: "2023-07-22", user: "Luc Moreau",        userColor: "#EC4899", ascents: 1284, climbers: 489, peakId: "db1ccd5d-6631-4bec-b9c5-62fe11cb5652", catalogName: "Mont Blanc / Monte Bianco", comarca: null, osmId: "281399025" },
  { peakName: "Barre des Écrins",    mythic: true, altitudeM: 4102, flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes Dauphinois", lat: 44.92216, lng: 6.359547, photo: "/images/landing-ecrins.webp",        mapImg: "/images/landing-ecrins-map.webp",        route: "Arista O",                    dateISO: "2024-07-18", user: "Camille Durand",    userColor: "#1E40AF", ascents:  312, climbers: 124, peakId: "abb3507e-c630-4a6d-b155-de4785b5c5c7", catalogName: "Barre des Écrins", comarca: "Hautes-Alpes", osmId: "26862530" },
  { peakName: "La Meije",            mythic: true, altitudeM: 3983, flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes Dauphinois", lat: 45.005036, lng: 6.308254, photo: "/images/landing-lameije.webp",       mapImg: "/images/landing-lameije-map.webp",       route: "Gran Couloir",                dateISO: "2022-08-05", user: "Étienne Charlet",   userColor: "#F97316", ascents:  178, climbers:  89, peakId: "47d2e18b-5aed-44cd-aa4b-a5fe4cd1e98f", catalogName: "Grand Pic de la Meije", comarca: "Hautes-Alpes", osmId: "26863479" },
  { peakName: "Mont Aiguille",       mythic: true, altitudeM: 2087, flag: "🇫🇷", country: "Francia",       mountainRange: "Vercors",          lat: 44.841792, lng: 5.552223, photo: "/images/landing-montaiguille.webp",  mapImg: "/images/landing-montaiguille-map.webp",  route: "Vía normal S",                dateISO: "2024-05-30", user: "Pierre Vaucher",    userColor: "#A855F7", ascents:  534, climbers: 210, peakId: "214bd35d-03c7-4756-bdb0-82b39cd17f4b", catalogName: "Mont Aiguille", comarca: "Isère", osmId: "410304217" },
  { peakName: "Dufourspitze",        mythic: true, altitudeM: 4634, flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Peninos",    lat: 45.936924, lng: 7.866757, photo: "/images/landing-dufourspitze.webp",  mapImg: "/images/landing-dufourspitze-map.webp",  route: "Arista NE",                   dateISO: "2023-08-14", user: "Lukas Zurbuchen",   userColor: "#0E7490", ascents:  267, climbers: 118, peakId: "11eba210-68bb-4094-b61a-96be58a40a47", catalogName: "Dufourspitze", comarca: "Visp", osmId: "414760065" },
  { peakName: "Matterhorn",          mythic: true, altitudeM: 4478, flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Peninos",    lat: 45.976426, lng: 7.658602, photo: "/images/landing-matterhorn.webp",    mapImg: "/images/landing-matterhorn-map.webp",    route: "Arista Hörnli",               dateISO: "2022-07-29", user: "Matthias Hörnli",   userColor: "#EC4899", ascents:  723, climbers: 298, peakId: "cc67cbeb-5ce4-46b5-bdf6-a97a2e4e5986", catalogName: "Matterhorn", comarca: null, osmId: "26863664" },
  { peakName: "Gran Paradiso",       mythic: true, altitudeM: 4061, flag: "🇮🇹", country: "Italia",        mountainRange: "Alpes Graios",     lat: 45.517819, lng: 7.267201, photo: "/images/landing-granparadiso.webp",  mapImg: "/images/landing-granparadiso-map.webp",  route: "Vía normal",                  dateISO: "2024-08-03", user: "Giulia Rinaldi",    userColor: "#00995C", ascents:  891, climbers: 342, peakId: "4eb49694-f5a9-47dc-8150-c22a8d54a4f6", catalogName: "Gran Paradiso", comarca: null, osmId: "26863010" },
  { peakName: "Jungfrau",            mythic: true, altitudeM: 4158, flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Berneses",   lat: 46.536774, lng: 7.962591, photo: "/images/landing-jungfrau.webp",      mapImg: "/images/landing-jungfrau-map.webp",      route: "Ruta del Rottal",             dateISO: "2023-07-20", user: "Anna Albrecht",     userColor: "#F97316", ascents: 1031, climbers: 401, peakId: "b91b2e37-d58f-494b-8d05-609e55c71dd2", catalogName: "Jungfrau", comarca: "Verwaltungskreis Interlaken-Oberhasli", osmId: "1435708318" },
  { peakName: "Eiger",               mythic: true, altitudeM: 3967, flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Berneses",   lat: 46.577632, lng: 8.005469, photo: "/images/landing-eiger.webp",         mapImg: "/images/landing-eiger-map.webp",         route: "Arista O (vía normal)",       dateISO: "2023-09-16", user: "Franz Eigermann",   userColor: "#1E40AF", ascents:  156, climbers:  78, peakId: "9fdd9e2f-fbe4-46d0-8a06-fa66c163524c", catalogName: "Eiger", comarca: "Verwaltungskreis Interlaken-Oberhasli", osmId: "31664302" },
  { peakName: "Zugspitze",           mythic: true, altitudeM: 2962, flag: "🇩🇪", country: "Alemania",      mountainRange: "Alpes Bávaros",    lat: 47.421215, lng: 10.986297, photo: "/images/landing-zugspitze.webp",     mapImg: "/images/landing-zugspitze-map.webp",     route: "Vía normal SE",               dateISO: "2024-10-12", user: "Tobias Kramer",     userColor: "#A855F7", ascents: 1423, climbers: 534, peakId: "fe3922d5-df18-4e1a-82e7-527dc58465fb", catalogName: "Zugspitze", comarca: "Landkreis Garmisch-Partenkirchen", osmId: "27384190" },
  { peakName: "Watzmann",            mythic: true, altitudeM: 2713, flag: "🇩🇪", country: "Alemania",      mountainRange: "Berchtesgaden",    lat: 47.554389, lng: 12.922034, photo: "/images/landing-watzmann.webp",      mapImg: "/images/landing-watzmann-map.webp",      route: "Arista SO",                   dateISO: "2024-08-08", user: "Sepp Watzl",        userColor: "#0E7490", ascents:  612, climbers: 234, peakId: "bd5ee53c-d019-4f85-aab0-82e2f7c29983", catalogName: "Watzmann-Mittelspitze", comarca: "Landkreis Berchtesgadener Land", osmId: "364134323" },
  { peakName: "Alpspitze",           mythic: true, altitudeM: 2628, flag: "🇩🇪", country: "Alemania",      mountainRange: "Wetterstein",      lat: 47.429497, lng: 11.047812, photo: "/images/landing-alpspitze.webp",     mapImg: "/images/landing-alpspitze-map.webp",     route: "Vía normal E",                dateISO: "2024-06-25", user: "Leonhard Alper",    userColor: "#EC4899", ascents:  489, climbers: 198, peakId: "22613170-b645-4ebf-b7c7-f8e91ea3a1c4", catalogName: "Alpspitze", comarca: "Landkreis Garmisch-Partenkirchen", osmId: "259486622" },
  { peakName: "Ben Nevis",           mythic: true, altitudeM: 1345, flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Escocia",        mountainRange: "Grampian",         lat: 56.796858, lng: -5.003526, photo: "/images/landing-bennevis.webp",      mapImg: "/images/landing-bennevis-map.webp",      route: "Mountain Track",              dateISO: "2024-05-17", user: "Callum MacLeod",    userColor: "#F97316", ascents: 2134, climbers: 812, peakId: "b7937339-4e13-4b3c-bcdd-a226bb075a3e", catalogName: "Ben Nevis", comarca: "Highland", osmId: "8870212" },
  { peakName: "Scafell Pike",        mythic: true, altitudeM:  978, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "Inglaterra",     mountainRange: "Lake District",    lat: 54.454259, lng: -3.211654, photo: "/images/landing-scafellpike.webp",   mapImg: "/images/landing-scafellpike-map.webp",   route: "Ruta desde Wasdale Head",     dateISO: "2023-11-03", user: "Oliver Scaford",    userColor: "#00995C", ascents: 1876, climbers: 723, peakId: "656b0006-556d-4921-8520-5cb063db3fd3", catalogName: "Scafell Pike", comarca: "Cumberland", osmId: "29877965" },
  { peakName: "Snowdon",             mythic: true, altitudeM: 1085, flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", country: "Gales",          mountainRange: "Eryri",            lat: 53.068486, lng: -4.076232, photo: "/images/landing-snowdon.webp",       mapImg: "/images/landing-snowdon-map.webp",       route: "Llanberis Path",              dateISO: "2024-04-22", user: "Gareth Llewelyn",   userColor: "#1E40AF", ascents: 2891, climbers: 1045, peakId: "f122db7a-a352-487c-8a83-7028e902a41c", catalogName: "Yr Wyddfa", comarca: "Gwynedd", osmId: "8755297244" },
  { peakName: "Buachaille Etive Mòr",mythic: true, altitudeM: 1021, flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Escocia",        mountainRange: "Glen Coe",         lat: 56.646854, lng: -4.898763, photo: "/images/landing-buachaille.webp",    mapImg: "/images/landing-buachaille-map.webp",    route: "Vía SE por Coire na Tulaich", dateISO: "2024-06-09", user: "Ewan MacFarlane",   userColor: "#A855F7", ascents:  345, climbers: 142, peakId: "554330fc-9663-42ca-ab2b-2ab58f153daf", catalogName: "Stob Dearg", comarca: "Highland", osmId: "25453202" },
];
