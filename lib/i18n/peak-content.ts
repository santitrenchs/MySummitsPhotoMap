// ─── Localized content for the SEO peak pages ─────────────────────────────────
//
// `lib/data/landing-peaks.ts` holds the locale-neutral facts (coordinates,
// altitude, photo, ISO date). Everything a reader actually reads in their own
// language lives here:
//
//   · PEAK_MESSAGES  — the demo card comments, one entry per peak slug
//   · PLACE_NAMES    — countries and mountain ranges, keyed by their Spanish name
//   · CARD_LABELS    — the labels painted on the card itself + the demo disclaimer
//
// ⚠️ The cards on these pages are illustrative: the climbers, the comments and
// the ascent/climber counts are invented. `CARD_LABELS[locale].disclaimer` is
// what tells the reader so, and it must stay visible on every page that renders
// them (peak detail + `/peaks` index).

import { slugifyPeak, type PeakCardData } from "@/lib/data/landing-peaks";
import type { PeakLocale } from "@/lib/i18n/peaks";

// ─── Demo comments ────────────────────────────────────────────────────────────
// Keyed by peak slug so a rename of the peak name surfaces as a missing message
// instead of silently shifting every translation by one position.

type MessageMap = Record<string, string>;

const MESSAGES_ES: MessageMap = {
  "aneto": "El paso del portillón con niebla y el puente de Mahoma cubierto de hielo. Cosas que no olvidarás nunca.",
  "monte-perdido": "Subimos con los pies mojados desde el primer paso. La cima llegó justo cuando se abrió el cielo.",
  "posets": "Mi primera arista técnica. Iba muerta de miedo y llegué arriba llorando de felicidad.",
  "pica-destats": "El techo de Catalunya visto desde arriba. Hay veces que una cima no necesita más explicación.",
  "mont-blanc": "Salida a las 2h de la mañana, frío de otro mundo y la vía láctea entera para nosotros solos.",
  "barre-des-ecrins": "La arista oeste es puro alpinismo clásico. Tardamos más de la cuenta pero lo repetiría mañana.",
  "la-meije": "El Gran Couloir me respetó. No me esperaba esa exposición. Una de las cimas más salvajes que he pisado.",
  "mont-aiguille": "Dicen que fue la primera cumbre escalada de la historia. Yo solo sé que la vista desde arriba justifica todo.",
  "dufourspitze": "El techo de Suiza. La cresta final con viento lateral y el Monte Rosa entero debajo. Sin palabras.",
  "matterhorn": "Llevo diez años mirando esta montaña desde Zermatt. El día que subí entendí por qué me fascinaba tanto.",
  "gran-paradiso": "Mi primer cuatro mil. Fui sola, con una guía y mil dudas. Bajé siendo otra persona.",
  "jungfrau": "Salida de noche por el Rottal con la luna llena iluminando el glaciar. Hay momentos que no se fotografían.",
  "eiger": "La cara norte me miró fijamente durante todo el descenso. Algún día volvemos con más ambición.",
  "zugspitze": "Mi abuelo la subió en 1971. Yo la subí con mi hija en 2024. Algunas tradiciones merecen repetirse.",
  "watzmann": "Tres días de lluvia antes. Al cuarto amaneció y lo dimos todo. La arista SO nos dejó sin aliento.",
  "alpspitze": "La he subido tantas veces que ya la llamo 'mi montaña'. Esta vez con nieve fresca. La mejor de todas.",
  "ben-nevis": "Niebla, lluvia y viento. O sea, un día perfecto escocés. La cima apareció de repente y casi no me la creo.",
  "scafell-pike": "El techo de Inglaterra es una roca gris bajo nubes grises. Y sin embargo no cambiaría ese día por nada.",
  "snowdon": "Yr Wyddfa en galés. Lo subí cantando una canción que me enseñó mi padre de pequeño. Buen día.",
  "buachaille-etive-mor": "La montaña más fotografiada de Escocia. Verla desde abajo es una cosa. Verla desde arriba es otra.",
};

