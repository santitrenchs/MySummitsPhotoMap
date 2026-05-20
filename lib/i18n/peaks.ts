import type { PeakCardData } from "@/lib/data/landing-peaks";

export type PeakLocale = "es" | "en" | "fr" | "de" | "ca";

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
      `El ${p.peakName} es una cima de ${p.mountainRange} con ${p.altLabel} de altitud y rareza ${rarity}. ${p.ascents} ascensiones registradas en Peakadex. ¿Has subido el ${p.peakName}?`,
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
      `${p.peakName} is a summit in ${p.mountainRange} at ${p.altLabel}. Rarity: ${rarity}. ${p.ascents} ascents logged in Peakadex. Have you climbed ${p.peakName}?`,
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
      `${p.peakName} est un sommet de ${p.mountainRange} à ${p.altLabel} d'altitude. Rareté : ${rarity}. ${p.ascents} ascensions enregistrées sur Peakadex. Tu as gravi ${p.peakName} ?`,
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
      `${p.peakName} ist ein Gipfel in ${p.mountainRange} auf ${p.altLabel}. Seltenheit: ${rarity}. ${p.ascents} Besteigungen in Peakadex erfasst. Hast du den ${p.peakName} bestiegen?`,
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
      `El ${p.peakName} és un cim de ${p.mountainRange} amb ${p.altLabel} d'altitud i raresa ${rarity}. ${p.ascents} ascensions registrades a Peakadex. Has pujat al ${p.peakName}?`,
    schema_atlas: "Atles de cims",
    schema_desc: (p, rarity) =>
      `${p.peakName} és un cim de ${p.mountainRange} (${p.country}) amb ${p.altLabel} d'altitud. Raresa ${rarity} a Peakadex.`,
  },
};

export function getPeakPageT(locale: PeakLocale): PeakPageT {
  return TRANSLATIONS[locale];
}
