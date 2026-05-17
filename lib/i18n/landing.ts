export type LandingLocale = "es" | "en" | "fr" | "de" | "ca";

export type LandingT = {
  locale: LandingLocale;
  numberLocale: string;

  // Meta
  meta_title: string;
  meta_desc: string;

  // Nav
  nav_rarities: string;
  nav_cards: string;
  nav_login: string;
  nav_register: string;
  nav_register_mobile: string;
  nav_goToApp: string;
  nav_lang: string;

  // Hero
  hero_line1: string;
  hero_line2: string;
  hero_line3: string;
  hero_line4: string;
  hero_body: string;
  hero_cta: string;
  hero_micro: string;

  // Stats
  stats_peaks_label: string;
  stats_peaks_sub: string;
  stats_captured_label: string;
  stats_captured_sub: string;
  stats_ascents_label: string;
  stats_ascents_sub: string;

  // Rarities
  rarities_section_label: string;
  rarities_title: string;
  rarities_title_gold: string;
  rarities_body: string;
  rarities_footer: string;
  rarities_cta: string;
  rarities_peaks_suffix: string;
  rarities_descs: [string, string, string, string, string, string, string, string, string];

  // Cards
  cards_section_label: string;
  cards_title1: string;
  cards_title2: string;
  cards_title3: string;
  cards_title4: string;
  cards_body: string;
  cards_footer: string;
  cards_cta: string;
  cards_rarity: string;
  cards_altitude: string;
  cards_reward: string;
  cards_stats_label: string;
  cards_ascents: string;
  cards_climbers: string;
  cards_flip: string;

  // Mythic
  mythic_section_label: string;
  mythic_title1: string;
  mythic_title2: string;
  mythic_title3: string;
  mythic_manifesto: [
    { line: string; sub: string | null },
    { line: string; sub: string | null },
    { line: string; sub: string | null },
  ];
  mythic_quote: string;
  mythic_cta: string;

  // Progression
  prog_title: string;
  prog_sub: string;
  prog_col_pos: string;
  prog_col_climber: string;
  prog_col_summits: string;
  prog_footer: string;
  prog_card2_title: string;
  prog_card2_sub: string;
  prog_headline: string;
  prog_headline_gold: string;
  prog_small: string;
  prog_zenith_descs: [string, string, string, string, string, string];

  // How it works
  how_label: string;
  how_title: string;
  how_title_gold: string;
  how_body: string;
  how_steps: [
    { title: string; desc: string },
    { title: string; desc: string },
    { title: string; desc: string },
    { title: string; desc: string },
  ];
  how_footer: string;
  how_footer_sub: string;
  how_cta: string;

  // FAQ
  faq_label: string;
  faq_title: string;
  faq_sub: string;
  faq_items: [
    { q: string; a: string },
    { q: string; a: string },
    { q: string; a: string },
    { q: string; a: string },
    { q: string; a: string },
    { q: string; a: string },
    { q: string; a: string },
  ];

  // CTA section
  cta_headline: string;
  cta_button: string;
  cta_micro: string;

  // Footer
  footer_tagline1: string;
  footer_tagline2: string;
  footer_made: string;
  footer_copyright: string;
  footer_col_product: string;
  footer_col_legal: string;
  footer_links_product: { label: string; href: string }[];
  footer_links_legal: { label: string; href: string }[];
  newsletter_label: string;
  newsletter_placeholder: string;
  newsletter_cta: string;
  newsletter_success: string;
  newsletter_error: string;
};

// ─── Spanish ────────────────────────────────────────────────────────────────────