const MESSAGES_EN: MessageMap = {
  "aneto": "The Portillón pass in thick fog and the Puente de Mahoma sheathed in ice. The kind of thing you never forget.",
  "monte-perdido": "Wet boots from the very first crossing. The summit arrived exactly as the sky opened up.",
  "posets": "My first technical ridge. I was terrified the whole way and reached the top crying with joy.",
  "pica-destats": "The roof of Catalonia, seen from above. Some summits need no further explanation.",
  "mont-blanc": "A 2 a.m. start, cold like nothing on earth and the whole Milky Way to ourselves.",
  "barre-des-ecrins": "The west ridge is classic alpinism at its purest. We took far longer than planned and I'd do it again tomorrow.",
  "la-meije": "The Grand Couloir humbled me. I wasn't ready for that exposure. One of the wildest summits I've ever stood on.",
  "mont-aiguille": "They say it was the first mountain ever climbed. All I know is the view from up there justifies everything.",
  "dufourspitze": "The roof of Switzerland. The final crest with a crosswind and the whole Monte Rosa below. No words.",
  "matterhorn": "I'd spent ten years looking at this mountain from Zermatt. The day I climbed it I understood the obsession.",
  "gran-paradiso": "My first four-thousander. I went alone, with a guide and a thousand doubts. I came down a different person.",
  "jungfrau": "A night start up the Rottal with a full moon lighting the glacier. Some moments can't be photographed.",
  "eiger": "The north face stared at me the entire way down. One day we'll come back with more ambition.",
  "zugspitze": "My grandfather climbed it in 1971. I climbed it with my daughter in 2024. Some traditions are worth repeating.",
  "watzmann": "Three days of rain beforehand. On the fourth it cleared and we gave it everything. The SW ridge left us breathless.",
  "alpspitze": "I've climbed it so often I call it 'my mountain'. This time with fresh snow. The best one yet.",
  "ben-nevis": "Fog, rain and wind — a perfect Scottish day, in other words. The summit appeared out of nowhere and I barely believed it.",
  "scafell-pike": "The roof of England is grey rock under grey cloud. And still I wouldn't trade that day for anything.",
  "snowdon": "Yr Wyddfa in Welsh. I climbed it singing a song my father taught me as a boy. A good day.",
  "buachaille-etive-mor": "The most photographed mountain in Scotland. Seeing it from below is one thing. Seeing it from above is another.",
};

