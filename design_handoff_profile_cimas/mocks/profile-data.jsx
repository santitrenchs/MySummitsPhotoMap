/* ─────────────────────────────────────────────────────────────────
   PROFILE — Shared data + rarity utilities
   ───────────────────────────────────────────────────────────────── */

const RARITIES = {
  daisy:      { label: "Daisy",       range: "0 – 999 m",       min: 0,    max: 999,  color: "#00995C", soft: "#D1FAE5", deep: "#065F46" },
  heather:    { label: "Heather",     range: "1.000 – 1.999 m", min: 1000, max: 1999, color: "#06B6D4", soft: "#CFFAFE", deep: "#155E75" },
  gentian:    { label: "Gentian",     range: "2.000 – 2.999 m", min: 2000, max: 2999, color: "#1E40AF", soft: "#DBEAFE", deep: "#1E3A8A" },
  tundra:     { label: "Tundra",      range: "3.000 – 3.999 m", min: 3000, max: 3999, color: "#0E7490", soft: "#CFFAFE", deep: "#164E63" },
  edelweiss:  { label: "Edelweiss",   range: "4.000 – 4.999 m", min: 4000, max: 4999, color: "#A855F7", soft: "#F3E8FF", deep: "#6B21A8" },
  draba:      { label: "Draba",       range: "5.000 – 5.999 m", min: 5000, max: 5999, color: "#EC4899", soft: "#FCE7F3", deep: "#9D174D" },
  saxifrage:  { label: "Saxifrage",   range: "6.000 – 6.999 m", min: 6000, max: 6999, color: "#F97316", soft: "#FFEDD5", deep: "#9A3412" },
  cinquefoil: { label: "Cinquefoil",  range: "7.000 – 7.999 m", min: 7000, max: 7999, color: "#EAB308", soft: "#FEF9C3", deep: "#854D0E" },
  snow_lotus: { label: "Snow Lotus",  range: "≥ 8.000 m",       min: 8000, max: 9999, color: "#94A3B8", soft: "#F1F5F9", deep: "#334155" },
};

const RARITY_ORDER = ["daisy", "heather", "gentian", "tundra", "edelweiss", "draba", "saxifrage", "cinquefoil", "snow_lotus"];

function tierOf(altitudeM) {
  for (const k of RARITY_ORDER) {
    const r = RARITIES[k];
    if (altitudeM >= r.min && altitudeM <= r.max) return k;
  }
  return "snow_lotus";
}

// ── Sample peaks — Pyrenees-leaning collection (matches the live user data) ──
const PEAKS_DATA = [
  { id: "p01", name: "Mont Blanc / Monte Bianco", altitudeM: 4807, range: "Alpes",            country: "FR/IT", count: 1, lastDate: "2024-08-12", firstDate: "2024-08-12", thumb: "h0" },
  { id: "p02", name: "Gran Paradiso",             altitudeM: 4061, range: "Alpes Graianos",   country: "IT",    count: 1, lastDate: "2023-07-20", firstDate: "2023-07-20", thumb: "h1" },
  { id: "p03", name: "Aneto",                     altitudeM: 3404, range: "Pirineos",         country: "ES",    count: 4, lastDate: "2026-05-03", firstDate: "2019-08-10", thumb: "h2" },
  { id: "p04", name: "Tuca de Posets",            altitudeM: 3369, range: "Pirineos",         country: "ES",    count: 2, lastDate: "2025-09-08", firstDate: "2022-07-30", thumb: "h3" },
  { id: "p05", name: "Punta de Treserols / Monte Perdido", altitudeM: 3349, range: "Pirineos", country: "ES",    count: 1, lastDate: "2025-07-15", firstDate: "2025-07-15", thumb: "h4" },
  { id: "p06", name: "Vignemale",                 altitudeM: 3298, range: "Pirineos",         country: "FR/ES", count: 1, lastDate: "2023-08-04", firstDate: "2023-08-04", thumb: "h5" },
  { id: "p07", name: "Perdiguero",                altitudeM: 3221, range: "Pirineos",         country: "ES",    count: 1, lastDate: "2024-06-22", firstDate: "2024-06-22", thumb: "h6" },
  { id: "p08", name: "Pica d'Estats",             altitudeM: 3143, range: "Pirineos",         country: "ES/AD", count: 3, lastDate: "2026-04-30", firstDate: "2020-09-19", thumb: "h7" },
  { id: "p09", name: "Pic de Sotllo",             altitudeM: 3072, range: "Pirineos",         country: "AD",    count: 1, lastDate: "2024-09-12", firstDate: "2024-09-12", thumb: "h8" },
  { id: "p10", name: "Tuca de Vallibierna / Roca Blanca", altitudeM: 3059, range: "Pirineos", country: "ES",    count: 1, lastDate: "2026-04-30", firstDate: "2026-04-30", thumb: "h9" },
  { id: "p11", name: "Tuca d'Aragüells",          altitudeM: 3048, range: "Pirineos",         country: "ES",    count: 1, lastDate: "2025-08-21", firstDate: "2025-08-21", thumb: "h0" },
  { id: "p12", name: "Comaloforno",               altitudeM: 3030, range: "Pirineos",         country: "ES",    count: 2, lastDate: "2025-08-18", firstDate: "2021-07-12", thumb: "h1" },
  { id: "p13", name: "Punta Alta",                altitudeM: 3014, range: "Pirineos",         country: "ES",    count: 1, lastDate: "2024-09-22", firstDate: "2024-09-22", thumb: "h2" },
  { id: "p14", name: "Carlit",                    altitudeM: 2921, range: "Pirineos",         country: "FR",    count: 1, lastDate: "2024-10-14", firstDate: "2024-10-14", thumb: "h3" },
  { id: "p15", name: "Puigmal",                   altitudeM: 2913, range: "Pirineos",         country: "ES/FR", count: 3, lastDate: "2025-12-10", firstDate: "2018-06-04", thumb: "h4" },
  { id: "p16", name: "Bastiments",                altitudeM: 2881, range: "Pirineos",         country: "ES",    count: 1, lastDate: "2025-09-25", firstDate: "2025-09-25", thumb: "h5" },
  { id: "p17", name: "Canigó",                    altitudeM: 2784, range: "Pirineos",         country: "FR",    count: 1, lastDate: "2024-07-30", firstDate: "2024-07-30", thumb: "h6" },
  { id: "p18", name: "Pedraforca",                altitudeM: 2506, range: "Pirineos",         country: "ES",    count: 2, lastDate: "2025-11-02", firstDate: "2020-05-16", thumb: "h7" },
  { id: "p19", name: "Turbón",                    altitudeM: 2492, range: "Pirineos",         country: "ES",    count: 1, lastDate: "2023-10-21", firstDate: "2023-10-21", thumb: "h8" },
  { id: "p20", name: "Turó de l'Home",            altitudeM: 1706, range: "Montseny",         country: "ES",    count: 4, lastDate: "2026-02-08", firstDate: "2017-03-22", thumb: "h9" },
  { id: "p21", name: "Matagalls",                 altitudeM: 1697, range: "Montseny",         country: "ES",    count: 5, lastDate: "2026-03-15", firstDate: "2017-01-10", thumb: "h0" },
].map((p) => ({ ...p, tier: tierOf(p.altitudeM) }));