const es: LandingT = {
  locale: "es",
  numberLocale: "es-ES",

  meta_title: "Peakadex — Captura cimas. Colecciona rarezas. Conviértete en Legendario.",
  meta_desc: "La app de montaña que convierte cada ascensión en una carta coleccionable. Registra tus cimas, desbloquea rarezas según la altitud y compite con tu cordada. Gratis.",

  nav_rarities: "Rarezas",
  nav_cards: "Cartas",
  nav_login: "Iniciar sesión",
  nav_register: "Registrarse",
  nav_register_mobile: "Registrarse gratis",
  nav_goToApp: "Ir a la app",
  nav_lang: "Idioma",

  hero_line1: "Captura cimas.",
  hero_line2: "Colecciona rarezas.",
  hero_line3: "Conviértete en",
  hero_line4: "Legendario.",
  hero_body: "Peakadex convierte cada ascensión real en una carta coleccionable. Tu historia de montaña, convertida en leyenda.",
  hero_cta: "Empieza tu colección →",
  hero_micro: "Sin tarjeta de crédito · Gratis para empezar",

  stats_peaks_label: "Cimas en el Azimut",
  stats_peaks_sub: "picos catalogados",
  stats_captured_label: "Cimas capturadas",
  stats_captured_sub: "ya tiene dueño",
  stats_ascents_label: "Ascensiones",
  stats_ascents_sub: "registradas en total",

  rarities_section_label: "Sistema de rarezas",
  rarities_title: "No todas las cimas son iguales.",
  rarities_title_gold: "La altitud determina la rareza.",
  rarities_body: "Como las cartas legendarias, pero estas las ganas tú escalando montañas reales.",
  rarities_footer: "Las Snow Lotus son la rareza más difícil. Solo unos pocos las han capturado todas.",
  rarities_cta: "Empieza con una Daisy →",
  rarities_peaks_suffix: "cimas",
  rarities_descs: [
    "La entrada al mundo de los coleccionistas",
    "Brezales y valles de montaña",
    "Terreno alpino. Ya no es un paseo",
    "Zona de tundra alpina. El paisaje cambia",
    "Alta montaña. Donde empieza la leyenda",
    "Una de las flores más altas del mundo",
    "Expedición. Pocos llegan hasta aquí",
    "Death zones. Solo los elegidos",
    "8000ers. El olimpo del coleccionismo",
  ],

  cards_section_label: "Cartas coleccionables",
  cards_title1: "Cada cima,",
  cards_title2: "una carta.",
  cards_title3: "Tu colección,",
  cards_title4: "tu leyenda.",
  cards_body: "Cuando registras una ascensión, Peakadex genera una carta única de esa montaña. Anverso y reverso. Como un trofeo, pero que cabe en el bolsillo.",
  cards_footer: "Las Snow Lotus son la rareza más difícil. Solo unos pocos las han capturado todas.",
  cards_cta: "Empieza tu colección",
  cards_rarity: "RAREZA",
  cards_altitude: "ALTITUD",
  cards_reward: "RECOMPENSA",
  cards_stats_label: "Estadísticas Peakadex",
  cards_ascents: "Ascensiones",
  cards_climbers: "Alpinistas",
  cards_flip: "Toca la carta para ver el reverso",

  mythic_section_label: "Mythic Collection",
  mythic_title1: "Algunas cimas",
  mythic_title2: "no son raras.",
  mythic_title3: "Son Mythic.",
  mythic_manifesto: [
    { line: "Las montañas que todo alpinista conoce.", sub: null },
    { line: "Contadas cimas por cordillera.", sub: "Las que definen una vida montañera." },
    { line: "No son las más difíciles.", sub: "Son las que hay que subir una vez en la vida." },
  ],
  mythic_quote: "\"Algunas cimas no se explican.<br />Solo se suben.\"",
  mythic_cta: "Explora la Mythic →",

  prog_title: "Tu cordada",
  prog_sub: "Compite con quienes comparten tu camino.",
  prog_col_pos: "POS.",
  prog_col_climber: "MONTAÑERO",
  prog_col_summits: "CIMAS",
  prog_footer: "La montaña se disfruta más en buena compañía.",
  prog_card2_title: "Camino a Zenith",
  prog_card2_sub: "La evolución no se mide solo en metros.",
  prog_headline: "Tu evolución",
  prog_headline_gold: "Cada cima es un reto.",
  prog_small: "El Zenith no se conquista solo.",
  prog_zenith_descs: [
    "Muy pocos llegan aquí.",
    "Para montañeros de élite.",
    "Dominio y experiencia.",
    "Buscando nuevos límites.",
    "Conocimiento y constancia.",
    "Tu camino comienza aquí.",
  ],

  how_label: "Cómo funciona",
  how_title: "Tan simple como subir una montaña.",
  how_title_gold: "(Bueno, casi.)",
  how_body: "Cuatro pasos para convertir cada ascensión en parte de tu leyenda.",
  how_steps: [
    { title: "Explora el Atlas", desc: "Abre el mapa interactivo de Peakadex. Busca tu próxima cima, filtra por rareza o región y márcala como objetivo." },
    { title: "Sube y captura", desc: "Cuando llegues a la cumbre, registra tu ascensión. Añade una foto, la ruta y la fecha. Tu historia queda grabada para siempre." },
    { title: "Desbloquea tu rareza", desc: "Según la altitud de la cima, Peakadex te asigna una rareza: Daisy, Gentian, Edelweiss... hasta Snow Lotus. Y genera tu carta de coleccionista." },
    { title: "Comparte con tu cordada", desc: "Tu ascensión aparece en el feed de tus amigos. Ellos ven tu carta. Tú ves las suyas. La cordada crece. La motivación también." },
  ],
  how_footer: "¿Tu próxima cima te espera?",
  how_footer_sub: "Regístrate gratis y empieza a capturarla hoy.",
  how_cta: "Crear cuenta gratis →",

  faq_label: "FAQ",
  faq_title: "Preguntas frecuentes",
  faq_sub: "¿Tienes dudas? Aquí están las respuestas más habituales.",
  faq_items: [
    { q: "¿Es de pago?", a: "Peakadex es completamente gratuito para empezar. Regístrate y forma parte de los primeros exploradores sin coste." },
    { q: "¿Cómo se determina la rareza de una cima?", a: "Según la altitud de la cima en metros. Cuanto más alta, más rara y difícil de capturar. Desde Daisy (< 1.500 m) hasta Snow Lotus (≥ 8.000 m)." },
    { q: "¿Qué es una carta de montaña?", a: "Cuando registras una ascensión, Peakadex genera una carta coleccionable de esa cima con su nombre, altitud, rareza, foto y tus datos de la ascensión. Es tu trofeo digital." },
    { q: "¿Necesito conexión en la cumbre?", a: "No. Puedes registrar la ascensión cuando tengas conexión, aunque hayas estado offline en la cima. Lo importante es que subiste." },
    { q: "¿Es solo para alpinistas de élite?", a: "Para nada. La rareza Daisy cubre cimas hasta 1.500 m. Cualquier senderista puede empezar su colección desde el primer día." },
    { q: "¿Puedo registrar cimas pasadas?", a: "Sí. Puedes añadir ascensiones de cualquier fecha con foto y datos de la expedición. Tu historia no empieza hoy — empieza desde que subiste tu primera montaña." },
    { q: "¿Cómo funciona la cordada?", a: "Buscas a tus amigos, les mandas una solicitud y cuando aceptan, ves su actividad en tu feed y ellos la tuya. Sin algoritmos, solo tus amigos reales." },
  ],

  cta_headline: "Toda colección empieza con una cima.",
  cta_button: "Captura tu primera Daisy →",
  cta_micro: "Sin tarjeta de crédito · Empieza en 1 minuto",

  footer_tagline1: "Captura cimas. Colecciona rarezas.",
  footer_tagline2: "Conviértete en Legendario.",
  footer_made: "Hecho con ✿ para los que suben montañas de verdad.",
  footer_copyright: "Peakadex. Todos los derechos reservados.",
  footer_col_product: "Producto",
  footer_col_legal: "Legal",
  footer_links_product: [
    { label: "Rarezas", href: "/#rarezas" },
    { label: "Cartas", href: "/#cartas" },
    { label: "Registrarse", href: "/register" },
    { label: "Iniciar sesión", href: "/login" },
  ],
  footer_links_legal: [
    { label: "Política de privacidad", href: "/privacy" },
    { label: "Términos de uso", href: "/terms" },
    { label: "Política de cookies", href: "/cookies" },
  ],
  newsletter_label: "Novedades en tu bandeja",
  newsletter_placeholder: "tu@email.com",
  newsletter_cta: "Suscribirme",
  newsletter_success: "¡Apuntado! Te avisamos cuando haya novedades.",
  newsletter_error: "Algo ha fallado. Inténtalo de nuevo.",
};