const MESSAGES_FR: MessageMap = {
  "aneto": "Le passage du Portillón dans le brouillard et le Pont de Mahoma couvert de glace. On n'oublie jamais ça.",
  "monte-perdido": "Les pieds trempés dès le premier passage. Le sommet est arrivé pile quand le ciel s'est ouvert.",
  "posets": "Ma première arête technique. J'ai eu peur tout du long et je suis arrivée en haut en pleurant de joie.",
  "pica-destats": "Le toit de la Catalogne, vu d'en haut. Il y a des sommets qui n'ont besoin d'aucune explication.",
  "mont-blanc": "Départ à 2h du matin, un froid d'un autre monde et la Voie lactée entière rien que pour nous.",
  "barre-des-ecrins": "L'arête ouest, c'est de l'alpinisme classique à l'état pur. On a mis bien plus longtemps que prévu et je recommencerais demain.",
  "la-meije": "Le Grand Couloir m'a remis à ma place. Je ne m'attendais pas à cette exposition. L'un des sommets les plus sauvages que j'aie foulés.",
  "mont-aiguille": "On dit que ce fut la première cime gravie de l'histoire. Moi je sais juste que la vue de là-haut justifie tout.",
  "dufourspitze": "Le toit de la Suisse. La crête finale avec le vent de travers et tout le Mont Rose en dessous. Sans mots.",
  "matterhorn": "Ça fait dix ans que je regarde cette montagne depuis Zermatt. Le jour où je l'ai gravie, j'ai compris ma fascination.",
  "gran-paradiso": "Mon premier quatre mille. J'y suis allée seule, avec une guide et mille doutes. Je suis redescendue quelqu'un d'autre.",
  "jungfrau": "Départ de nuit par le Rottal, la pleine lune éclairant le glacier. Certains moments ne se photographient pas.",
  "eiger": "La face nord m'a fixé pendant toute la descente. Un jour on revient avec plus d'ambition.",
  "zugspitze": "Mon grand-père l'a gravie en 1971. Je l'ai gravie avec ma fille en 2024. Certaines traditions méritent d'être répétées.",
  "watzmann": "Trois jours de pluie avant. Le quatrième s'est levé et on a tout donné. L'arête SO nous a coupé le souffle.",
  "alpspitze": "Je l'ai gravie tellement de fois que je l'appelle « ma montagne ». Cette fois avec de la neige fraîche. La plus belle de toutes.",
  "ben-nevis": "Brouillard, pluie et vent. Autrement dit, une journée écossaise parfaite. Le sommet est apparu d'un coup et j'y ai à peine cru.",
  "scafell-pike": "Le toit de l'Angleterre, c'est du rocher gris sous des nuages gris. Et pourtant je n'échangerais ce jour-là pour rien.",
  "snowdon": "Yr Wyddfa en gallois. Je l'ai gravie en chantant une chanson que mon père m'a apprise enfant. Belle journée.",
  "buachaille-etive-mor": "La montagne la plus photographiée d'Écosse. La voir d'en bas est une chose. La voir d'en haut en est une autre.",
};

const MESSAGES_DE: MessageMap = {
  "aneto": "Der Portillón-Übergang im Nebel und die Mohammedbrücke voller Eis. So etwas vergisst man nie.",
  "monte-perdido": "Nasse Füße schon ab der ersten Querung. Der Gipfel kam genau in dem Moment, als der Himmel aufriss.",
  "posets": "Mein erster technischer Grat. Ich hatte die ganze Zeit Todesangst und stand oben mit Freudentränen.",
  "pica-destats": "Das Dach Kataloniens, von oben gesehen. Manche Gipfel brauchen keine weitere Erklärung.",
  "mont-blanc": "Aufbruch um 2 Uhr nachts, eine Kälte aus einer anderen Welt und die ganze Milchstraße für uns allein.",
  "barre-des-ecrins": "Der Westgrat ist klassischer Alpinismus in Reinform. Wir haben viel länger gebraucht als geplant und ich würde es morgen wieder tun.",
  "la-meije": "Das Grand Couloir hat mich klein gemacht. Mit dieser Ausgesetztheit hatte ich nicht gerechnet. Einer der wildesten Gipfel, auf denen ich je stand.",
  "mont-aiguille": "Es soll der erste bestiegene Gipfel der Geschichte sein. Ich weiß nur, dass die Aussicht von oben alles rechtfertigt.",
  "dufourspitze": "Das Dach der Schweiz. Der Schlussgrat mit Seitenwind und das ganze Monte-Rosa-Massiv darunter. Sprachlos.",
  "matterhorn": "Zehn Jahre lang habe ich diesen Berg von Zermatt aus angeschaut. An dem Tag, an dem ich oben stand, verstand ich die Faszination.",
  "gran-paradiso": "Mein erster Viertausender. Allein unterwegs, mit einer Bergführerin und tausend Zweifeln. Runter kam ein anderer Mensch.",
  "jungfrau": "Nachtaufbruch durchs Rottal, der Vollmond auf dem Gletscher. Manche Momente lassen sich nicht fotografieren.",
  "eiger": "Die Nordwand hat mich den ganzen Abstieg lang angestarrt. Irgendwann kommen wir mit mehr Ehrgeiz zurück.",
  "zugspitze": "Mein Großvater stand 1971 oben. Ich stand 2024 mit meiner Tochter oben. Manche Traditionen lohnt es zu wiederholen.",
  "watzmann": "Vorher drei Tage Regen. Am vierten klarte es auf und wir gaben alles. Der SW-Grat hat uns den Atem geraubt.",
  "alpspitze": "Ich war so oft oben, dass ich sie schon „meinen Berg“ nenne. Diesmal mit Neuschnee. Die schönste Tour von allen.",
  "ben-nevis": "Nebel, Regen und Wind. Also ein perfekter schottischer Tag. Der Gipfel tauchte plötzlich auf und ich konnte es kaum glauben.",
  "scafell-pike": "Das Dach Englands ist grauer Fels unter grauen Wolken. Und trotzdem würde ich diesen Tag gegen nichts eintauschen.",
  "snowdon": "Yr Wyddfa auf Walisisch. Ich bin singend hinauf, mit einem Lied, das mir mein Vater als Kind beibrachte. Ein guter Tag.",
  "buachaille-etive-mor": "Der meistfotografierte Berg Schottlands. Ihn von unten zu sehen ist das eine. Ihn von oben zu sehen etwas ganz anderes.",
};

