// ─── Which challenges each SEO peak page belongs to ───────────────────────────
//
// The landing peaks are hardcoded by name and have no `Peak.id`, so they cannot
// ask the database which challenges contain them. Until they carry an id, the
// mapping lives here, keyed by the peak's slug (`slugifyPeak`).
//
// Audited against PRODUCTION on 2026-09-18: 14 of the 20 landing peaks are in a
// challenge. Only Pica d'Estats is wired up so far — it is the one peak that is
// in two, so it exercises both layouts before the rest are filled in.
//
// ⚠️ `Challenge.name` and `Challenge.description` exist only in Spanish in the
// database, so the translations below are maintained here. When challenges get
// per-locale columns, this file becomes the fallback, not the source.

import type { PeakLocale } from "@/lib/i18n/peaks";

/** All five locales required: a challenge added without translations won't compile. */
type Localized = Record<PeakLocale, string>;

export type PeakChallenge = {
  /** `Challenge.slug` in production — the join key when this moves to the DB. */
  slug: string;
  name: Localized;
  /** One sentence, from `Challenge.description`. */
  description: Localized;
  /** `Challenge.coverUrl` — the patch. Rendered `contain`, never circle-clipped. */
  coverUrl: string;
  /** How many peaks the challenge holds, from `challenge_peaks`. */
  peakCount: number;
};

// "Els 100 Cims" keeps its Catalan name in every language: that is what the FEEC
// calls the challenge, the same way "Atlas" stays "Atlas" across the app.
const ELS_100_CIMS: PeakChallenge = {
  slug: "els-100-cims",
  name: {
    es: "Els 100 Cims",
    ca: "Els 100 Cims",
    en: "Els 100 Cims",
    fr: "Els 100 Cims",
    de: "Els 100 Cims",
  },
  description: {
    es: "Las 150 cimas esenciales del reto de la FEEC.",
    ca: "Els 150 cims essencials del repte de la FEEC.",
    en: "The 150 essential summits of the FEEC challenge.",
    fr: "Les 150 sommets essentiels du défi de la FEEC.",
    de: "Die 150 essenziellen Gipfel der FEEC-Challenge.",
  },
  coverUrl: "https://media.peakadex.com/challenges/cims100feec.jpg?v=1789503268928",
  peakCount: 150,
};

const ELS_3000_DEL_PIRINEU: PeakChallenge = {
  slug: "els-3000-del-pirineu",
  name: {
    es: "Los 3000 de los Pirineos",
    ca: "Els 3000 del Pirineu",
    en: "The 3000ers of the Pyrenees",
    fr: "Les 3000 des Pyrénées",
    de: "Die Dreitausender der Pyrenäen",
  },
  description: {
    es: "Las 212 cumbres de más de 3.000 m del Pirineo.",
    ca: "Els 212 cims de més de 3.000 m del Pirineu.",
    en: "The 212 summits above 3,000 m in the Pyrenees.",
    fr: "Les 212 sommets de plus de 3 000 m des Pyrénées.",
    de: "Die 212 Gipfel über 3.000 m in den Pyrenäen.",
  },
  coverUrl: "https://media.peakadex.com/challenges/tresmils3000.jpg?v=1789503288888",
  peakCount: 212,
};

const ELS_4000_DELS_ALPS: PeakChallenge = {
  slug: "els-4000-dels-alps",
  name: {
    es: "Los 4000 de los Alpes",
    ca: "Els 4000 dels Alps",
    en: "The 4000ers of the Alps",
    fr: "Les 4000 des Alpes",
    de: "Viertausender der Alpen",
  },
  description: {
    es: "Las 82 cimas de más de 4.000 m de los Alpes, según la lista oficial de la UIAA.",
    ca: "Els 82 cims de més de 4.000 m dels Alps, segons la llista oficial de la UIAA.",
    en: "The 82 summits above 4,000 m in the Alps, on the official UIAA list.",
    fr: "Les 82 sommets de plus de 4 000 m des Alpes, selon la liste officielle de l'UIAA.",
    de: "Die 82 Gipfel über 4.000 m in den Alpen nach der offiziellen UIAA-Liste.",
  },
  coverUrl: "https://media.peakadex.com/challenges/alps4000uiaa.jpg?v=1789503307345",
  peakCount: 82,
};