// ─── English ───────────────────────────────────────────────────────────────────

const en: LandingT = {
  locale: "en",
  numberLocale: "en-US",

  meta_title: "Peakadex — Capture summits. Collect rarities. Become Legendary.",
  meta_desc: "The mountain app that turns every ascent into a collectible card. Log your summits, unlock rarities by altitude and compete with your crew. Free.",

  nav_rarities: "Rarities",
  nav_cards: "Cards",
  nav_login: "Sign in",
  nav_register: "Sign up",
  nav_register_mobile: "Sign up free",
  nav_goToApp: "Go to app",
  nav_lang: "Language",

  hero_line1: "Capture summits.",
  hero_line2: "Collect rarities.",
  hero_line3: "Become",
  hero_line4: "Legendary.",
  hero_body: "Peakadex turns every real ascent into a collectible card. Your mountain story, turned into legend.",
  hero_cta: "Start your collection →",
  hero_micro: "No credit card · Free to start",

  stats_peaks_label: "Summits in the Atlas",
  stats_peaks_sub: "catalogued peaks",
  stats_captured_label: "Captured summits",
  stats_captured_sub: "already claimed",
  stats_ascents_label: "Ascents",
  stats_ascents_sub: "logged in total",

  rarities_section_label: "Rarity system",
  rarities_title: "Not all summits are equal.",
  rarities_title_gold: "Altitude determines rarity.",
  rarities_body: "Like legendary cards, but these you earn by climbing real mountains.",
  rarities_footer: "Snow Lotus is the hardest rarity. Only a few have captured them all.",
  rarities_cta: "Start with a Daisy →",
  rarities_peaks_suffix: "peaks",
  rarities_descs: [
    "The gateway to the collector's world",
    "Heathlands and mountain valleys",
    "Alpine terrain. No longer a walk",
    "Alpine tundra zone. The landscape shifts",
    "High mountain. Where legend begins",
    "One of the highest flowers in the world",
    "Expedition. Few make it this far",
    "Death zones. Only the chosen few",
    "8000ers. The olympus of collecting",
  ],

  cards_section_label: "Collectible cards",
  cards_title1: "Every summit,",
  cards_title2: "a card.",
  cards_title3: "Your collection,",
  cards_title4: "your legend.",
  cards_body: "When you log an ascent, Peakadex generates a unique card for that mountain. Front and back. Like a trophy that fits in your pocket.",
  cards_footer: "Snow Lotus is the hardest rarity. Only a few have captured them all.",
  cards_cta: "Start your collection",
  cards_rarity: "RARITY",
  cards_altitude: "ALTITUDE",
  cards_reward: "REWARD",
  cards_stats_label: "Peakadex Stats",
  cards_ascents: "Ascents",
  cards_climbers: "Climbers",
  cards_flip: "Tap the card to see the back",

  mythic_section_label: "Mythic Collection",
  mythic_title1: "Some summits",
  mythic_title2: "aren't rare.",
  mythic_title3: "They're Mythic.",
  mythic_manifesto: [
    { line: "The mountains every alpinist knows.", sub: null },
    { line: "A handful of summits per range.", sub: "The ones that define a mountaineering life." },
    { line: "Not the hardest.", sub: "The ones you must climb at least once." },
  ],
  mythic_quote: "\"Some summits can't be explained.<br />They just have to be climbed.\"",
  mythic_cta: "Explore the Mythic →",

  prog_title: "Your crew",
  prog_sub: "Compete with those who share your path.",
  prog_col_pos: "POS.",
  prog_col_climber: "CLIMBER",
  prog_col_summits: "SUMMITS",
  prog_footer: "The mountain is better enjoyed in good company.",
  prog_card2_title: "Road to Zenith",
  prog_card2_sub: "Progress isn't only measured in meters.",
  prog_headline: "Your progression",
  prog_headline_gold: "Every summit is a challenge.",
  prog_small: "Zenith is not conquered alone.",
  prog_zenith_descs: [
    "Very few make it here.",
    "For elite mountaineers.",
    "Mastery and experience.",
    "Seeking new limits.",
    "Knowledge and consistency.",
    "Your journey starts here.",
  ],

  how_label: "How it works",
  how_title: "As simple as climbing a mountain.",
  how_title_gold: "(Well, almost.)",
  how_body: "Four steps to turn every ascent into part of your legend.",
  how_steps: [
    { title: "Explore the Atlas", desc: "Open Peakadex's interactive map. Find your next summit, filter by rarity or region and mark it as a goal." },
    { title: "Climb and capture", desc: "When you reach the summit, log your ascent. Add a photo, the route and the date. Your story is recorded forever." },
    { title: "Unlock your rarity", desc: "Based on the summit's altitude, Peakadex assigns a rarity: Daisy, Gentian, Edelweiss... up to Snow Lotus. And generates your collector's card." },
    { title: "Share with your crew", desc: "Your ascent appears in your friends' feed. They see your card. You see theirs. The crew grows. The motivation too." },
  ],
  how_footer: "Your next summit is waiting.",
  how_footer_sub: "Sign up free and start capturing it today.",
  how_cta: "Create free account →",

  faq_label: "FAQ",
  faq_title: "Frequently asked questions",
  faq_sub: "Got questions? Here are the most common answers.",
  faq_items: [
    { q: "Is it free?", a: "Peakadex is completely free to get started. Sign up and join the first explorers at no cost." },
    { q: "How is a summit's rarity determined?", a: "By the summit's altitude in meters. The higher it is, the rarer and harder to capture. From Daisy (< 1,500 m) to Snow Lotus (≥ 8,000 m)." },
    { q: "What is a mountain card?", a: "When you log an ascent, Peakadex generates a collectible card for that summit with its name, altitude, rarity, photo and your ascent data. It's your digital trophy." },
    { q: "Do I need signal at the summit?", a: "No. You can log the ascent whenever you have a connection, even if you were offline at the top. What matters is that you made it." },
    { q: "Is it only for elite climbers?", a: "Not at all. The Daisy rarity covers summits up to 1,500 m. Any hiker can start their collection from day one." },
    { q: "Can I log past ascents?", a: "Yes. You can add ascents from any date with a photo and expedition data. Your story doesn't start today — it starts from when you climbed your first mountain." },
    { q: "How does the crew work?", a: "You search for your friends, send them a request and when they accept, you see their activity in your feed and they see yours. No algorithms, just your real friends." },
  ],

  cta_headline: "Every collection starts with one summit.",
  cta_button: "Capture your first Daisy →",
  cta_micro: "No credit card · Start in 1 minute",

  footer_tagline1: "Capture summits. Collect rarities.",
  footer_tagline2: "Become Legendary.",
  footer_made: "Made with ✿ for those who climb real mountains.",
  footer_copyright: "Peakadex. All rights reserved.",
  footer_col_product: "Product",
  footer_col_legal: "Legal",
  footer_links_product: [
    { label: "Rarities", href: "/en#rarezas" },
    { label: "Cards", href: "/en#cartas" },
    { label: "Sign up", href: "/register" },
    { label: "Sign in", href: "/login" },
  ],
  footer_links_legal: [
    { label: "Privacy policy", href: "/privacy" },
    { label: "Terms of use", href: "/terms" },
    { label: "Cookie policy", href: "/cookies" },
  ],
  newsletter_label: "News in your inbox",
  newsletter_placeholder: "you@email.com",
  newsletter_cta: "Subscribe",
  newsletter_success: "You're in! We'll let you know when there's news.",
  newsletter_error: "Something went wrong. Please try again.",
};