const MESSAGES_CA: MessageMap = {
  "aneto": "El pas del portilló amb boira i el pont de Mahoma cobert de gel. Coses que no oblidaràs mai.",
  "monte-perdido": "Vam pujar amb els peus xops des del primer pas. El cim va arribar just quan es va obrir el cel.",
  "posets": "La meva primera aresta tècnica. Hi anava morta de por i vaig arribar a dalt plorant de felicitat.",
  "pica-destats": "El sostre de Catalunya vist des de dalt. Hi ha vegades que un cim no necessita més explicació.",
  "mont-blanc": "Sortida a les 2h de la matinada, un fred d'un altre món i tota la via làctia per a nosaltres sols.",
  "barre-des-ecrins": "L'aresta oest és alpinisme clàssic pur. Hi vam trigar més del compte però ho repetiria demà.",
  "la-meije": "El Gran Couloir em va fer respecte. No m'esperava aquella exposició. Un dels cims més salvatges que he trepitjat.",
  "mont-aiguille": "Diuen que va ser el primer cim escalat de la història. Jo només sé que la vista des de dalt ho justifica tot.",
  "dufourspitze": "El sostre de Suïssa. La cresta final amb vent lateral i tot el Monte Rosa a sota. Sense paraules.",
  "matterhorn": "Fa deu anys que miro aquesta muntanya des de Zermatt. El dia que hi vaig pujar vaig entendre per què em fascinava tant.",
  "gran-paradiso": "El meu primer quatre mil. Hi vaig anar sola, amb una guia i mil dubtes. Vaig baixar sent una altra persona.",
  "jungfrau": "Sortida de nit pel Rottal amb la lluna plena il·luminant la glacera. Hi ha moments que no es fotografien.",
  "eiger": "La cara nord em va mirar fixament durant tot el descens. Algun dia hi tornem amb més ambició.",
  "zugspitze": "El meu avi hi va pujar el 1971. Jo hi vaig pujar amb la meva filla el 2024. Algunes tradicions mereixen repetir-se.",
  "watzmann": "Tres dies de pluja abans. Al quart va sortir el sol i ho vam donar tot. L'aresta SO ens va deixar sense alè.",
  "alpspitze": "Hi he pujat tantes vegades que ja l'anomeno «la meva muntanya». Aquest cop amb neu fresca. La millor de totes.",
  "ben-nevis": "Boira, pluja i vent. És a dir, un dia perfecte escocès. El cim va aparèixer de sobte i gairebé no m'ho creia.",
  "scafell-pike": "El sostre d'Anglaterra és una roca grisa sota núvols grisos. I tot i així no canviaria aquell dia per res.",
  "snowdon": "Yr Wyddfa en gal·lès. Hi vaig pujar cantant una cançó que em va ensenyar el meu pare de petit. Bon dia.",
  "buachaille-etive-mor": "La muntanya més fotografiada d'Escòcia. Veure-la des de baix és una cosa. Veure-la des de dalt és una altra.",
};

