import type { PeakCardData } from "@/lib/data/landing-peaks";

export type PeakLocale = "es" | "en" | "fr" | "de" | "ca";

// ─── Index page translations ──────────────────────────────────────────────────

export type PeakIndexT = {
  locale: PeakLocale;
  urlPrefix: string;
  nav_login: string;
  nav_register: string;
  meta_title: string;
  meta_desc: string;
  schema_name: string;
  schema_desc: string;
  // Hero
  hero_title: string;
  hero_subtitle: string;
  // Rarity scale
  rarity_heading: string;
  rarity_ranges: string[];   // 9 labels, one per rarity tier (low → high)
  // Mythic section
  mythic_badge: string;
  mythic_heading: string;
  mythic_body: string;
  // Catalog
  catalog_heading: string;
  catalog_count: (n: number) => string;
  // How it works
  hiw_step1_title: string;
  hiw_step1_desc: string;
  hiw_step2_title: string;
  hiw_step2_desc: string;
  hiw_step3_title: string;
  hiw_step3_desc: string;
  // CTA
  cta_heading: string;
  cta_body: string;
  cta_button: string;
  cta_micro: string;
};

const RARITY_RANGES_ES = ["< 1.000 m", "1.000 – 1.999 m", "2.000 – 2.999 m", "3.000 – 3.999 m", "4.000 – 4.999 m", "5.000 – 5.999 m", "6.000 – 6.999 m", "7.000 – 7.999 m", "≥ 8.000 m"];
const RARITY_RANGES_EN = ["< 1,000 m", "1,000 – 1,999 m", "2,000 – 2,999 m", "3,000 – 3,999 m", "4,000 – 4,999 m", "5,000 – 5,999 m", "6,000 – 6,999 m", "7,000 – 7,999 m", "≥ 8,000 m"];

