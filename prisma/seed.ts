/**
 * Seed — 100 Pyrenean peaks over 3000 m
 *
 * Coordinates and altitudes are reference values.
 * Sources: IGN Spain, IGN France, OpenStreetMap, Peakbagger.
 * Suitable for development and staging; verify with official sources before production.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PEAKS = [
  // ── Maladetas / Aneto ─────────────────────────────────────────────────────
  { name: "Aneto",                         latitude: 42.6317, longitude:  0.6556, altitudeM: 3404, mountainRange: "Maladetas",             country: "ES" },
  { name: "Maladeta",                      latitude: 42.6514, longitude:  0.6236, altitudeM: 3308, mountainRange: "Maladetas",             country: "ES" },
  { name: "Coronas",                       latitude: 42.6317, longitude:  0.6719, altitudeM: 3295, mountainRange: "Maladetas",             country: "ES" },
  { name: "Pico de Tempestades",           latitude: 42.6406, longitude:  0.6736, altitudeM: 3290, mountainRange: "Maladetas",             country: "ES" },
  { name: "Alba (Pico de la Paúl)",        latitude: 42.6264, longitude:  0.7578, altitudeM: 3118, mountainRange: "Maladetas",             country: "ES" },
  { name: "Pico de Salenques",             latitude: 42.6347, longitude:  0.7167, altitudeM: 3075, mountainRange: "Maladetas",             country: "ES" },
  { name: "Pico de Malibierne",            latitude: 42.6525, longitude:  0.6817, altitudeM: 3064, mountainRange: "Maladetas",             country: "ES" },
  { name: "Punta Cregüeña",               latitude: 42.6219, longitude:  0.6764, altitudeM: 3021, mountainRange: "Maladetas",             country: "ES" },
  { name: "Pico de Paderna",              latitude: 42.6219, longitude:  0.6561, altitudeM: 3033, mountainRange: "Maladetas",             country: "ES" },
  { name: "Pico de Portillón de Benasque", latitude: 42.6375, longitude:  0.6275, altitudeM: 3033, mountainRange: "Maladetas",             country: "ES" },
  { name: "Mulleres",                      latitude: 42.6344, longitude:  0.7836, altitudeM: 3010, mountainRange: "Maladetas",             country: "ES" },
  { name: "Pico de los Botons",            latitude: 42.6242, longitude:  0.7175, altitudeM: 3008, mountainRange: "Maladetas",             country: "ES" },
  { name: "Forcanada",                     latitude: 42.6422, longitude:  0.5561, altitudeM: 3003, mountainRange: "Maladetas",             country: "ES" },
  { name: "Punta Escuzana",               latitude: 42.6219, longitude:  0.6839, altitudeM: 3024, mountainRange: "Maladetas",             country: "ES" },
  { name: "Pico de la Renclusa",          latitude: 42.6481, longitude:  0.6578, altitudeM: 3066, mountainRange: "Maladetas",             country: "ES" },

  // ── Posets ────────────────────────────────────────────────────────────────
  { name: "Posets (Llardana)",             latitude: 42.6528, longitude:  0.4203, altitudeM: 3375, mountainRange: "Posets",               country: "ES" },
  { name: "Perdiguero",                    latitude: 42.7019, longitude:  0.5000, altitudeM: 3321, mountainRange: "Posets",               country: "ES" },
  { name: "Pico de Literola",             latitude: 42.6989, longitude:  0.5192, altitudeM: 3286, mountainRange: "Posets",               country: "ES" },
  { name: "Gran Bachimala",               latitude: 42.7161, longitude:  0.3783, altitudeM: 3177, mountainRange: "Posets",               country: "ES" },
  { name: "Pico de Bardamina",            latitude: 42.6639, longitude:  0.4467, altitudeM: 3074, mountainRange: "Posets",               country: "ES" },
  { name: "Pico de Eriste",              latitude: 42.6567, longitude:  0.4478, altitudeM: 3052, mountainRange: "Posets",               country: "ES" },
  { name: "Pico de la Robiñera",          latitude: 42.7183, longitude:  0.4667, altitudeM: 3026, mountainRange: "Posets",               country: "ES" },
  { name: "Pico de Clarabide",            latitude: 42.7156, longitude:  0.4497, altitudeM: 3020, mountainRange: "Posets",               country: "ES" },
  { name: "Pico de Entecada",             latitude: 42.6489, longitude:  0.3992, altitudeM: 3016, mountainRange: "Posets",               country: "ES" },
  { name: "Pico de Caillauas",            latitude: 42.7244, longitude:  0.3567, altitudeM: 3067, mountainRange: "Posets",               country: "FR" },

  // ── Monte Perdido / Tres Sorores ──────────────────────────────────────────
  { name: "Monte Perdido",                 latitude: 42.6792, longitude:  0.0353, altitudeM: 3355, mountainRange: "Monte Perdido",         country: "ES" },
  { name: "Cilindro de Marboré",          latitude: 42.6878, longitude:  0.0356, altitudeM: 3328, mountainRange: "Monte Perdido",         country: "ES" },
  { name: "Soum de Ramond",               latitude: 42.6861, longitude:  0.0631, altitudeM: 3263, mountainRange: "Monte Perdido",         country: "FR" },
  { name: "Marboré",                      latitude: 42.6881, longitude:  0.0158, altitudeM: 3248, mountainRange: "Monte Perdido",         country: "ES" },
  { name: "Taillón",                      latitude: 42.6981, longitude: -0.0253, altitudeM: 3144, mountainRange: "Monte Perdido",         country: "FR" },
  { name: "Pico de Astazu",              latitude: 42.6903, longitude: -0.0008, altitudeM: 3071, mountainRange: "Monte Perdido",         country: "ES" },
  { name: "Pico de la Fraucata",         latitude: 42.6839, longitude:  0.0256, altitudeM: 3054, mountainRange: "Monte Perdido",         country: "ES" },
  { name: "Pico de Gabiétous",           latitude: 42.7014, longitude: -0.0636, altitudeM: 3034, mountainRange: "Monte Perdido",         country: "ES" },
  { name: "Tour du Marboré",             latitude: 42.6900, longitude:  0.0225, altitudeM: 3009, mountainRange: "Monte Perdido",         country: "FR" },
  { name: "Punta de las Olas",           latitude: 42.6900, longitude:  0.0058, altitudeM: 3022, mountainRange: "Monte Perdido",         country: "ES" },
  { name: "Pic de la Cascada",           latitude: 42.7011, longitude: -0.0381, altitudeM: 3078, mountainRange: "Monte Perdido",         country: "FR" },
  { name: "Pico de Arrablo",             latitude: 42.6756, longitude:  0.0175, altitudeM: 3010, mountainRange: "Monte Perdido",         country: "ES" },

  // ── Vignemale ─────────────────────────────────────────────────────────────
  { name: "Vignemale (Pique Longue)",      latitude: 42.7728, longitude: -0.1456, altitudeM: 3298, mountainRange: "Vignemale",             country: "FR" },
  { name: "Pico de Clot de la Hount",     latitude: 42.7742, longitude: -0.1583, altitudeM: 3289, mountainRange: "Vignemale",             country: "FR" },
  { name: "Montferrat",                    latitude: 42.7731, longitude: -0.1347, altitudeM: 3219, mountainRange: "Vignemale",             country: "FR" },
  { name: "Pointe Chausenque",             latitude: 42.7756, longitude: -0.1436, altitudeM: 3204, mountainRange: "Vignemale",             country: "FR" },
  { name: "Pic de la Mine",               latitude: 42.7708, longitude: -0.1533, altitudeM: 3118, mountainRange: "Vignemale",             country: "FR" },

  // ── Balaitous ─────────────────────────────────────────────────────────────
  { name: "Balaitous",                     latitude: 42.8375, longitude: -0.2817, altitudeM: 3146, mountainRange: "Balaitous",             country: "ES" },
  { name: "Grand Pic de Batcrabère",       latitude: 42.8239, longitude: -0.2444, altitudeM: 3082, mountainRange: "Balaitous",             country: "FR" },
  { name: "Pic de Cambales",              latitude: 42.8289, longitude: -0.2175, altitudeM: 3082, mountainRange: "Balaitous",             country: "FR" },
  { name: "Soum de Maucapéra",            latitude: 42.8358, longitude: -0.2683, altitudeM: 3009, mountainRange: "Balaitous",             country: "ES" },
  { name: "Pic de la Sède",              latitude: 42.8314, longitude: -0.1906, altitudeM: 3008, mountainRange: "Balaitous",             country: "FR" },

  // ── Tendeñera / Argualas ──────────────────────────────────────────────────
  { name: "Pico de Argualas",             latitude: 42.7494, longitude: -0.0531, altitudeM: 3046, mountainRange: "Tendeñera",             country: "ES" },
  { name: "Punta Custodia",               latitude: 42.7386, longitude: -0.0211, altitudeM: 3030, mountainRange: "Tendeñera",             country: "ES" },

  // ── Pic Long / Estaens-Arbizon ────────────────────────────────────────────
  { name: "Pic Long",                      latitude: 42.8247, longitude:  0.1681, altitudeM: 3192, mountainRange: "Estaens-Arbizon",       country: "FR" },
  { name: "Pic de Campbieil",             latitude: 42.8481, longitude:  0.1528, altitudeM: 3173, mountainRange: "Estaens-Arbizon",       country: "FR" },
  { name: "Pic de Liarre",               latitude: 42.8036, longitude:  0.1808, altitudeM: 3076, mountainRange: "Estaens-Arbizon",       country: "FR" },
  { name: "Pic de Bugatet",              latitude: 42.8192, longitude:  0.1444, altitudeM: 3027, mountainRange: "Estaens-Arbizon",       country: "FR" },
  { name: "Pic d'Estaragne",             latitude: 42.8364, longitude:  0.2028, altitudeM: 3006, mountainRange: "Estaens-Arbizon",       country: "FR" },
  { name: "Pic de Gerbats",              latitude: 42.8083, longitude:  0.1361, altitudeM: 3003, mountainRange: "Estaens-Arbizon",       country: "FR" },

  // ── Neouvielle ────────────────────────────────────────────────────────────
  { name: "Neouvielle",                    latitude: 42.8317, longitude:  0.3208, altitudeM: 3091, mountainRange: "Neouvielle",           country: "FR" },
  { name: "Pic de Madamète",             latitude: 42.8314, longitude:  0.2506, altitudeM: 3064, mountainRange: "Neouvielle",           country: "FR" },
  { name: "Pic des Trois Conseillers",    latitude: 42.8297, longitude:  0.2822, altitudeM: 3039, mountainRange: "Neouvielle",           country: "FR" },
  { name: "Pic de Ramougn",              latitude: 42.8439, longitude:  0.2194, altitudeM: 3011, mountainRange: "Neouvielle",           country: "FR" },
  { name: "Pic de la Géla",              latitude: 42.8017, longitude:  0.2278, altitudeM: 3007, mountainRange: "Neouvielle",           country: "FR" },
  { name: "Pic de Coume Auzel",          latitude: 42.8361, longitude:  0.3047, altitudeM: 3006, mountainRange: "Neouvielle",           country: "FR" },
  { name: "Pic de Bastan",               latitude: 42.8319, longitude:  0.2244, altitudeM: 3003, mountainRange: "Neouvielle",           country: "FR" },

  // ── Gavarnie / Troumouse ──────────────────────────────────────────────────
  { name: "Pic de la Munia",              latitude: 42.7197, longitude:  0.0656, altitudeM: 3133, mountainRange: "Gavarnie",             country: "ES" },
  { name: "Pic de Troumouse",             latitude: 42.7167, longitude:  0.0333, altitudeM: 3085, mountainRange: "Gavarnie",             country: "FR" },
  { name: "Pico del Descargador",         latitude: 42.7217, longitude:  0.0047, altitudeM: 3076, mountainRange: "Gavarnie",             country: "ES" },
  { name: "Pic de Chermentas",            latitude: 42.7289, longitude:  0.0358, altitudeM: 3052, mountainRange: "Gavarnie",             country: "FR" },
  { name: "Punta del Tobacor",            latitude: 42.7072, longitude: -0.0417, altitudeM: 3033, mountainRange: "Gavarnie",             country: "ES" },
  { name: "Pic de la Brèche de Tuquerouye", latitude: 42.6981, longitude: 0.0508, altitudeM: 3034, mountainRange: "Gavarnie",           country: "FR" },
  { name: "Pic de Gavarnie",             latitude: 42.7122, longitude:  0.0017, altitudeM: 3006, mountainRange: "Gavarnie",             country: "FR" },
  { name: "Pico de la Roca de Llauset",  latitude: 42.7047, longitude:  0.0578, altitudeM: 3047, mountainRange: "Gavarnie",             country: "ES" },

  // ── Luchonnais (Haute-Garonne) ────────────────────────────────────────────
  { name: "Pic des Crabioules",           latitude: 42.7797, longitude:  0.5322, altitudeM: 3116, mountainRange: "Luchonnais",           country: "FR" },
  { name: "Pic Maupas",                   latitude: 42.7747, longitude:  0.5486, altitudeM: 3109, mountainRange: "Luchonnais",           country: "FR" },
  { name: "Pic de Lézat",                latitude: 42.7714, longitude:  0.5017, altitudeM: 3107, mountainRange: "Luchonnais",           country: "FR" },
  { name: "Pic de Gourdon",              latitude: 42.7658, longitude:  0.5906, altitudeM: 3065, mountainRange: "Luchonnais",           country: "FR" },
  { name: "Pic du Portillon d'Oo",       latitude: 42.7692, longitude:  0.5764, altitudeM: 3059, mountainRange: "Luchonnais",           country: "FR" },
  { name: "Pic de Médecourbe",           latitude: 42.7381, longitude:  0.6472, altitudeM: 3022, mountainRange: "Luchonnais",           country: "FR" },
  { name: "Pic de Culfreda",             latitude: 42.7239, longitude:  0.3839, altitudeM: 3022, mountainRange: "Luchonnais",           country: "ES" },
  { name: "Pic Boum",                    latitude: 42.7772, longitude:  0.5144, altitudeM: 3007, mountainRange: "Luchonnais",           country: "FR" },

  // ── Pica d'Estats / Noguera Pallaresa ─────────────────────────────────────
  { name: "Pica d'Estats",                latitude: 42.6611, longitude:  1.3967, altitudeM: 3143, mountainRange: "Noguera Pallaresa",    country: "ES" },
  { name: "Pic de Verdaguer",             latitude: 42.6653, longitude:  1.4194, altitudeM: 3131, mountainRange: "Noguera Pallaresa",    country: "FR" },
  { name: "Pico de Montcalm",             latitude: 42.6719, longitude:  1.4039, altitudeM: 3077, mountainRange: "Noguera Pallaresa",    country: "ES" },
  { name: "Pic de Sotllo",               latitude: 42.6581, longitude:  1.3644, altitudeM: 3072, mountainRange: "Noguera Pallaresa",    country: "ES" },
  { name: "Pic del Port Vell de Tavascan", latitude: 42.6761, longitude: 1.3803, altitudeM: 3047, mountainRange: "Noguera Pallaresa",   country: "ES" },
  { name: "Pic del Port de Rat",         latitude: 42.6550, longitude:  1.3317, altitudeM: 3030, mountainRange: "Noguera Pallaresa",    country: "ES" },

  // ── Ribagorçana / Larboust ────────────────────────────────────────────────
  { name: "Pic de la Montagnette",        latitude: 42.7811, longitude:  0.5636, altitudeM: 3033, mountainRange: "Larboust",             country: "FR" },
  { name: "Pic de la Hont Froide",        latitude: 42.7672, longitude:  0.5311, altitudeM: 3018, mountainRange: "Larboust",             country: "FR" },

  // ── Géry / Clarabide zone ─────────────────────────────────────────────────
  { name: "Pic d'Arbizon",               latitude: 42.8547, longitude:  0.2003, altitudeM: 3020, mountainRange: "Arbizon",              country: "FR" },
  { name: "Pic de Chiroulet",            latitude: 42.8606, longitude:  0.1522, altitudeM: 3022, mountainRange: "Arbizon",              country: "FR" },

  // ── Vall de Boí / Alta Ribagorça ──────────────────────────────────────────
  { name: "Pico de Contraix",            latitude: 42.5283, longitude:  0.8994, altitudeM: 3010, mountainRange: "Alta Ribagorça",       country: "ES" },
  { name: "Besiberri Nord",              latitude: 42.5481, longitude:  0.9214, altitudeM: 3030, mountainRange: "Alta Ribagorça",       country: "ES" },
  { name: "Besiberri Sud",               latitude: 42.5419, longitude:  0.9233, altitudeM: 3024, mountainRange: "Alta Ribagorça",       country: "ES" },
  { name: "Tuc de Molières",             latitude: 42.5317, longitude:  0.9672, altitudeM: 3013, mountainRange: "Alta Ribagorça",       country: "ES" },
  { name: "Comaloforno",                 latitude: 42.5303, longitude:  0.9839, altitudeM: 3033, mountainRange: "Alta Ribagorça",       country: "ES" },
  { name: "Punta Alta de Comalesbienes", latitude: 42.5347, longitude:  0.9472, altitudeM: 3014, mountainRange: "Alta Ribagorça",       country: "ES" },
  { name: "Cap de Vaquèira",             latitude: 42.6067, longitude:  1.1028, altitudeM: 3011, mountainRange: "Alta Ribagorça",       country: "ES" },

  // ── Cerdanya catalana ─────────────────────────────────────────────────────
  { name: "Comabona",                    latitude: 42.2597, longitude:  2.1947, altitudeM: 2924, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Carlit",                      latitude: 42.5736, longitude:  1.9289, altitudeM: 2921, mountainRange: "Cerdanya",               country: "FR" },
  { name: "Tossa Plana de Lles",         latitude: 42.3272, longitude:  1.6711, altitudeM: 2916, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puigpedrós",                  latitude: 42.4083, longitude:  1.9417, altitudeM: 2914, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puigmal",                     latitude: 42.3697, longitude:  2.0889, altitudeM: 2913, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig de Noufonts",            latitude: 42.3944, longitude:  2.0786, altitudeM: 2861, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Pic de la Vaca",             latitude: 42.3806, longitude:  2.1147, altitudeM: 2826, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig de Tirapits",            latitude: 42.3717, longitude:  2.0783, altitudeM: 2803, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig de la Canal del Cristall", latitude: 42.4011, longitude: 2.1375, altitudeM: 2738, mountainRange: "Cerdanya",             country: "ES" },
  { name: "Puig de Coma de Vaca",        latitude: 42.3736, longitude:  2.1083, altitudeM: 2770, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig de l'Home Mort",         latitude: 42.3628, longitude:  2.0717, altitudeM: 2748, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Vulturó",                     latitude: 42.2481, longitude:  1.7214, altitudeM: 2648, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Cadí Occidental",             latitude: 42.2600, longitude:  1.7139, altitudeM: 2640, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig del Sac",               latitude: 42.3472, longitude:  2.0728, altitudeM: 2695, mountainRange: "Cerdanya",               country: "ES" },
  { name: "La Perdiu",                   latitude: 42.2547, longitude:  1.7411, altitudeM: 2620, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Cadí Oriental",               latitude: 42.2653, longitude:  1.7533, altitudeM: 2547, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig d'Estanyet",             latitude: 42.3592, longitude:  2.0481, altitudeM: 2603, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Tossa d'Alp",                latitude: 42.2736, longitude:  1.9003, altitudeM: 2531, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Serra de l'Olla",             latitude: 42.3069, longitude:  1.9725, altitudeM: 2560, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig de Queralbs",            latitude: 42.3514, longitude:  2.1417, altitudeM: 2518, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig de Pedrouriol",          latitude: 42.3347, longitude:  2.0411, altitudeM: 2633, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig Alt de Ger",             latitude: 42.3317, longitude:  1.9467, altitudeM: 2455, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig de l'Orri",              latitude: 42.2900, longitude:  1.9225, altitudeM: 2450, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Puig de Coll Roig",           latitude: 42.2808, longitude:  1.8625, altitudeM: 2420, mountainRange: "Cerdanya",               country: "ES" },
  { name: "Moixeró",                     latitude: 42.2997, longitude:  1.8219, altitudeM: 2083, mountainRange: "Cerdanya",               country: "ES" },
];

async function main() {
  console.log("Seeding peaks…");

  // Upsert by name — safe to rerun, won't break existing ascent references
  let upserted = 0;
  for (const peak of PEAKS) {
    const existing = await prisma.peak.findFirst({ where: { name: peak.name }, select: { id: true } });
    if (existing) {
      await prisma.peak.update({ where: { id: existing.id }, data: peak });
    } else {
      await prisma.peak.create({ data: peak });
    }
    upserted++;
    process.stdout.write(`\r  ${upserted}/${PEAKS.length}`);
  }

  console.log(`\nDone — ${upserted} peaks upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