const PEAK_MESSAGES: Record<PeakLocale, MessageMap> = {
  es: MESSAGES_ES,
  en: MESSAGES_EN,
  fr: MESSAGES_FR,
  de: MESSAGES_DE,
  ca: MESSAGES_CA,
};

/** Demo comment for a peak, falling back to Spanish if a translation is missing. */
export function getPeakMessage(peakName: string, locale: PeakLocale): string {
  const slug = slugifyPeak(peakName);
  return PEAK_MESSAGES[locale][slug] ?? MESSAGES_ES[slug] ?? "";
}

// ─── Countries and mountain ranges ────────────────────────────────────────────
// Keyed by the Spanish value stored in `landing-peaks.ts`. A name that is the
// same in every language (Vercors, Wetterstein, Glen Coe…) simply has no entry.

const PLACE_NAMES: Record<string, Partial<Record<PeakLocale, string>>> = {
  // Countries
  "España":     { en: "Spain",       fr: "Espagne",        de: "Spanien",     ca: "Espanya" },
  "Andorra":    { en: "Andorra",     fr: "Andorre",        de: "Andorra",     ca: "Andorra" },
  "Francia":    { en: "France",      fr: "France",         de: "Frankreich",  ca: "França" },
  "Suiza":      { en: "Switzerland", fr: "Suisse",         de: "Schweiz",     ca: "Suïssa" },
  "Italia":     { en: "Italy",       fr: "Italie",         de: "Italien",     ca: "Itàlia" },
  "Alemania":   { en: "Germany",     fr: "Allemagne",      de: "Deutschland", ca: "Alemanya" },
  "Escocia":    { en: "Scotland",    fr: "Écosse",         de: "Schottland",  ca: "Escòcia" },
  "Inglaterra": { en: "England",     fr: "Angleterre",     de: "England",     ca: "Anglaterra" },
  "Gales":      { en: "Wales",       fr: "Pays de Galles", de: "Wales",       ca: "Gal·les" },

  // Mountain ranges
  "Pirineos":         { en: "Pyrenees",         fr: "Pyrénées",               de: "Pyrenäen",              ca: "Pirineus" },
  "Alpes":            { en: "Alps",             fr: "Alpes",                  de: "Alpen",                 ca: "Alps" },
  "Alpes Dauphinois": { en: "Dauphiné Alps",    fr: "Alpes du Dauphiné",      de: "Dauphiné-Alpen",        ca: "Alps del Dauphiné" },
  "Alpes Peninos":    { en: "Pennine Alps",     fr: "Alpes pennines",         de: "Walliser Alpen",        ca: "Alps Penins" },
  "Alpes Graios":     { en: "Graian Alps",      fr: "Alpes grées",            de: "Grajische Alpen",       ca: "Alps Grais" },
  "Alpes Berneses":   { en: "Bernese Alps",     fr: "Alpes bernoises",        de: "Berner Alpen",          ca: "Alps Bernesos" },
  "Alpes Bávaros":    { en: "Bavarian Alps",    fr: "Alpes bavaroises",       de: "Bayerische Alpen",      ca: "Alps Bavaresos" },
  "Berchtesgaden":    { en: "Berchtesgaden Alps", fr: "Alpes de Berchtesgaden", de: "Berchtesgadener Alpen", ca: "Alps de Berchtesgaden" },
  "Grampian":         { en: "Grampians",        fr: "Grampians",              de: "Grampian Mountains",    ca: "Grampians" },
};

/** The per-locale forms of a place, or undefined when it needs no translation. */
export function getPlaceTranslations(esName: string) {
  return PLACE_NAMES[esName];
}

/** Country / mountain-range name in the reader's language. */
export function translatePlace(esName: string, locale: PeakLocale): string {
  if (locale === "es") return esName;
  return PLACE_NAMES[esName]?.[locale] ?? esName;
}