const INDEX_TRANSLATIONS: Record<PeakLocale, PeakIndexT> = {
  es: {
    locale: "es",
    urlPrefix: "",
    nav_login: "Iniciar sesión",
    nav_register: "Registrarse",
    meta_title: "Cartas de cima — Colecciona cimas míticas | Peakadex",
    meta_desc: "Convierte fotos de cima en cartas coleccionables de cumbre. Rareza de montaña, logros de escalada y app de colección de picos para montañeros.",
    schema_name: "Cartas de cima Peakadex — Colecciona cimas míticas",
    schema_desc: "En Peakadex cada ascensión se convierte en una carta coleccionable con rareza según la altitud. Las cimas MYTHIC otorgan crains especiales.",
    hero_title: "Cada cima que conquistas\npasa a formar parte de tu leyenda.",
    hero_subtitle: "Haz una foto real en la cima, crea tu carta de montaña y colecciona cimas raras de todo el mundo.",
    rarity_heading: "Cuanto más alta la cima,\nmás rara la carta.",
    rarity_ranges: RARITY_RANGES_ES,
    mythic_badge: "MYTHIC",
    mythic_heading: "Algunas cimas son tan importantes que todo montañero las debería tener.",
    mythic_body: "Por eso son MYTHIC. Estas son las cartas que te otorgan puntos especiales, los crains.",
    catalog_heading: "Todas las cartas del catálogo",
    catalog_count: (n) => `${n} cimas · Ordenadas por altitud`,
    hiw_step1_title: "Llega a la cima",
    hiw_step1_desc: "Hasta arriba. En la vida real.",
    hiw_step2_title: "Haz la foto tú mismo",
    hiw_step2_desc: "Tu foto de cumbre es la prueba de tu ascensión.",
    hiw_step3_title: "Desbloquea tu carta coleccionable",
    hiw_step3_desc: "Peakadex convierte tu ascensión en una carta de cumbre permanente.",
    cta_heading: "Registra tu ascensión y consigue la tuya.",
    cta_body: "Crea tu cuenta gratis y empieza a coleccionar cartas de cumbre por cada ascensión que registres.",
    cta_button: "Empieza tu colección",
    cta_micro: "Gratis · Sin tarjeta de crédito · En 1 minuto",
  },
  en: {
    locale: "en",
    urlPrefix: "/en",
    nav_login: "Sign in",
    nav_register: "Sign up",
    meta_title: "Summit Cards — Collect Mythic Peaks | Peakadex",
    meta_desc: "Turn every summit photo into a collectible summit card. Explore the mountain rarity system, earn climbing achievements and build your peak collection.",
    schema_name: "Peakadex Summit Cards — Collect Mythic Peaks",
    schema_desc: "In Peakadex every ascent becomes a collectible card with rarity based on altitude. MYTHIC peaks award special crains.",
    hero_title: "Every summit you climb\nbecomes part of your legend.",
    hero_subtitle: "Take a real summit photo, create your Peakadex mountain card and collect peaks across the world.",
    rarity_heading: "The higher the summit,\nthe rarer the card.",
    rarity_ranges: RARITY_RANGES_EN,
    mythic_badge: "MYTHIC",
    mythic_heading: "Some peaks are so legendary every mountaineer should have them.",
    mythic_body: "That's why they're MYTHIC. These are the cards that award special points — crains.",
    catalog_heading: "All cards in the catalog",
    catalog_count: (n) => `${n} summits · Sorted by altitude`,
    hiw_step1_title: "Reach the summit",
    hiw_step1_desc: "Get to the top. In real life.",
    hiw_step2_title: "Take the photo yourself",
    hiw_step2_desc: "Your summit photo becomes the proof of your ascent.",
    hiw_step3_title: "Unlock your collectible card",
    hiw_step3_desc: "Peakadex turns your climb into a permanent summit card.",
    cta_heading: "Log your ascent and get yours.",
    cta_body: "Create your free account and start collecting summit cards for every ascent you log.",
    cta_button: "Start your collection",
    cta_micro: "Free · No credit card · 1 minute setup",
  },
  fr: {
    locale: "fr",
    urlPrefix: "/fr",
    nav_login: "Connexion",
    nav_register: "S'inscrire",
    meta_title: "Cartes de sommet — Collecte des sommets mythiques | Peakadex",
    meta_desc: "Transforme tes photos de sommet en cartes à collectionner. Système de rareté de montagne, succès d'escalade et collection de sommets.",
    schema_name: "Cartes de sommet Peakadex — Collecte des sommets mythiques",
    schema_desc: "Dans Peakadex chaque ascension devient une carte à collectionner avec une rareté basée sur l'altitude. Les sommets MYTHIC accordent des crains spéciaux.",
    hero_title: "Chaque sommet que tu graviras\nfera partie de ta légende.",
    hero_subtitle: "Prends une vraie photo au sommet, crée ta carte de montagne et collectionne des sommets rares dans le monde entier.",
    rarity_heading: "Plus le sommet est haut,\nplus la carte est rare.",
    rarity_ranges: RARITY_RANGES_ES,
    mythic_badge: "MYTHIC",
    mythic_heading: "Certains sommets sont si importants que tout alpiniste devrait les avoir.",
    mythic_body: "C'est pourquoi ils sont MYTHIC. Ce sont les cartes qui accordent des points spéciaux — les crains.",
    catalog_heading: "Toutes les cartes du catalogue",
    catalog_count: (n) => `${n} sommets · Triés par altitude`,
    hiw_step1_title: "Atteins le sommet",
    hiw_step1_desc: "Jusqu'en haut. Dans la vraie vie.",
    hiw_step2_title: "Prends la photo toi-même",
    hiw_step2_desc: "Ta photo au sommet devient la preuve de ton ascension.",
    hiw_step3_title: "Débloque ta carte à collectionner",
    hiw_step3_desc: "Peakadex transforme ton ascension en une carte de sommet permanente.",
    cta_heading: "Enregistre ton ascension et obtiens la tienne.",
    cta_body: "Crée ton compte gratuit et commence à collectionner des cartes de sommet pour chaque ascension enregistrée.",
    cta_button: "Lance ta collection",
    cta_micro: "Gratuit · Sans carte bancaire · En 1 minute",
  },
  de: {
    locale: "de",
    urlPrefix: "/de",
    nav_login: "Anmelden",
    nav_register: "Registrieren",
    meta_title: "Gipfelkarten — Sammle mythische Gipfel | Peakadex",
    meta_desc: "Verwandle Gipfelfotos in sammelbare Gipfelkarten. Bergseltenheitssystem, Kletterleistungen und Gipfelsammlung für Bergsteiger.",
    schema_name: "Peakadex Gipfelkarten — Sammle mythische Gipfel",
    schema_desc: "In Peakadex wird jede Besteigung zu einer Sammelkarte mit Seltenheit basierend auf der Höhe. MYTHIC-Gipfel verleihen besondere Crains.",
    hero_title: "Jeder Gipfel, den du bestiegst,\nwird Teil deiner Legende.",
    hero_subtitle: "Mach ein echtes Gipfelfoto, erstelle deine Bergkarte und sammle seltene Gipfel aus aller Welt.",
    rarity_heading: "Je höher der Gipfel,\ndesto seltener die Karte.",
    rarity_ranges: RARITY_RANGES_ES,
    mythic_badge: "MYTHIC",
    mythic_heading: "Einige Gipfel sind so legendär, dass jeder Bergsteiger sie haben sollte.",
    mythic_body: "Deshalb sind sie MYTHIC. Das sind die Karten, die besondere Punkte verleihen — die Crains.",
    catalog_heading: "Alle Karten im Katalog",
    catalog_count: (n) => `${n} Gipfel · Nach Höhe sortiert`,
    hiw_step1_title: "Erreiche den Gipfel",
    hiw_step1_desc: "Ganz nach oben. Im echten Leben.",
    hiw_step2_title: "Mach das Foto selbst",
    hiw_step2_desc: "Dein Gipfelfoto wird der Beweis deiner Besteigung.",
    hiw_step3_title: "Schalte deine Sammelkarte frei",
    hiw_step3_desc: "Peakadex verwandelt deine Besteigung in eine dauerhafte Gipfelkarte.",
    cta_heading: "Trag deine Besteigung ein und hol dir deine Karte.",
    cta_body: "Erstelle dein kostenloses Konto und beginne, Gipfelkarten für jede Besteigung zu sammeln.",
    cta_button: "Starte deine Sammlung",
    cta_micro: "Kostenlos · Keine Kreditkarte · In 1 Minute",
  },
  ca: {
    locale: "ca",
    urlPrefix: "/ca",
    nav_login: "Inicia sessió",
    nav_register: "Registra't",
    meta_title: "Cartes de cim — Col·lecciona cims mítiques | Peakadex",
    meta_desc: "Converteix les teves fotos de cim en cartes col·leccionables de cima. Rareses de muntanya, fites d'escalada i col·lecció de pics per a muntanyencs.",
    schema_name: "Cartes de cim Peakadex — Col·lecciona cims mítiques",
    schema_desc: "A Peakadex cada ascensió es converteix en una carta col·leccionable amb raresa basada en l'altitud. Els cims MYTHIC atorguen crains especials.",
    hero_title: "Cada cim que conquereixes\nforma part de la teva llegenda.",
    hero_subtitle: "Fes una foto real al cim, crea la teva carta de muntanya i col·lecciona cims rars de tot el món.",
    rarity_heading: "Com més alt el cim,\nmés rara la carta.",
    rarity_ranges: RARITY_RANGES_ES,
    mythic_badge: "MYTHIC",
    mythic_heading: "Alguns cims són tan importants que tot muntanyenc els hauria de tenir.",
    mythic_body: "Per això són MYTHIC. Aquestes són les cartes que t'atorguen punts especials, els crains.",
    catalog_heading: "Totes les cartes del catàleg",
    catalog_count: (n) => `${n} cims · Ordenats per altitud`,
    hiw_step1_title: "Arriba al cim",
    hiw_step1_desc: "Fins a dalt de tot. A la vida real.",
    hiw_step2_title: "Fes la foto tu mateix",
    hiw_step2_desc: "La teva foto de cim és la prova de la teva ascensió.",
    hiw_step3_title: "Desbloqueja la teva carta col·leccionable",
    hiw_step3_desc: "Peakadex converteix la teva ascensió en una carta de cim permanent.",
    cta_heading: "Registra la teva ascensió i aconsegueix la teva.",
    cta_body: "Crea el teu compte gratuït i comença a col·leccionar cartes de cim per cada ascensió que registris.",
    cta_button: "Comença la teva col·lecció",
    cta_micro: "Gratuït · Sense targeta de crèdit · En 1 minut",
  },
};