// ─── French ────────────────────────────────────────────────────────────────────

const fr: LandingT = {
  locale: "fr",
  numberLocale: "fr-FR",

  meta_title: "Peakadex — Capture des sommets. Collectionne des raretés. Deviens Légendaire.",
  meta_desc: "L'app montagne qui transforme chaque ascension en carte à collectionner. Enregistre tes sommets, débloque des raretés selon l'altitude et rivalise avec ta cordée. Gratuit.",

  nav_rarities: "Raretés",
  nav_cards: "Cartes",
  nav_login: "Connexion",
  nav_register: "S'inscrire",
  nav_register_mobile: "S'inscrire gratuitement",
  nav_goToApp: "Aller à l'app",
  nav_lang: "Langue",

  hero_line1: "Capture des sommets.",
  hero_line2: "Collectionne des raretés.",
  hero_line3: "Deviens",
  hero_line4: "Légendaire.",
  hero_body: "Peakadex transforme chaque ascension réelle en une carte à collectionner. Ton histoire de montagne, transformée en légende.",
  hero_cta: "Lance ta collection →",
  hero_micro: "Sans carte de crédit · Gratuit pour commencer",

  stats_peaks_label: "Sommets dans l'Atlas",
  stats_peaks_sub: "sommets catalogués",
  stats_captured_label: "Sommets capturés",
  stats_captured_sub: "déjà revendiqués",
  stats_ascents_label: "Ascensions",
  stats_ascents_sub: "enregistrées au total",

  rarities_section_label: "Système de raretés",
  rarities_title: "Tous les sommets ne se valent pas.",
  rarities_title_gold: "L'altitude détermine la rareté.",
  rarities_body: "Comme les cartes légendaires, mais celles-ci tu les gagnes en escaladant de vraies montagnes.",
  rarities_footer: "Les Snow Lotus sont la rareté la plus difficile. Seuls quelques-uns les ont toutes capturées.",
  rarities_cta: "Commence avec une Daisy →",
  rarities_peaks_suffix: "sommets",
  rarities_descs: [
    "La porte d'entrée du monde des collectionneurs",
    "Landes et vallées de montagne",
    "Terrain alpin. Ce n'est plus une promenade",
    "Zone de toundra alpine. Le paysage change",
    "Haute montagne. Là où commence la légende",
    "L'une des fleurs les plus hautes du monde",
    "Expédition. Peu arrivent jusqu'ici",
    "Death zones. Seulement les élus",
    "8000ers. L'olympe du collectionnisme",
  ],

  cards_section_label: "Cartes à collectionner",
  cards_title1: "Chaque sommet,",
  cards_title2: "une carte.",
  cards_title3: "Ta collection,",
  cards_title4: "ta légende.",
  cards_body: "Quand tu enregistres une ascension, Peakadex génère une carte unique de cette montagne. Recto et verso. Comme un trophée qui tient dans ta poche.",
  cards_footer: "Les Snow Lotus sont la rareté la plus difficile. Seuls quelques-uns les ont toutes capturées.",
  cards_cta: "Lance ta collection",
  cards_rarity: "RARETÉ",
  cards_altitude: "ALTITUDE",
  cards_reward: "RÉCOMPENSE",
  cards_stats_label: "Statistiques Peakadex",
  cards_ascents: "Ascensions",
  cards_climbers: "Alpinistes",
  cards_flip: "Touche la carte pour voir le verso",

  mythic_section_label: "Mythic Collection",
  mythic_title1: "Certains sommets",
  mythic_title2: "ne sont pas rares.",
  mythic_title3: "Ils sont Mythic.",
  mythic_manifesto: [
    { line: "Les montagnes que tout alpiniste connaît.", sub: null },
    { line: "Un nombre réduit de sommets par chaîne.", sub: "Ceux qui définissent une vie en montagne." },
    { line: "Pas les plus difficiles.", sub: "Ceux qu'il faut gravir au moins une fois dans sa vie." },
  ],
  mythic_quote: "\"Certains sommets ne s'expliquent pas.<br />Ils se grimpent, c'est tout.\"",
  mythic_cta: "Explorer la Mythic →",

  prog_title: "Ta cordée",
  prog_sub: "Rivalise avec ceux qui partagent ton chemin.",
  prog_col_pos: "POS.",
  prog_col_climber: "ALPINISTE",
  prog_col_summits: "SOMMETS",
  prog_footer: "La montagne se savoure mieux en bonne compagnie.",
  prog_card2_title: "Route vers le Zenith",
  prog_card2_sub: "La progression ne se mesure pas qu'en mètres.",
  prog_headline: "Ta progression",
  prog_headline_gold: "Chaque sommet est un défi.",
  prog_small: "Le Zenith ne se conquiert pas seul.",
  prog_zenith_descs: [
    "Très peu arrivent ici.",
    "Pour les alpinistes d'élite.",
    "Maîtrise et expérience.",
    "À la recherche de nouveaux limites.",
    "Connaissance et constance.",
    "Ton chemin commence ici.",
  ],

  how_label: "Comment ça marche",
  how_title: "Aussi simple que gravir une montagne.",
  how_title_gold: "(Enfin, presque.)",
  how_body: "Quatre étapes pour transformer chaque ascension en partie de ta légende.",
  how_steps: [
    { title: "Explore l'Atlas", desc: "Ouvre la carte interactive de Peakadex. Cherche ton prochain sommet, filtre par rareté ou région et marque-le comme objectif." },
    { title: "Grimpe et capture", desc: "Quand tu atteins le sommet, enregistre ton ascension. Ajoute une photo, l'itinéraire et la date. Ton histoire est gravée pour toujours." },
    { title: "Débloque ta rareté", desc: "Selon l'altitude du sommet, Peakadex t'attribue une rareté : Daisy, Gentian, Edelweiss... jusqu'à Snow Lotus. Et génère ta carte de collectionneur." },
    { title: "Partage avec ta cordée", desc: "Ton ascension apparaît dans le feed de tes amis. Ils voient ta carte. Tu vois les leurs. La cordée grandit. La motivation aussi." },
  ],
  how_footer: "Ton prochain sommet t'attend.",
  how_footer_sub: "Inscris-toi gratuitement et commence à le capturer aujourd'hui.",
  how_cta: "Créer un compte gratuit →",

  faq_label: "FAQ",
  faq_title: "Questions fréquentes",
  faq_sub: "Des questions ? Voici les réponses les plus courantes.",
  faq_items: [
    { q: "Est-ce payant ?", a: "Peakadex est entièrement gratuit pour démarrer. Inscris-toi et rejoins les premiers explorateurs sans frais." },
    { q: "Comment la rareté d'un sommet est-elle déterminée ?", a: "Par l'altitude du sommet en mètres. Plus il est haut, plus il est rare et difficile à capturer. De Daisy (< 1 500 m) à Snow Lotus (≥ 8 000 m)." },
    { q: "Qu'est-ce qu'une carte de montagne ?", a: "Quand tu enregistres une ascension, Peakadex génère une carte à collectionner de ce sommet avec son nom, son altitude, sa rareté, une photo et tes données d'ascension. C'est ton trophée numérique." },
    { q: "Ai-je besoin de signal au sommet ?", a: "Non. Tu peux enregistrer l'ascension quand tu as une connexion, même si tu étais hors ligne au sommet. L'essentiel est que tu y sois monté." },
    { q: "Est-ce réservé aux alpinistes d'élite ?", a: "Pas du tout. La rareté Daisy couvre les sommets jusqu'à 1 500 m. N'importe quel randonneur peut commencer sa collection dès le premier jour." },
    { q: "Puis-je enregistrer des ascensions passées ?", a: "Oui. Tu peux ajouter des ascensions de n'importe quelle date avec une photo et des données d'expédition. Ton histoire ne commence pas aujourd'hui — elle commence depuis que tu as gravi ta première montagne." },
    { q: "Comment fonctionne la cordée ?", a: "Tu cherches tes amis, tu leur envoies une demande et quand ils acceptent, tu vois leur activité dans ton feed et ils voient la tienne. Pas d'algorithmes, juste tes vrais amis." },
  ],

  cta_headline: "Toute collection commence par un sommet.",
  cta_button: "Capture ta première Daisy →",
  cta_micro: "Sans carte de crédit · Commence en 1 minute",

  footer_tagline1: "Capture des sommets. Collectionne des raretés.",
  footer_tagline2: "Deviens Légendaire.",
  footer_made: "Fait avec ✿ pour ceux qui gravissent de vraies montagnes.",
  footer_copyright: "Peakadex. Tous droits réservés.",
  footer_col_product: "Produit",
  footer_col_legal: "Légal",
  footer_links_product: [
    { label: "Raretés", href: "/fr#rarezas" },
    { label: "Cartes", href: "/fr#cartas" },
    { label: "S'inscrire", href: "/register" },
    { label: "Connexion", href: "/login" },
  ],
  footer_links_legal: [
    { label: "Politique de confidentialité", href: "/privacy" },
    { label: "Conditions d'utilisation", href: "/terms" },
    { label: "Politique de cookies", href: "/cookies" },
  ],
  newsletter_label: "Les actus dans ta boîte",
  newsletter_placeholder: "toi@email.com",
  newsletter_cta: "S'inscrire",
  newsletter_success: "C'est noté ! On te tient au courant.",
  newsletter_error: "Une erreur s'est produite. Réessaie.",
};