// ─── Dates and numbers ────────────────────────────────────────────────────────

/** "2024-08-14" → "14 ago 2024" / "Aug 14, 2024" / "14. Aug. 2024" … */
export function formatPeakDate(iso: string, locale: PeakLocale): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatPeakNumber(n: number, locale: PeakLocale): string {
  // `useGrouping: "always"` because Spanish and German CLDR leave four-digit
  // numbers ungrouped ("4808 m"), and these pages have always written the
  // thousands separator ("4.808 m").
  return n.toLocaleString(locale, { useGrouping: "always" });
}

/** "4.808 m" in es/de, "4,808 m" in en, "4 808 m" in fr… */
export function formatAltitude(m: number, locale: PeakLocale): string {
  return `${formatPeakNumber(m, locale)} m`;
}

// ─── Card labels + demo disclaimer ────────────────────────────────────────────
// Plain strings only: `PeakCard` is a client component, so whatever reaches it
// has to be RSC-serializable (no functions — see CLAUDE.md).

export type PeakCardLabels = {
  rarity: string;
  altitude: string;
  reward: string;
  ep: string;
  stats: string;
  ascents: string;
  climbers: string;
  flipHint: string;
  /** Says out loud that the cards, comments and figures are made up. */
  disclaimer: string;
};

const CARD_LABELS: Record<PeakLocale, PeakCardLabels> = {
  es: {
    rarity: "RAREZA", altitude: "ALTITUD", reward: "RECOMPENSA", ep: "EP",
    stats: "ESTADÍSTICAS", ascents: "ASCENSIONES", climbers: "ALPINISTAS",
    flipHint: "Toca para ver el reverso",
    disclaimer: "Ejemplo ilustrativo: las cartas, los comentarios y las cifras de esta página son ficticios.",
  },
  en: {
    rarity: "RARITY", altitude: "ALTITUDE", reward: "REWARD", ep: "EP",
    stats: "STATS", ascents: "ASCENTS", climbers: "CLIMBERS",
    flipHint: "Tap to see the back",
    disclaimer: "Illustrative example: the cards, comments and figures on this page are fictional.",
  },
  fr: {
    rarity: "RARETÉ", altitude: "ALTITUDE", reward: "RÉCOMPENSE", ep: "EP",
    stats: "STATISTIQUES", ascents: "ASCENSIONS", climbers: "ALPINISTES",
    flipHint: "Toucher pour voir le verso",
    disclaimer: "Exemple illustratif : les cartes, les commentaires et les chiffres de cette page sont fictifs.",
  },
  de: {
    rarity: "SELTENHEIT", altitude: "HÖHE", reward: "BELOHNUNG", ep: "EP",
    stats: "STATISTIKEN", ascents: "BESTEIGUNGEN", climbers: "BERGSTEIGER",
    flipHint: "Tippen für die Rückseite",
    disclaimer: "Illustratives Beispiel: Karten, Kommentare und Zahlen auf dieser Seite sind fiktiv.",
  },
  ca: {
    rarity: "RARESA", altitude: "ALTITUD", reward: "RECOMPENSA", ep: "EP",
    stats: "ESTADÍSTIQUES", ascents: "ASCENSIONS", climbers: "ALPINISTES",
    flipHint: "Toca per veure el revers",
    disclaimer: "Exemple il·lustratiu: les cartes, els comentaris i les xifres d'aquesta pàgina són ficticis.",
  },
};

export function getPeakCardLabels(locale: PeakLocale): PeakCardLabels {
  return CARD_LABELS[locale];
}

/** Highest point on earth — the reference for the card's altitude bar. */
const EVEREST_M = 8849;

/**
 * Every string a card prints, localized and formatted, ready to hand to the
 * client `PeakCard` / mini-card. Structurally matches `PeakCardStrings`.
 */