export function getPeakIndexT(locale: PeakLocale): PeakIndexT {
  return INDEX_TRANSLATIONS[locale];
}

export type PeakPageT = {
  locale: PeakLocale;
  urlPrefix: string;
  nav_login: string;
  nav_register: string;
  card_tap_hint: string;
  stat_rarity: string;
  stat_altitude: string;
  stat_reward: string;
  /** Text before the peak name in the H1 */
  h1_prefix: string;
  /** Text after the peak name in the H1 (usually empty) */
  h1_suffix: string;
  cta_capture: (peakName: string) => string;
  /** Text before peak name in the CTA section question */
  cta_q_prefix: string;
  /** Text after peak name in the CTA section question */
  cta_q_suffix: string;
  cta_body: (rarityName: string) => string;
  cta_button: string;
  cta_micro: string;
  meta_title: (peak: PeakCardData) => string;
  meta_desc: (peak: PeakCardData, rarityName: string) => string;
  schema_atlas: string;
  schema_desc: (peak: PeakCardData, rarityName: string) => string;
};

const TRANSLATIONS: Record<PeakLocale, PeakPageT> = {
  es: {
    locale: "es",
    urlPrefix: "",
    nav_login: "Iniciar sesión",
    nav_register: "Registrarse",
    card_tap_hint: "Toca para ver el reverso",
    stat_rarity: "RAREZA",
    stat_altitude: "ALTITUD",
    stat_reward: "RECOMPENSA",
    h1_prefix: "Ascensión al ",
    h1_suffix: "",
    cta_capture: (name) => `Captura ${name} →`,
    cta_q_prefix: "¿Has subido el ",
    cta_q_suffix: "?",
    cta_body: (rarity) => `Regístralo en Peakadex y consigue tu carta ${rarity}`,
    cta_button: "Empieza tu colección",
    cta_micro: "Gratis · Sin tarjeta de crédito · En 1 minuto",
    meta_title: (p) =>
      `${p.peakName} (${p.altLabel}) — Ascensión y ruta en ${p.mountainRange} | Peakadex`,
    meta_desc: (p, rarity) =>
      `${p.peakName} (${p.altLabel}) en ${p.mountainRange}. Gana tu carta coleccionable de cumbre ${rarity} y registra este logro de escalada en Peakadex — app de colección de picos.`,
    schema_atlas: "Atlas de cimas",
    schema_desc: (p, rarity) =>
      `${p.peakName} es una cima de ${p.mountainRange} (${p.country}) con ${p.altLabel} de altitud. Rareza ${rarity} en Peakadex.`,
  },
  en: {
    locale: "en",
    urlPrefix: "/en",
    nav_login: "Sign in",
    nav_register: "Sign up",
    card_tap_hint: "Tap to see the back",
    stat_rarity: "RARITY",
    stat_altitude: "ALTITUDE",
    stat_reward: "REWARD",
    h1_prefix: "Climbing ",
    h1_suffix: "",
    cta_capture: (name) => `Capture ${name} →`,
    cta_q_prefix: "Have you climbed ",
    cta_q_suffix: "?",
    cta_body: (rarity) => `Log it in Peakadex and get your ${rarity} card`,
    cta_button: "Start your collection",
    cta_micro: "Free · No credit card · 1 minute setup",
    meta_title: (p) =>
      `${p.peakName} (${p.altLabel}) — Ascent guide in ${p.mountainRange} | Peakadex`,
    meta_desc: (p, rarity) =>
      `${p.peakName} (${p.altLabel}) in ${p.mountainRange}. Earn your ${rarity} collectible summit card and log this climbing achievement on Peakadex — the peak collection app.`,
    schema_atlas: "Summit atlas",
    schema_desc: (p, rarity) =>
      `${p.peakName} is a summit in ${p.mountainRange} (${p.country}) at ${p.altLabel}. Rarity: ${rarity} on Peakadex.`,
  },
  fr: {
    locale: "fr",
    urlPrefix: "/fr",
    nav_login: "Connexion",
    nav_register: "S'inscrire",
    card_tap_hint: "Toucher pour voir le verso",
    stat_rarity: "RARETÉ",
    stat_altitude: "ALTITUDE",
    stat_reward: "RÉCOMPENSE",
    h1_prefix: "Ascension de ",
    h1_suffix: "",
    cta_capture: (name) => `Capturer ${name} →`,
    cta_q_prefix: "Tu as gravi ",
    cta_q_suffix: " ?",
    cta_body: (rarity) => `Enregistre-le sur Peakadex et obtiens ta carte ${rarity}`,
    cta_button: "Lance ta collection",
    cta_micro: "Gratuit · Sans carte bancaire · En 1 minute",
    meta_title: (p) =>
      `${p.peakName} (${p.altLabel}) — Ascension et itinéraire dans ${p.mountainRange} | Peakadex`,
    meta_desc: (p, rarity) =>
      `${p.peakName} (${p.altLabel}) dans ${p.mountainRange}. Obtiens ta carte de sommet ${rarity} à collectionner et enregistre cet exploit d'escalade sur Peakadex.`,
    schema_atlas: "Atlas des sommets",
    schema_desc: (p, rarity) =>
      `${p.peakName} est un sommet de ${p.mountainRange} (${p.country}) à ${p.altLabel}. Rareté ${rarity} sur Peakadex.`,
  },
  de: {
    locale: "de",
    urlPrefix: "/de",
    nav_login: "Anmelden",
    nav_register: "Registrieren",
    card_tap_hint: "Tippen für die Rückseite",
    stat_rarity: "SELTENHEIT",
    stat_altitude: "HÖHE",
    stat_reward: "BELOHNUNG",
    h1_prefix: "Besteigung: ",
    h1_suffix: "",
    cta_capture: (name) => `${name} erfassen →`,
    cta_q_prefix: "Hast du den ",
    cta_q_suffix: " bestiegen?",
    cta_body: (rarity) => `Trag ihn in Peakadex ein und erhalte deine ${rarity}-Karte`,
    cta_button: "Starte deine Sammlung",
    cta_micro: "Kostenlos · Keine Kreditkarte · In 1 Minute",
    meta_title: (p) =>
      `${p.peakName} (${p.altLabel}) — Aufstieg und Route in ${p.mountainRange} | Peakadex`,
    meta_desc: (p, rarity) =>
      `${p.peakName} (${p.altLabel}) in ${p.mountainRange}. Erhalte deine ${rarity}-Sammelkarte und trage diese Kletterleistung in Peakadex ein — die Gipfelsammlungs-App.`,
    schema_atlas: "Gipfelatlas",
    schema_desc: (p, rarity) =>
      `${p.peakName} ist ein Gipfel in ${p.mountainRange} (${p.country}) auf ${p.altLabel}. Seltenheit: ${rarity} auf Peakadex.`,
  },
  ca: {
    locale: "ca",
    urlPrefix: "/ca",
    nav_login: "Inicia sessió",
    nav_register: "Registra't",
    card_tap_hint: "Toca per veure el revers",
    stat_rarity: "RARESA",
    stat_altitude: "ALTITUD",
    stat_reward: "RECOMPENSA",
    h1_prefix: "Ascensió al ",
    h1_suffix: "",
    cta_capture: (name) => `Captura ${name} →`,
    cta_q_prefix: "Has pujat al ",
    cta_q_suffix: "?",
    cta_body: (rarity) => `Registra-ho a Peakadex i aconsegueix la teva carta ${rarity}`,
    cta_button: "Comença la teva col·lecció",
    cta_micro: "Gratuït · Sense targeta de crèdit · En 1 minut",
    meta_title: (p) =>
      `${p.peakName} (${p.altLabel}) — Ascensió i ruta als ${p.mountainRange} | Peakadex`,
    meta_desc: (p, rarity) =>
      `${p.peakName} (${p.altLabel}) als ${p.mountainRange}. Aconsegueix la teva carta col·leccionable de cima ${rarity} i registra aquesta fita d'escalada a Peakadex.`,
    schema_atlas: "Atles de cims",
    schema_desc: (p, rarity) =>
      `${p.peakName} és un cim de ${p.mountainRange} (${p.country}) amb ${p.altLabel} d'altitud. Raresa ${rarity} a Peakadex.`,
  },
};

export function getPeakPageT(locale: PeakLocale): PeakPageT {
  return TRANSLATIONS[locale];
}