// ─── German ────────────────────────────────────────────────────────────────────

const de: LandingT = {
  locale: "de",
  numberLocale: "de-DE",

  meta_title: "Peakadex — Gipfel erobern. Raritäten sammeln. Zur Legende werden.",
  meta_desc: "Die Berg-App, die jede Besteigung in eine Sammelkarte verwandelt. Logge deine Gipfel, schalte Raritäten nach Höhe frei und tritt gegen deine Seilschaft an. Kostenlos.",

  nav_rarities: "Raritäten",
  nav_cards: "Karten",
  nav_login: "Anmelden",
  nav_register: "Registrieren",
  nav_register_mobile: "Kostenlos registrieren",
  nav_goToApp: "Zur App",
  nav_lang: "Sprache",

  hero_line1: "Gipfel erobern.",
  hero_line2: "Raritäten sammeln.",
  hero_line3: "Werde zur",
  hero_line4: "Legende.",
  hero_body: "Peakadex verwandelt jede echte Besteigung in eine Sammelkarte. Deine Berggeschichte, zur Legende gemacht.",
  hero_cta: "Sammlung starten →",
  hero_micro: "Keine Kreditkarte · Kostenlos starten",

  stats_peaks_label: "Gipfel im Atlas",
  stats_peaks_sub: "katalogisierte Gipfel",
  stats_captured_label: "Eroberte Gipfel",
  stats_captured_sub: "bereits beansprucht",
  stats_ascents_label: "Besteigungen",
  stats_ascents_sub: "insgesamt geloggt",

  rarities_section_label: "Raritätensystem",
  rarities_title: "Nicht alle Gipfel sind gleich.",
  rarities_title_gold: "Die Höhe bestimmt die Rarität.",
  rarities_body: "Wie legendäre Karten, aber diese verdienst du dir durch echtes Bergsteigen.",
  rarities_footer: "Snow Lotus ist die seltenste Rarität. Nur wenige haben sie alle gesammelt.",
  rarities_cta: "Mit einer Daisy beginnen →",
  rarities_peaks_suffix: "Gipfel",
  rarities_descs: [
    "Das Tor zur Welt der Sammler",
    "Heidelandschaften und Bergtäler",
    "Alpines Gelände. Kein Spaziergang mehr",
    "Alpine Tundrazone. Die Landschaft verändert sich",
    "Hochgebirge. Wo die Legende beginnt",
    "Eine der höchsten Blumen der Welt",
    "Expedition. Nur wenige kommen so weit",
    "Death zones. Nur die Auserwählten",
    "8000er. Der Olymp des Sammelns",
  ],

  cards_section_label: "Sammelkarten",
  cards_title1: "Jeder Gipfel,",
  cards_title2: "eine Karte.",
  cards_title3: "Deine Sammlung,",
  cards_title4: "deine Legende.",
  cards_body: "Wenn du eine Besteigung loggst, generiert Peakadex eine einzigartige Karte für diesen Berg. Vorder- und Rückseite. Wie ein Pokal, der in die Tasche passt.",
  cards_footer: "Snow Lotus ist die seltenste Rarität. Nur wenige haben sie alle gesammelt.",
  cards_cta: "Sammlung starten",
  cards_rarity: "RARITÄT",
  cards_altitude: "HÖHE",
  cards_reward: "BELOHNUNG",
  cards_stats_label: "Peakadex Statistiken",
  cards_ascents: "Besteigungen",
  cards_climbers: "Bergsteiger",
  cards_flip: "Karte antippen für die Rückseite",

  mythic_section_label: "Mythic Collection",
  mythic_title1: "Manche Gipfel",
  mythic_title2: "sind nicht selten.",
  mythic_title3: "Sie sind Mythic.",
  mythic_manifesto: [
    { line: "Die Berge, die jeder Alpinist kennt.", sub: null },
    { line: "Eine Handvoll Gipfel pro Gebirge.", sub: "Jene, die ein Bergsteigerleben prägen." },
    { line: "Nicht die schwierigsten.", sub: "Die, die man mindestens einmal im Leben besteigen muss." },
  ],
  mythic_quote: "\"Manche Gipfel lassen sich nicht erklären.<br />Man muss sie einfach besteigen.\"",
  mythic_cta: "Mythic erkunden →",

  prog_title: "Deine Seilschaft",
  prog_sub: "Tritt gegen die an, die deinen Weg teilen.",
  prog_col_pos: "POS.",
  prog_col_climber: "BERGSTEIGER",
  prog_col_summits: "GIPFEL",
  prog_footer: "Die Berge genießt man am besten in guter Gesellschaft.",
  prog_card2_title: "Weg zum Zenith",
  prog_card2_sub: "Fortschritt misst sich nicht nur in Metern.",
  prog_headline: "Dein Aufstieg",
  prog_headline_gold: "Jeder Gipfel ist eine Herausforderung.",
  prog_small: "Der Zenith wird nicht allein erobert.",
  prog_zenith_descs: [
    "Sehr wenige kommen hierher.",
    "Für Elite-Bergsteiger.",
    "Beherrschung und Erfahrung.",
    "Auf der Suche nach neuen Grenzen.",
    "Wissen und Beständigkeit.",
    "Dein Weg beginnt hier.",
  ],

  how_label: "So funktioniert es",
  how_title: "So einfach wie einen Berg besteigen.",
  how_title_gold: "(Na ja, fast.)",
  how_body: "Vier Schritte, um jede Besteigung zu einem Teil deiner Legende zu machen.",
  how_steps: [
    { title: "Atlas erkunden", desc: "Öffne die interaktive Karte von Peakadex. Suche deinen nächsten Gipfel, filtere nach Rarität oder Region und markiere ihn als Ziel." },
    { title: "Aufsteigen und erfassen", desc: "Wenn du den Gipfel erreichst, logge deine Besteigung. Füge ein Foto, die Route und das Datum hinzu. Deine Geschichte ist für immer festgehalten." },
    { title: "Rarität freischalten", desc: "Basierend auf der Höhe des Gipfels weist Peakadex eine Rarität zu: Daisy, Gentian, Edelweiss... bis Snow Lotus. Und generiert deine Sammelkarte." },
    { title: "Mit Seilschaft teilen", desc: "Deine Besteigung erscheint im Feed deiner Freunde. Sie sehen deine Karte. Du siehst ihre. Die Seilschaft wächst. Die Motivation auch." },
  ],
  how_footer: "Dein nächster Gipfel wartet.",
  how_footer_sub: "Registriere dich kostenlos und fang heute an, ihn zu erfassen.",
  how_cta: "Kostenloses Konto erstellen →",

  faq_label: "FAQ",
  faq_title: "Häufige Fragen",
  faq_sub: "Hast du Fragen? Hier sind die häufigsten Antworten.",
  faq_items: [
    { q: "Ist es kostenlos?", a: "Peakadex ist völlig kostenlos für den Einstieg. Registriere dich und werde Teil der ersten Entdecker ohne jegliche Kosten." },
    { q: "Wie wird die Rarität eines Gipfels bestimmt?", a: "Nach der Höhe des Gipfels in Metern. Je höher, desto seltener und schwieriger zu erfassen. Von Daisy (< 1.500 m) bis Snow Lotus (≥ 8.000 m)." },
    { q: "Was ist eine Bergkarte?", a: "Wenn du eine Besteigung loggst, generiert Peakadex eine Sammelkarte für diesen Gipfel mit seinem Namen, seiner Höhe, Rarität, Foto und deinen Besteigungsdaten. Das ist dein digitaler Pokal." },
    { q: "Brauche ich Signal am Gipfel?", a: "Nein. Du kannst die Besteigung eintragen, wenn du Verbindung hast, auch wenn du oben offline warst. Was zählt, ist dass du aufgestiegen bist." },
    { q: "Ist es nur für Elite-Bergsteiger?", a: "Gar nicht. Die Daisy-Rarität umfasst Gipfel bis 1.500 m. Jeder Wanderer kann seine Sammlung vom ersten Tag an beginnen." },
    { q: "Kann ich vergangene Besteigungen eintragen?", a: "Ja. Du kannst Besteigungen von jedem Datum mit Foto und Expeditionsdaten hinzufügen. Deine Geschichte beginnt nicht heute — sie beginnt mit deinem ersten Gipfel." },
    { q: "Wie funktioniert die Seilschaft?", a: "Du suchst deine Freunde, schickst ihnen eine Anfrage und wenn sie annehmen, siehst du ihre Aktivität in deinem Feed und sie sehen deine. Keine Algorithmen, nur deine echten Freunde." },
  ],

  cta_headline: "Jede Sammlung beginnt mit einem Gipfel.",
  cta_button: "Erste Daisy erfassen →",
  cta_micro: "Keine Kreditkarte · In 1 Minute starten",

  footer_tagline1: "Gipfel erobern. Raritäten sammeln.",
  footer_tagline2: "Zur Legende werden.",
  footer_made: "Gemacht mit ✿ für echte Bergsteiger.",
  footer_copyright: "Peakadex. Alle Rechte vorbehalten.",
  footer_col_product: "Produkt",
  footer_col_legal: "Rechtliches",
  footer_links_product: [
    { label: "Raritäten", href: "/de#rarezas" },
    { label: "Karten", href: "/de#cartas" },
    { label: "Registrieren", href: "/register" },
    { label: "Anmelden", href: "/login" },
  ],
  footer_links_legal: [
    { label: "Datenschutzrichtlinie", href: "/privacy" },
    { label: "Nutzungsbedingungen", href: "/terms" },
    { label: "Cookie-Richtlinie", href: "/cookies" },
  ],
  newsletter_label: "Neuigkeiten ins Postfach",
  newsletter_placeholder: "du@email.com",
  newsletter_cta: "Abonnieren",
  newsletter_success: "Eingetragen! Wir melden uns bei Neuigkeiten.",
  newsletter_error: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
};