export function buildPeakCardStrings(peak: PeakCardData, locale: PeakLocale) {
  return {
    ...getPeakCardLabels(locale),
    altLabel: formatAltitude(peak.altitudeM, locale),
    dateLabel: formatPeakDate(peak.dateISO, locale),
    message: getPeakMessage(peak.peakName, locale),
    rangeLabel: peak.mountainRange ? translatePlace(peak.mountainRange, locale) : "",
    ascentsLabel: formatPeakNumber(peak.ascents, locale),
    climbersLabel: formatPeakNumber(peak.climbers, locale),
    maxAltLabel: formatAltitude(EVEREST_M, locale),
  };
}

// ─── Challenge block ("Retos de Peakadex") ────────────────────────────────────
// Templates carry {peak}, {challenge}, {count} and {n}; `fill()` below replaces
// them. The heading is split on {challenge} / {highlight} so the caller can wrap
// that part in the amber accent.

export type PeakChallengeLabels = {
  eyebrow: string;
  /** "{peak} cuenta para {challenge}" */
  headingOne: string;
  /** "{peak} cuenta para {highlight}" */
  headingMany: string;
  /** What replaces {highlight}: "{n} retos" */
  manyHighlight: string;
  /** Appended after the challenge's own description. */
  introSuffixOne: string;
  introMany: string;
  /** "{peak} es una de esas {count}" */
  inListOne: string;
  ctaOne: string;
  ctaMany: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3BodyOne: string;
  step3BodyMany: string;
};

