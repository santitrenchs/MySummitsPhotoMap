// ─── Shared peak data for landing carousel + SEO peak pages ──────────────────

export type PeakCardData = {
  peakName: string; altitudeM: number; altLabel: string;
  country: string; flag: string; mountainRange: string;
  lat: number; lng: number;
  photo?: string; mapImg: string;
  route: string; date: string;
  user: string; userColor: string;
  ascents: number; climbers: number;
  message: string;
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
  { peakName: "Aneto",               altitudeM: 3404, altLabel: "3.404 m", flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat:  42.6313, lng:   0.6560, photo: "/images/landing-aneto.webp",         mapImg: "/images/landing-aneto-map.webp",         route: "Vía del Portillón",           date: "14 ago 2024", user: "Iker Etxeberria",   userColor: "#1E40AF", ascents:  847, climbers: 312, message: "El paso del portillón con niebla y el puente de Mahoma cubierto de hielo. Cosas que no olvidarás nunca." },
  { peakName: "Monte Perdido",       altitudeM: 3355, altLabel: "3.355 m", flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat:  42.6761, lng:   0.0361, photo: "/images/landing-monteperdido.webp",  mapImg: "/images/landing-monteperdido-map.webp",  route: "Vía del Cilindro",            date: "02 sep 2023", user: "Javier Ordesa",     userColor: "#A855F7", ascents:  423, climbers: 167, message: "Subimos con los pies mojados desde el primer paso. La cima llegó justo cuando se abrió el cielo." },
  { peakName: "Posets",              altitudeM: 3375, altLabel: "3.375 m", flag: "🇪🇸", country: "España",        mountainRange: "Pirineos",         lat:  42.6500, lng:   0.4167, photo: "/images/landing-posets.webp",        mapImg: "/images/landing-posets-map.webp",        route: "Arista NO",                   date: "27 jul 2024", user: "Marta Ribagorza",   userColor: "#0E7490", ascents:  298, climbers: 128, message: "Mi primera arista técnica. Iba muerta de miedo y llegué arriba llorando de felicidad." },
  { peakName: "Pica d'Estats",       altitudeM: 3143, altLabel: "3.143 m", flag: "🇦🇩", country: "Andorra",       mountainRange: "Pirineos",         lat:  42.6642, lng:   1.3942, photo: "/images/landing-picadestats.webp",   mapImg: "/images/landing-picadestats-map.webp",   route: "Vía normal SO",               date: "11 ago 2023", user: "Oriol Casanovas",   userColor: "#00995C", ascents:  612, climbers: 241, message: "El techo de Catalunya visto desde arriba. Hay veces que una cima no necesita más explicación." },
  { peakName: "Mont Blanc",          altitudeM: 4808, altLabel: "4.808 m", flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes",            lat:  45.8326, lng:   6.8652, photo: "/images/landing-montblanc.webp",     mapImg: "/images/landing-montblanc-map.webp",     route: "Vía Goûter",                  date: "22 jul 2023", user: "Luc Moreau",        userColor: "#EC4899", ascents: 1284, climbers: 489, message: "Salida a las 2h de la mañana, frío de otro mundo y la vía láctea entera para nosotros solos." },
  { peakName: "Barre des Écrins",    altitudeM: 4102, altLabel: "4.102 m", flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes Dauphinois", lat:  44.9244, lng:   6.3567, photo: "/images/landing-ecrins.webp",        mapImg: "/images/landing-ecrins-map.webp",        route: "Arista O",                    date: "18 jul 2024", user: "Camille Durand",    userColor: "#1E40AF", ascents:  312, climbers: 124, message: "La arista oeste es puro alpinismo clásico. Tardamos más de la cuenta pero lo repetiría mañana." },
  { peakName: "La Meije",            altitudeM: 3983, altLabel: "3.983 m", flag: "🇫🇷", country: "Francia",       mountainRange: "Alpes Dauphinois", lat:  45.0072, lng:   6.4467, photo: "/images/landing-lameije.webp",       mapImg: "/images/landing-lameije-map.webp",       route: "Gran Couloir",                date: "05 ago 2022", user: "Étienne Charlet",   userColor: "#F97316", ascents:  178, climbers:  89, message: "El Gran Couloir me respetó. No me esperaba esa exposición. Una de las cimas más salvajes que he pisado." },
  { peakName: "Mont Aiguille",       altitudeM: 2087, altLabel: "2.087 m", flag: "🇫🇷", country: "Francia",       mountainRange: "Vercors",          lat:  44.8017, lng:   5.5150, photo: "/images/landing-montaiguille.webp",  mapImg: "/images/landing-montaiguille-map.webp",  route: "Vía normal S",                date: "30 may 2024", user: "Pierre Vaucher",    userColor: "#A855F7", ascents:  534, climbers: 210, message: "Dicen que fue la primera cumbre escalada de la historia. Yo solo sé que la vista desde arriba justifica todo." },
  { peakName: "Dufourspitze",        altitudeM: 4634, altLabel: "4.634 m", flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Peninos",    lat:  45.9369, lng:   7.8669, photo: "/images/landing-dufourspitze.webp",  mapImg: "/images/landing-dufourspitze-map.webp",  route: "Arista NE",                   date: "14 ago 2023", user: "Lukas Zurbuchen",   userColor: "#0E7490", ascents:  267, climbers: 118, message: "El techo de Suiza. La cresta final con viento lateral y el Monte Rosa entero debajo. Sin palabras." },
  { peakName: "Matterhorn",          altitudeM: 4478, altLabel: "4.478 m", flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Peninos",    lat:  45.9766, lng:   7.6586, photo: "/images/landing-matterhorn.webp",    mapImg: "/images/landing-matterhorn-map.webp",    route: "Arista Hörnli",               date: "29 jul 2022", user: "Matthias Hörnli",   userColor: "#EC4899", ascents:  723, climbers: 298, message: "Llevo diez años mirando esta montaña desde Zermatt. El día que subí entendí por qué me fascinaba tanto." },
  { peakName: "Gran Paradiso",       altitudeM: 4061, altLabel: "4.061 m", flag: "🇮🇹", country: "Italia",        mountainRange: "Alpes Graios",     lat:  45.5175, lng:   7.2686, photo: "/images/landing-granparadiso.webp",  mapImg: "/images/landing-granparadiso-map.webp",  route: "Vía normal",                  date: "03 ago 2024", user: "Giulia Rinaldi",    userColor: "#00995C", ascents:  891, climbers: 342, message: "Mi primer cuatro mil. Fui sola, con una guía y mil dudas. Bajé siendo otra persona." },
  { peakName: "Jungfrau",            altitudeM: 4158, altLabel: "4.158 m", flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Berneses",   lat:  46.5375, lng:   7.9622, photo: "/images/landing-jungfrau.webp",      mapImg: "/images/landing-jungfrau-map.webp",      route: "Ruta del Rottal",             date: "20 jul 2023", user: "Anna Albrecht",     userColor: "#F97316", ascents: 1031, climbers: 401, message: "Salida de noche por el Rottal con la luna llena iluminando el glaciar. Hay momentos que no se fotografían." },
  { peakName: "Eiger",               altitudeM: 3967, altLabel: "3.967 m", flag: "🇨🇭", country: "Suiza",         mountainRange: "Alpes Berneses",   lat:  46.5775, lng:   8.0050, photo: "/images/landing-eiger.webp",         mapImg: "/images/landing-eiger-map.webp",         route: "Arista O (vía normal)",       date: "16 sep 2023", user: "Franz Eigermann",   userColor: "#1E40AF", ascents:  156, climbers:  78, message: "La cara norte me miró fijamente durante todo el descenso. Algún día volvemos con más ambición." },
  { peakName: "Zugspitze",           altitudeM: 2962, altLabel: "2.962 m", flag: "🇩🇪", country: "Alemania",      mountainRange: "Alpes Bávaros",    lat:  47.4211, lng:  10.9853, photo: "/images/landing-zugspitze.webp",     mapImg: "/images/landing-zugspitze-map.webp",     route: "Vía normal SE",               date: "12 oct 2024", user: "Tobias Kramer",     userColor: "#A855F7", ascents: 1423, climbers: 534, message: "Mi abuelo la subió en 1971. Yo la subí con mi hija en 2024. Algunas tradiciones merecen repetirse." },
  { peakName: "Watzmann",            altitudeM: 2713, altLabel: "2.713 m", flag: "🇩🇪", country: "Alemania",      mountainRange: "Berchtesgaden",    lat:  47.5508, lng:  12.9444, photo: "/images/landing-watzmann.webp",      mapImg: "/images/landing-watzmann-map.webp",      route: "Arista SO",                   date: "08 ago 2024", user: "Sepp Watzl",        userColor: "#0E7490", ascents:  612, climbers: 234, message: "Tres días de lluvia antes. Al cuarto amaneció y lo dimos todo. La arista SO nos dejó sin aliento." },
  { peakName: "Alpspitze",           altitudeM: 2628, altLabel: "2.628 m", flag: "🇩🇪", country: "Alemania",      mountainRange: "Wetterstein",      lat:  47.4558, lng:  10.9986, photo: "/images/landing-alpspitze.webp",     mapImg: "/images/landing-alpspitze-map.webp",     route: "Vía normal E",                date: "25 jun 2024", user: "Leonhard Alper",    userColor: "#EC4899", ascents:  489, climbers: 198, message: "La he subido tantas veces que ya la llamo 'mi montaña'. Esta vez con nieve fresca. La mejor de todas." },
  { peakName: "Ben Nevis",           altitudeM: 1345, altLabel: "1.345 m", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Escocia",        mountainRange: "Grampian",         lat:  56.7969, lng:  -5.0035, photo: "/images/landing-bennevis.webp",      mapImg: "/images/landing-bennevis-map.webp",      route: "Mountain Track",              date: "17 may 2024", user: "Callum MacLeod",    userColor: "#F97316", ascents: 2134, climbers: 812, message: "Niebla, lluvia y viento. O sea, un día perfecto escocés. La cima apareció de repente y casi no me la creo." },
  { peakName: "Scafell Pike",        altitudeM:  978, altLabel: "978 m",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "Inglaterra",     mountainRange: "Lake District",    lat:  54.4541, lng:  -3.2114, photo: "/images/landing-scafellpike.webp",   mapImg: "/images/landing-scafellpike-map.webp",   route: "Ruta desde Wasdale Head",     date: "03 nov 2023", user: "Oliver Scaford",    userColor: "#00995C", ascents: 1876, climbers: 723, message: "El techo de Inglaterra es una roca gris bajo nubes grises. Y sin embargo no cambiaría ese día por nada." },
  { peakName: "Snowdon",             altitudeM: 1085, altLabel: "1.085 m", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", country: "Gales",          mountainRange: "Eryri",            lat:  53.0685, lng:  -4.0762, photo: "/images/landing-snowdon.webp",       mapImg: "/images/landing-snowdon-map.webp",       route: "Llanberis Path",              date: "22 abr 2024", user: "Gareth Llewelyn",   userColor: "#1E40AF", ascents: 2891, climbers: 1045, message: "Yr Wyddfa en galés. Lo subí cantando una canción que me enseñó mi padre de pequeño. Buen día." },
  { peakName: "Buachaille Etive Mòr",altitudeM: 1021, altLabel: "1.021 m", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Escocia",        mountainRange: "Glen Coe",         lat:  56.6735, lng:  -4.9586, photo: "/images/landing-buachaille.webp",    mapImg: "/images/landing-buachaille-map.webp",    route: "Vía SE por Coire na Tulaich", date: "09 jun 2024", user: "Ewan MacFarlane",   userColor: "#A855F7", ascents:  345, climbers: 142, message: "La montaña más fotografiada de Escocia. Verla desde abajo es una cosa. Verla desde arriba es otra." },
];