// ─── Catalan ───────────────────────────────────────────────────────────────────

const ca: LandingT = {
  locale: "ca",
  numberLocale: "ca-ES",

  meta_title: "Peakadex — Captura cims. Col·lecciona rarezas. Converteix-te en Llegendari.",
  meta_desc: "L'app de muntanya que converteix cada ascensió en una carta col·leccionable. Registra els teus cims, desbloqueja rarezas segons l'altitud i competeix amb la teva cordada. Gratis.",

  nav_rarities: "Rarezas",
  nav_cards: "Cartes",
  nav_login: "Inicia sessió",
  nav_register: "Registra't",
  nav_register_mobile: "Registra't gratis",
  nav_goToApp: "Anar a l'app",
  nav_lang: "Idioma",

  hero_line1: "Captura cims.",
  hero_line2: "Col·lecciona rarezas.",
  hero_line3: "Converteix-te en",
  hero_line4: "Llegendari.",
  hero_body: "Peakadex converteix cada ascensió real en una carta col·leccionable. La teva història de muntanya, convertida en llegenda.",
  hero_cta: "Comença la teva col·lecció →",
  hero_micro: "Sense targeta de crèdit · Gratis per començar",

  stats_peaks_label: "Cims a l'Atlas",
  stats_peaks_sub: "pics catalogats",
  stats_captured_label: "Cims capturats",
  stats_captured_sub: "ja té propietari",
  stats_ascents_label: "Ascensions",
  stats_ascents_sub: "registrades en total",

  rarities_section_label: "Sistema de rarezas",
  rarities_title: "No tots els cims són iguals.",
  rarities_title_gold: "L'altitud determina la rareza.",
  rarities_body: "Com les cartes llegendàries, però aquestes les guanyes tu escalant muntanyes reals.",
  rarities_footer: "Les Snow Lotus són la rareza més difícil. Només uns pocs les han capturades totes.",
  rarities_cta: "Comença amb una Daisy →",
  rarities_peaks_suffix: "cims",
  rarities_descs: [
    "L'entrada al món dels col·leccionistes",
    "Bruguerars i valls de muntanya",
    "Terreny alpí. Ja no és un passeig",
    "Zona de tundra alpina. El paisatge canvia",
    "Alta muntanya. On comença la llegenda",
    "Una de les flors més altes del món",
    "Expedició. Pocs arriben fins aquí",
    "Death zones. Només els escollits",
    "8000ers. L'olimp del col·leccionisme",
  ],

  cards_section_label: "Cartes col·leccionables",
  cards_title1: "Cada cim,",
  cards_title2: "una carta.",
  cards_title3: "La teva col·lecció,",
  cards_title4: "la teva llegenda.",
  cards_body: "Quan registres una ascensió, Peakadex genera una carta única d'aquella muntanya. Anvers i revers. Com un trofeu, però que cap a la butxaca.",
  cards_footer: "Les Snow Lotus són la rareza més difícil. Només uns pocs les han capturades totes.",
  cards_cta: "Comença la teva col·lecció",
  cards_rarity: "RAREZA",
  cards_altitude: "ALTITUD",
  cards_reward: "RECOMPENSA",
  cards_stats_label: "Estadístiques Peakadex",
  cards_ascents: "Ascensions",
  cards_climbers: "Alpinistes",
  cards_flip: "Toca la carta per veure el revers",

  mythic_section_label: "Mythic Collection",
  mythic_title1: "Alguns cims",
  mythic_title2: "no són rars.",
  mythic_title3: "Són Mythic.",
  mythic_manifesto: [
    { line: "Les muntanyes que tot alpinista coneix.", sub: null },
    { line: "Comptats cims per serralada.", sub: "Els que defineixen una vida de muntanya." },
    { line: "No són els més difícils.", sub: "Són els que s'han de pujar una vegada a la vida." },
  ],
  mythic_quote: "\"Alguns cims no s'expliquen.<br />Només es pugen.\"",
  mythic_cta: "Explora la Mythic →",

  prog_title: "La teva cordada",
  prog_sub: "Competeix amb els que comparteixen el teu camí.",
  prog_col_pos: "POS.",
  prog_col_climber: "MUNTANYENC",
  prog_col_summits: "CIMS",
  prog_footer: "La muntanya es gaudeix més en bona companyia.",
  prog_card2_title: "Camí cap al Zenith",
  prog_card2_sub: "L'evolució no es mesura només en metres.",
  prog_headline: "La teva evolució",
  prog_headline_gold: "Cada cim és un repte.",
  prog_small: "El Zenith no es conquista sol.",
  prog_zenith_descs: [
    "Molt pocs arriben aquí.",
    "Per a alpinistes d'elit.",
    "Domini i experiència.",
    "Buscant nous límits.",
    "Coneixement i constància.",
    "El teu camí comença aquí.",
  ],

  how_label: "Com funciona",
  how_title: "Tan simple com pujar una muntanya.",
  how_title_gold: "(Bé, gairebé.)",
  how_body: "Quatre passos per convertir cada ascensió en part de la teva llegenda.",
  how_steps: [
    { title: "Explora l'Atlas", desc: "Obre el mapa interactiu de Peakadex. Busca el teu proper cim, filtra per rareza o regió i marca'l com a objectiu." },
    { title: "Puja i captura", desc: "Quan arribis al cim, registra la teva ascensió. Afegeix una foto, la ruta i la data. La teva història queda gravada per sempre." },
    { title: "Desbloqueja la teva rareza", desc: "Segons l'altitud del cim, Peakadex t'assigna una rareza: Daisy, Gentian, Edelweiss... fins a Snow Lotus. I genera la teva carta de col·leccionista." },
    { title: "Comparteix amb la teva cordada", desc: "La teva ascensió apareix al feed dels teus amics. Ells veuen la teva carta. Tu veus les seves. La cordada creix. La motivació també." },
  ],
  how_footer: "El teu proper cim t'espera.",
  how_footer_sub: "Registra't gratis i comença a capturar-lo avui.",
  how_cta: "Crea un compte gratis →",

  faq_label: "FAQ",
  faq_title: "Preguntes freqüents",
  faq_sub: "Tens dubtes? Aquí tens les respostes més habituals.",
  faq_items: [
    { q: "És de pagament?", a: "Peakadex és completament gratuït per començar. Registra't i forma part dels primers exploradors sense cap cost." },
    { q: "Com es determina la rareza d'un cim?", a: "Segons l'altitud del cim en metres. Com més alt, més rar i difícil de capturar. Des de Daisy (< 1.500 m) fins a Snow Lotus (≥ 8.000 m)." },
    { q: "Què és una carta de muntanya?", a: "Quan registres una ascensió, Peakadex genera una carta col·leccionable d'aquell cim amb el seu nom, altitud, rareza, foto i les teves dades de l'ascensió. És el teu trofeu digital." },
    { q: "Necessito connexió al cim?", a: "No. Pots registrar l'ascensió quan tinguis connexió, encara que hagis estat offline al cim. El que importa és que vas pujar." },
    { q: "És només per a alpinistes d'elit?", a: "Per a res. La rareza Daisy cobreix cims fins a 1.500 m. Qualsevol senderista pot començar la seva col·lecció des del primer dia." },
    { q: "Puc registrar cims passats?", a: "Sí. Pots afegir ascensions de qualsevol data amb foto i dades de l'expedició. La teva història no comença avui — comença des que vas pujar la teva primera muntanya." },
    { q: "Com funciona la cordada?", a: "Busques els teus amics, els envies una sol·licitud i quan accepten, veus la seva activitat al teu feed i ells la teva. Sense algoritmes, només els teus amics reals." },
  ],

  cta_headline: "Tota col·lecció comença amb un cim.",
  cta_button: "Captura la teva primera Daisy →",
  cta_micro: "Sense targeta de crèdit · Comença en 1 minut",

  footer_tagline1: "Captura cims. Col·lecciona rarezas.",
  footer_tagline2: "Converteix-te en Llegendari.",
  footer_made: "Fet amb ✿ per als que pugen muntanyes de debò.",
  footer_copyright: "Peakadex. Tots els drets reservats.",
  footer_col_product: "Producte",
  footer_col_legal: "Legal",
  footer_links_product: [
    { label: "Rarezas", href: "/ca#rarezas" },
    { label: "Cartes", href: "/ca#cartas" },
    { label: "Registra't", href: "/register" },
    { label: "Inicia sessió", href: "/login" },
  ],
  footer_links_legal: [
    { label: "Política de privacitat", href: "/privacy" },
    { label: "Termes d'ús", href: "/terms" },
    { label: "Política de cookies", href: "/cookies" },
  ],
  newsletter_label: "Novetats a la teva safata",
  newsletter_placeholder: "tu@email.com",
  newsletter_cta: "Subscriure'm",
  newsletter_success: "Apuntat! T'avisem quan hi hagi novetats.",
  newsletter_error: "Alguna cosa ha fallat. Torna-ho a intentar.",
};

// ─── Lookup ────────────────────────────────────────────────────────────────────

const TRANSLATIONS: Record<LandingLocale, LandingT> = { es, en, fr, de, ca };

export function getLandingT(locale: LandingLocale | string = "es"): LandingT {
  return TRANSLATIONS[(locale as LandingLocale) in TRANSLATIONS ? (locale as LandingLocale) : "es"];
}