const CHALLENGE_LABELS: Record<PeakLocale, PeakChallengeLabels> = {
  es: {
    eyebrow: "Retos de Peakadex",
    headingOne: "{peak} cuenta para {challenge}",
    headingMany: "{peak} cuenta para {highlight}",
    manyHighlight: "{n} retos",
    introSuffixOne: "Te unes desde la app y cada cima que registras avanza tu progreso.",
    introMany: "Un reto es una lista de cimas que se completa una ascensión a la vez. Esta subida avanza los {n} a la vez.",
    inListOne: "{peak} es una de esas {count} cimas",
    ctaOne: "Empezar el reto",
    ctaMany: "Empezar los retos",
    step1Title: "Únete al reto",
    step1Body: "Desde la pestaña Retos, en un toque. Puedes estar en varios a la vez.",
    step2Title: "Sube la cima",
    step2Body: "Haz la foto arriba y registra la ascensión. Esa es toda la prueba.",
    step3Title: "Tacha la cima",
    step3BodyOne: "Se marca sola en tu lista y la barra de progreso avanza.",
    step3BodyMany: "Se marca en los {n} a la vez y todas las barras avanzan.",
  },
  en: {
    eyebrow: "Peakadex challenges",
    headingOne: "{peak} counts towards {challenge}",
    headingMany: "{peak} counts towards {highlight}",
    manyHighlight: "{n} challenges",
    introSuffixOne: "Join from the app and every summit you log moves your progress.",
    introMany: "A challenge is a list of summits you complete one climb at a time. This one climb moves all {n}.",
    inListOne: "{peak} is one of those {count} summits",
    ctaOne: "Start the challenge",
    ctaMany: "Start the challenges",
    step1Title: "Join the challenge",
    step1Body: "One tap from the Challenges tab. You can be in several at once.",
    step2Title: "Climb the summit",
    step2Body: "Take the photo up there and log the ascent. That is the whole proof.",
    step3Title: "Tick it off",
    step3BodyOne: "It marks itself on your list and the progress bar moves.",
    step3BodyMany: "It ticks off in all {n} at once and every bar moves.",
  },
  fr: {
    eyebrow: "Défis Peakadex",
    headingOne: "{peak} compte pour {challenge}",
    headingMany: "{peak} compte pour {highlight}",
    manyHighlight: "{n} défis",
    introSuffixOne: "Tu rejoins le défi depuis l'app et chaque sommet enregistré fait avancer ta progression.",
    introMany: "Un défi est une liste de sommets qui se complète une ascension à la fois. Cette course fait avancer les {n} d'un coup.",
    inListOne: "{peak} est l'un de ces {count} sommets",
    ctaOne: "Commencer le défi",
    ctaMany: "Commencer les défis",
    step1Title: "Rejoins le défi",
    step1Body: "Depuis l'onglet Défis, en un geste. Tu peux en suivre plusieurs.",
    step2Title: "Monte au sommet",
    step2Body: "Prends la photo là-haut et enregistre l'ascension. C'est toute la preuve.",
    step3Title: "Coche le sommet",
    step3BodyOne: "Il se coche tout seul dans ta liste et la barre avance.",
    step3BodyMany: "Il se coche dans les {n} à la fois et toutes les barres avancent.",
  },
  de: {
    eyebrow: "Peakadex-Challenges",
    headingOne: "{peak} zählt für die Challenge {challenge}",
    headingMany: "{peak} zählt für {highlight}",
    manyHighlight: "{n} Challenges",
    introSuffixOne: "Du trittst in der App bei, und jeder eingetragene Gipfel bringt deinen Fortschritt voran.",
    introMany: "Eine Challenge ist eine Gipfelliste, die du Besteigung für Besteigung abarbeitest. Diese eine Tour bringt alle {n} voran.",
    inListOne: "Steht auf dieser Liste mit {count} Gipfeln",
    ctaOne: "Challenge starten",
    ctaMany: "Challenges starten",
    step1Title: "Tritt der Challenge bei",
    step1Body: "Ein Tipp im Challenges-Tab. Du kannst in mehreren gleichzeitig sein.",
    step2Title: "Besteig den Gipfel",
    step2Body: "Mach oben das Foto und trag die Besteigung ein. Mehr Beweis braucht es nicht.",
    step3Title: "Hak ihn ab",
    step3BodyOne: "Er hakt sich in deiner Liste selbst ab und der Fortschrittsbalken wächst.",
    step3BodyMany: "Er hakt sich in allen {n} zugleich ab und alle Balken wachsen.",
  },
  ca: {
    eyebrow: "Reptes de Peakadex",
    headingOne: "{peak} compta per a {challenge}",
    headingMany: "{peak} compta per a {highlight}",
    manyHighlight: "{n} reptes",
    introSuffixOne: "T'hi apuntes des de l'app i cada cim que registres fa avançar el teu progrés.",
    introMany: "Un repte és una llista de cims que es completa una ascensió a la vegada. Aquesta pujada fa avançar els {n} alhora.",
    inListOne: "{peak} és un d'aquests {count} cims",
    ctaOne: "Comença el repte",
    ctaMany: "Comença els reptes",
    step1Title: "Apunta't al repte",
    step1Body: "Des de la pestanya Reptes, en un toc. Pots ser-hi a diversos alhora.",
    step2Title: "Puja al cim",
    step2Body: "Fes la foto a dalt i registra l'ascensió. Aquesta és tota la prova.",
    step3Title: "Ratlla el cim",
    step3BodyOne: "Es marca sol a la teva llista i la barra de progrés avança.",
    step3BodyMany: "Es marca als {n} alhora i totes les barres avancen.",
  },
};

export function getPeakChallengeLabels(locale: PeakLocale): PeakChallengeLabels {
  return CHALLENGE_LABELS[locale];
}

/** Replaces {peak}, {challenge}, {highlight}, {count} and {n} in a template. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    key in vars ? String(vars[key]) : m,
  );
}

/**
 * The catalogue files Alpine districts under their administrative label
 * ("Landkreis Garmisch-Partenkirchen", "Verwaltungskreis Interlaken-Oberhasli").
 * That prefix is bureaucratic noise on a mountain page — drop it.
 */
export function formatComarca(comarca: string | null): string | null {
  if (!comarca) return null;
  const clean = comarca.replace(/^(Landkreis|Verwaltungskreis|Bezirk|Département)\s+/i, "").trim();
  return clean || null;
}