// Stats
const TOTAL_UNIQUE = PEAKS_DATA.length;
const TOTAL_ASCENTS = PEAKS_DATA.reduce((s, p) => s + p.count, 0);
const TIERS_PRESENT = new Set(PEAKS_DATA.map((p) => p.tier));
const RANGE_LIST = Array.from(new Set(PEAKS_DATA.map((p) => p.range)));
const COUNTRY_LIST = Array.from(new Set(PEAKS_DATA.flatMap((p) => p.country.split("/"))));

// ── Rarity flower component — matches Peakadex landing "Rarezas" style ───────
function RarityFlower({ tier, size = 24, monochrome = false, ringed = false }) {
  const r = RARITIES[tier];
  if (!r) return null;
  const petalR = size * 0.22;
  const centerR = size * 0.16;
  const orbit = size * 0.28;
  const c = size / 2;
  const petalColor = monochrome ? r.color : r.color;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", flexShrink: 0 }}>
      {ringed && (
        <circle cx={c} cy={c} r={size * 0.48} fill={r.soft} />
      )}
      {[0, 72, 144, 216, 288].map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const cx = c + orbit * Math.cos(rad);
        const cy = c + orbit * Math.sin(rad);
        return <circle key={deg} cx={cx} cy={cy} r={petalR} fill={petalColor} />;
      })}
      <circle cx={c} cy={c} r={centerR} fill="white" />
    </svg>
  );
}

// ── Sample square photo placeholder — gradient block + monospace label ───────
const HUE_FOR_THUMB = {
  h0: ["#0F2A3D", "#1A4E6E"],
  h1: ["#1E2F2D", "#2D5A4B"],
  h2: ["#23202E", "#4B3D72"],
  h3: ["#2A2A2A", "#5B5042"],
  h4: ["#1A2533", "#2E5C84"],
  h5: ["#241F1A", "#6B4A2C"],
  h6: ["#1E222E", "#3F5B82"],
  h7: ["#1A1F2A", "#4D5E7C"],
  h8: ["#23282E", "#54707F"],
  h9: ["#22272F", "#3F506B"],
};

function PhotoPlaceholder({ thumb = "h0", radius = 12, style = {}, label = null, peakName }) {
  const [c1, c2] = HUE_FOR_THUMB[thumb] || HUE_FOR_THUMB.h0;
  const gradId = `pp-${thumb}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <div style={{
      position: "relative",
      width: "100%", height: "100%",
      borderRadius: radius,
      overflow: "hidden",
      background: `linear-gradient(155deg, ${c1} 0%, ${c2} 100%)`,
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
      ...style,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.0)" />
          </linearGradient>
        </defs>
        <polygon points="0,70 18,42 30,55 48,28 62,46 78,22 100,52 100,100 0,100" fill={`url(#${gradId})`} />
        <polygon points="0,80 22,60 38,72 56,52 70,68 88,48 100,68 100,100 0,100" fill="rgba(0,0,0,0.20)" />
      </svg>
      {label && (
        <span style={{
          position: "absolute",
          left: 6, bottom: 6,
          fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
          fontSize: 9, color: "rgba(255,255,255,0.62)",
          letterSpacing: "0.04em",
        }}>{label}</span>
      )}
    </div>
  );
}

// ── Date formatting helpers ─────────────────────────────────────────────────
function formatDateShort(iso) {
  const d = new Date(iso);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
function formatDateLong(iso) {
  const d = new Date(iso);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function formatNumber(n) {
  return new Intl.NumberFormat("es-ES").format(n);
}

Object.assign(window, {
  RARITIES, RARITY_ORDER, tierOf, PEAKS_DATA,
  TOTAL_UNIQUE, TOTAL_ASCENTS, TIERS_PRESENT, RANGE_LIST, COUNTRY_LIST,
  RarityFlower, PhotoPlaceholder,
  formatDateShort, formatDateLong, formatNumber,
});