const ELS_16_SUMMITS_ALEMANYA: PeakChallenge = {
  slug: "els-16-summits-alemanya",
  name: {
    es: "Los 16 Summits de Alemania",
    ca: "Els 16 Summits d'Alemanya",
    en: "The 16 Summits of Germany",
    fr: "Les 16 Summits d'Allemagne",
    de: "Die 16 Summits Deutschlands",
  },
  description: {
    es: "La cima más alta de cada uno de los 16 estados federados alemanes.",
    ca: "El cim més alt de cadascun dels 16 estats federats alemanys.",
    en: "The highest point of each of Germany's 16 federal states.",
    fr: "Le point culminant de chacun des 16 Länder allemands.",
    de: "Der höchste Punkt jedes der 16 deutschen Bundesländer.",
  },
  coverUrl: "https://media.peakadex.com/challenges/summits16de.jpg?v=1789503378424",
  peakCount: 16,
};

const ELS_MUNROS_ESCOCIA: PeakChallenge = {
  slug: "els-munros-escocia",
  name: {
    es: "Los Munros de Escocia",
    ca: "Els Munros d'Escòcia",
    en: "The Munros of Scotland",
    fr: "Les Munros d'Écosse",
    de: "Die Munros Schottlands",
  },
  description: {
    es: "Las 282 cimas de Escocia de más de 3.000 pies, según la lista del Scottish Mountaineering Club.",
    ca: "Els 282 cims d'Escòcia de més de 3.000 peus, segons la llista del Scottish Mountaineering Club.",
    en: "Scotland's 282 summits above 3,000 feet, on the Scottish Mountaineering Club list.",
    fr: "Les 282 sommets d'Écosse de plus de 3 000 pieds, selon la liste du Scottish Mountaineering Club.",
    de: "Die 282 Gipfel Schottlands über 3.000 Fuß nach der Liste des Scottish Mountaineering Club.",
  },
  coverUrl: "https://media.peakadex.com/challenges/munros282.jpg?v=1789503231785",
  peakCount: 282,
};

const ELS_WAINWRIGHTS: PeakChallenge = {
  slug: "els-wainwrights-lake-district",
  name: {
    es: "Los Wainwrights del Lake District",
    ca: "Els Wainwrights del Lake District",
    en: "The Wainwrights of the Lake District",
    fr: "Les Wainwrights du Lake District",
    de: "Die Wainwrights im Lake District",
  },
  description: {
    es: "Los 214 fells del Lake District de las guías ilustradas de Alfred Wainwright.",
    ca: "Els 214 fells del Lake District de les guies il·lustrades d'Alfred Wainwright.",
    en: "The 214 Lake District fells from Alfred Wainwright's illustrated guides.",
    fr: "Les 214 fells du Lake District des guides illustrés d'Alfred Wainwright.",
    de: "Die 214 Fells im Lake District aus Alfred Wainwrights illustrierten Führern.",
  },
  coverUrl: "https://media.peakadex.com/challenges/wainwrights214.jpg?v=1789502286369",
  peakCount: 214,
};

// Audited against production 2026-09-18: these 14 of the 20 landing peaks are in
// a challenge. The other six (La Meije, Mont Aiguille, Eiger, Watzmann,
// Alpspitze, Snowdon) are in none — each for a reason, not by oversight:
// La Meije and the Eiger fall just short of 4.000 m, Watzmann and Alpspitze are
// not their federal state's highest, and there is no Welsh or Vercors list.
const CHALLENGES: Record<string, PeakChallenge[]> = {
  "aneto": [ELS_3000_DEL_PIRINEU],
  "monte-perdido": [ELS_3000_DEL_PIRINEU],
  "posets": [ELS_3000_DEL_PIRINEU],
  "pica-destats": [ELS_100_CIMS, ELS_3000_DEL_PIRINEU],
  "mont-blanc": [ELS_4000_DELS_ALPS],
  "barre-des-ecrins": [ELS_4000_DELS_ALPS],
  "dufourspitze": [ELS_4000_DELS_ALPS],
  "matterhorn": [ELS_4000_DELS_ALPS],
  "gran-paradiso": [ELS_4000_DELS_ALPS],
  "jungfrau": [ELS_4000_DELS_ALPS],
  "zugspitze": [ELS_16_SUMMITS_ALEMANYA],
  "ben-nevis": [ELS_MUNROS_ESCOCIA],
  "scafell-pike": [ELS_WAINWRIGHTS],
  "buachaille-etive-mor": [ELS_MUNROS_ESCOCIA],
};

/** The challenges this peak belongs to; empty when it is in none (or not mapped yet). */
export function getPeakChallenges(slug: string): PeakChallenge[] {
  return CHALLENGES[slug] ?? [];
}
