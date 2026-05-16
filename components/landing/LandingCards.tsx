"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLandingT } from "./LandingLocaleContext";

// ─── Rarity helpers ──────────────────────────────────────────────────────────
function rarityForAlt(m: number): { name: string; color: string; ep: string; flower: string } {
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

// ─── Card data ────────────────────────────────────────────────────────────────
type CardData = {
  peakName: string; altitudeM: number; altLabel: string;
  country: string; flag: string; mountainRange: string;
  lat: number; lng: number;
  photo?: string; mapImg: string;
  route: string; date: string;
  user: string; userColor: string;
  ascents: number; climbers: number;
  message: string;
};

const RAW: CardData[] = [
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

// ─── Mountain scene (photo placeholder) ──────────────────────────────────────
function MountainScene({ color, altM, uid }: { color: string; altM: number; uid: string }) {
  let skyTop: string, skyBot: string, terrainFar: string, terrainNear: string;
  if (altM >= 5000) {
    skyTop = "#04040F"; skyBot = "#141430";
    terrainFar = color + "25"; terrainNear = color + "45";
  } else if (altM >= 3000) {
    skyTop = "#0D2248"; skyBot = "#2A5080";
    terrainFar = color + "30"; terrainNear = color + "55";
  } else if (altM >= 1000) {
    skyTop = "#1A4B8F"; skyBot = "#5A8FBF";
    terrainFar = color + "35"; terrainNear = color + "60";
  } else {
    skyTop = "#3A76BF"; skyBot = "#8AB8D8";
    terrainFar = color + "40"; terrainNear = color + "65";
  }

  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="0 0 240 200"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBot} />
        </linearGradient>
        <linearGradient id={`ov-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
          <stop offset="50%"  stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill={`url(#sky-${uid})`} />
      <path d="M0 155 L40 110 L80 130 L130 90 L175 115 L210 85 L240 105 L240 200 L0 200Z"
        fill={terrainFar} />
      <path d="M30 200 L120 55 L210 200Z" fill={terrainNear} />
      <path d="M120 55 L104 92 L120 84 L136 92Z" fill="rgba(255,255,255,0.88)" />
      <path d="M120 55 L104 92 L120 84Z" fill="rgba(255,255,255,0.25)" />
      <rect width="240" height="200" fill={`url(#ov-${uid})`} />
    </svg>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CardFace({ card, index, flipped, isNearby }: { card: CardData; index: number; flipped: boolean; isNearby: boolean }) {
  const t = useLandingT();
  const registerHref = t.locale === "es" ? "/register" : `/${t.locale}/register`;
  const { name: rarity, color, ep } = rarityForAlt(card.altitudeM);
  const uid = `c${index}`;

  const latStr = `${Math.abs(card.lat).toFixed(4)}°${card.lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(card.lng).toFixed(4)}°${card.lng >= 0 ? "E" : "W"}`;
  const barPct = Math.min(100, (card.altitudeM / 8849) * 100).toFixed(1);

  return (
    <div style={{
      width: "100%", height: "100%",
      transformStyle: "preserve-3d",
      transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
      transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
    }}>

      {/* ── Front ── */}
      <div style={{
        position: "absolute", inset: 0,
        backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
        borderRadius: 18, overflow: "hidden",
        background: "#FFFFFF",
        border: "1px solid rgba(13,37,56,0.09)",
        boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
        display: "flex", flexDirection: "column",
      }}>

        {/* User header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: card.userColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff",
          }}>
            {card.user.split(" ").map(w => w[0]).join("")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538" }}>{card.user}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{card.date}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, opacity: 0.3 }}>
            {[0,1,2].map(d => (
              <div key={d} style={{ width: 3, height: 3, borderRadius: "50%", background: "#0D2538" }} />
            ))}
          </div>
        </div>

        {/* Photo area — flex:1 fills remaining space */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", margin: "0 10px", borderRadius: 14 }}>
          {card.photo && isNearby
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={card.photo} alt={card.peakName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <MountainScene color={color} altM={card.altitudeM} uid={uid} />
          }
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)" }} />
          {/* Peak overlay */}
          <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 3, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
              {card.peakName}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
              📍 {latStr} · {lngStr}
            </div>
          </div>
        </div>

        {/* Stat band — RAREZA · ALTITUD · RECOMPENSA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px" }}>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>{t.cards_rarity}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, lineHeight: 1.2 }}>
              ✿ <span style={{ fontSize: 10 }}>{rarity}</span>
            </div>
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>{t.cards_altitude}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>{card.altLabel}</div>
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>{t.cards_reward}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+{ep}</div>
          </div>
        </div>

      </div>

      {/* ── Back ── */}
      <div style={{
        position: "absolute", inset: 0,
        backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        borderRadius: 18, overflow: "hidden",
        background: "#FFFFFF",
        boxShadow: "0 8px 32px rgba(13,37,56,0.14)",
        display: "flex", flexDirection: "column",
      }}>

        {/* Map — full-bleed top */}
        <div style={{
          position: "relative", height: 230, flexShrink: 0, width: "100%",
          borderRadius: "18px 18px 0 0", overflow: "hidden",
          backgroundImage: `url(${card.mapImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}>
          {/* Gradient overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.20) 52%, transparent 100%)",
          }} />
          {/* Text overlay */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 14px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 4, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10 }}>📍</span>
              {latStr} · {lngStr}
            </div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#fff", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
              {card.peakName}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.90)", marginTop: 2 }}>
              {card.altLabel}
            </div>
            {card.mountainRange && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.48)", marginTop: 2 }}>{card.mountainRange}</div>
            )}
            {/* Altitude bar */}
            <div style={{ marginTop: 9 }}>
              <div style={{ height: 3, background: "rgba(255,255,255,0.18)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barPct}%`, background: `linear-gradient(to right, ${color}99, ${color})`, borderRadius: 3 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.38)" }}>0 m</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.38)" }}>8.849 m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px 0" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(13,37,56,0.38)", textTransform: "uppercase" }}>
              {t.cards_stats_label}
            </span>
          </div>
          {/* KPIs — ASCENTS left, CLIMBERS right */}
          <div style={{ display: "flex", borderTop: "1px solid rgba(13,37,56,0.07)", borderBottom: "1px solid rgba(13,37,56,0.07)", margin: "6px 0 0" }}>
            <div style={{ flex: 1, padding: "8px 14px", textAlign: "left" }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(13,37,56,0.35)", textTransform: "uppercase", marginBottom: 3 }}>{t.cards_ascents}</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{card.ascents.toLocaleString(t.numberLocale)}</div>
            </div>
            <div style={{ width: 1, background: "rgba(13,37,56,0.07)", margin: "8px 0" }} />
            <div style={{ flex: 1, padding: "8px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(13,37,56,0.35)", textTransform: "uppercase", marginBottom: 3 }}>{t.cards_climbers}</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: "#0D2538", lineHeight: 1 }}>{card.climbers.toLocaleString(t.numberLocale)}</div>
            </div>
          </div>
          {/* User + message — flex: 1 so it takes remaining space */}
          <div style={{ flex: 1, padding: "8px 14px 14px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
              {card.user}
            </p>
            <p style={{
              margin: "5px 0 0", fontSize: 10.5, color: "#6B7280", lineHeight: 1.55,
              display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {card.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Coverflow carousel ───────────────────────────────────────────────────────
const CARD_W = 240;
const CARD_H = 410;

export default function LandingCards() {
  const t = useLandingT();
  const registerHref = t.locale === "es" ? "/register" : `/${t.locale}/register`;
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [vw, setVw] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  const total = RAW.length;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVw(window.innerWidth), 150);
    };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
  }, []);

  const dragStart   = useRef<number | null>(null);
  const dragging    = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelCooldown = useRef(false);

  const prev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);
  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelCooldown.current) return;
      if (Math.abs(e.deltaX) < 5) return;
      wheelCooldown.current = true;
      e.deltaX > 0 ? next() : prev();
      setTimeout(() => { wheelCooldown.current = false; }, 500);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [prev, next]);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientX;
    dragging.current  = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    if (Math.abs(e.touches[0].clientX - dragStart.current) > 8) dragging.current = true;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    const dx = e.changedTouches[0].clientX - dragStart.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    dragStart.current = null;
  };

  const handleCardClick = (i: number) => {
    if (dragging.current) return;
    if (i !== active) { setActive(i); return; }
    setFlipped((f) => ({ ...f, [i]: !f[i] }));
  };

  function cardStyle(i: number): React.CSSProperties {
    let dist = i - active;
    if (dist > total / 2)  dist -= total;
    if (dist < -total / 2) dist += total;
    const absDist = Math.abs(dist);
    if (absDist > 2) return { display: "none" };

    const step = Math.min(CARD_W * 0.43, vw * 0.20);
    const translateX = dist * step;
    const scale      = absDist === 0 ? 1 : absDist === 1 ? 0.84 : absDist === 2 ? 0.71 : 0.60;
    const rotateY    = dist === 0 ? 0 : dist > 0 ? Math.min(dist * 24, 55) : Math.max(dist * 24, -55);
    const opacity    = absDist === 0 ? 1 : absDist === 1 ? 0.72 : 0.38;
    const zIndex     = 10 - absDist;

    return {
      position: "absolute", left: "50%", top: "50%",
      width: CARD_W, height: CARD_H,
      transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
      opacity, zIndex, cursor: "pointer",
      transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease",
      perspective: 1000,
    };
  }

  return (
    <section id="cartas" className="ld-section" style={{ background: "#F4F7FA" }}>
      <div className="ld-container">
        <div className="lc-split">

          {/* ── Left column: text + CTA ── */}
          <div className="lc-left">
            <div className="ld-section-label">{t.cards_section_label}</div>
            <h2 className="ld-display ld-section-title" style={{ marginTop: 12 }}>
              {t.cards_title1}<br />{t.cards_title2}
              <br />
              <span style={{ color: "var(--ld-gold)" }}>{t.cards_title3}<br />{t.cards_title4}</span>
            </h2>
            <p className="ld-section-sub" style={{ marginTop: 20 }}>
              {t.cards_body}
            </p>
            <p style={{ fontSize: 13, color: "rgba(13,37,56,0.4)", marginTop: 20, marginBottom: 28 }}>
              {t.cards_footer}
            </p>
            <a href={registerHref} className="ld-btn-primary" style={{ display: "inline-flex" }}>
              {t.cards_cta}
            </a>
          </div>

          {/* ── Right column: carousel ── */}
          <div className="lc-right">
            <div
              ref={containerRef}
              style={{ position: "relative", height: CARD_H, perspective: 1200, overflow: "hidden" }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {RAW.map((card, i) => {
                let dist = i - active;
                if (dist > total / 2)  dist -= total;
                if (dist < -total / 2) dist += total;
                const absDist = Math.abs(dist);
                return (
                  <div key={card.peakName} style={cardStyle(i)} onClick={() => handleCardClick(i)}>
                    <CardFace card={card} index={i} flipped={!!flipped[i] && i === active} isNearby={absDist <= 2} />
                  </div>
                );
              })}
            </div>

            {/* Dot indicators */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 28 }}>
              {RAW.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`${t.cards_section_label} ${i + 1}`} style={{
                  width: i === active ? 20 : 7, height: 7,
                  borderRadius: 99, border: "none", padding: 0, cursor: "pointer",
                  background: i === active ? "#0D2538" : "rgba(13,37,56,0.2)",
                  transition: "width 0.3s, background 0.3s",
                }} />
              ))}
            </div>

            {/* Peak name + rarity */}
            <div style={{ textAlign: "center", marginTop: 16, minHeight: 44 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#0D2538",
                fontFamily: "var(--font-space, sans-serif)", letterSpacing: "-0.01em" }}>
                {RAW[active].peakName}
              </div>
              <div style={{ fontSize: 12, color: rarityForAlt(RAW[active].altitudeM).color, fontWeight: 600, marginTop: 3 }}>
                ✿ {rarityForAlt(RAW[active].altitudeM).name} · {RAW[active].altLabel}
              </div>
              <p style={{ fontSize: 11, color: "rgba(13,37,56,0.3)", marginTop: 6 }}>
                {t.cards_flip}
              </p>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .lc-split {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }
        .lc-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .lc-right {
          width: 100%;
        }
        @media (min-width: 900px) {
          .lc-split {
            flex-direction: row;
            align-items: center;
            gap: 64px;
          }
          .lc-left {
            flex: 0 0 340px;
            max-width: 340px;
          }
          .lc-right {
            flex: 1;
            min-width: 0;
          }
          .lc-left .ld-section-title {
            font-size: 40px !important;
          }
        }
        @media (min-width: 640px) and (max-width: 899px) {
          .lc-left { align-items: center; text-align: center; }
        }
        @media (max-width: 639px) {
          .lc-left { align-items: center; text-align: center; }
          .lc-left .ld-section-title { font-size: 30px !important; }
        }
      `}</style>
    </section>
  );
}
