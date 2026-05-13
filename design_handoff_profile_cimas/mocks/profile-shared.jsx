/* ─────────────────────────────────────────────────────────────────
   PROFILE — Shared header + tab bar (matches live /profile)
   ───────────────────────────────────────────────────────────────── */

function ProfileHeader({ activeTab = "cimas", onTab = () => {}, variantLabel = null, compact = false }) {
  return (
    <div style={{ background: "white" }}>
      <div style={{ padding: compact ? "20px 16px 14px" : "28px 16px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: compact ? 60 : 72, height: compact ? 60 : 72,
            borderRadius: "50%",
            flexShrink: 0,
            boxShadow: "0 0 0 3px white, 0 0 0 4px #bfdbfe",
            overflow: "hidden",
            background: "linear-gradient(135deg, #1F4F7A 0%, #4A8AB8 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: 22,
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}>
            ST
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: compact ? 18 : 20, fontWeight: 700,
              color: "#111827", margin: "0 0 2px",
              lineHeight: 1.2, letterSpacing: "-0.01em",
            }}>
              Santi Trenchs
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>@santitrenchs</p>
            {variantLabel && (
              <span style={{
                display: "inline-block", marginTop: 8,
                fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
                fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#2F7A5F", fontWeight: 700,
              }}>{variantLabel}</span>
            )}
          </div>

          <button style={{
            padding: "7px 14px",
            border: "1px solid #d1d5db",
            background: "white", color: "#374151",
            borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: "pointer", flexShrink: 0,
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}>
            Editar perfil
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid #e5e7eb",
        background: "white",
      }}>
        {[
          { id: "cimas", label: "Cimas" },
          { id: "foto",  label: "Foto" },
          { id: "tag",   label: "Etiquetado" },
        ].map((t) => {
          const active = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              style={{
                flex: 1, padding: "12px 4px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                color: active ? "#0369a1" : "#6b7280",
                borderBottom: active ? "2px solid #0369a1" : "2px solid transparent",
                fontFamily: "var(--font-inter), Inter, sans-serif",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Distribution strip — shared between variants ────────────────────────────
function RarityDistribution({ peaks, onTierClick = () => {}, activeTier = null, compact = false }) {
  const counts = {};
  for (const k of RARITY_ORDER) counts[k] = 0;
  peaks.forEach((p) => { counts[p.tier] = (counts[p.tier] || 0) + 1; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Segmented bar */}
      <div style={{
        display: "flex", alignItems: "stretch",
        height: compact ? 8 : 10,
        borderRadius: 999, overflow: "hidden",
        background: "#F1F5F9",
      }}>
        {RARITY_ORDER.map((k) => {
          const c = counts[k];
          if (c === 0) return null;
          return (
            <div
              key={k}
              onClick={() => onTierClick(k)}
              style={{
                flex: c,
                background: RARITIES[k].color,
                cursor: "pointer",
                opacity: activeTier && activeTier !== k ? 0.35 : 1,
                transition: "opacity 0.18s",
              }}
              title={`${RARITIES[k].label} · ${c}`}
            />
          );
        })}
      </div>

      {!compact && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6,
        }}>
          {RARITY_ORDER.map((k) => {
            const c = counts[k];
            if (c === 0) return null;
            const r = RARITIES[k];
            const isActive = activeTier === k;
            return (
              <button
                key={k}
                onClick={() => onTierClick(k)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px 4px 6px",
                  borderRadius: 999,
                  background: isActive ? r.color : "white",
                  color: isActive ? "white" : "#0D2538",
                  border: `1px solid ${isActive ? r.color : "#E5E7EB"}`,
                  fontSize: 11, fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  transition: "all 0.15s",
                }}
              >
                <RarityFlower tier={k} size={16} />
                <span>{r.label}</span>
                <span style={{
                  opacity: isActive ? 0.85 : 0.55,
                  fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
                  fontWeight: 600,
                }}>{c}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Reusable filter hook ────────────────────────────────────────────────────
function usePeakFilters(peaks) {
  const [query, setQuery] = React.useState("");
  const [tier, setTier] = React.useState(null);   // string or null
  const [range, setRange] = React.useState(null); // string or null
  const [sort, setSort] = React.useState("altitude_desc");

  const filtered = React.useMemo(() => {
    let out = peaks;
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.range.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q)
    );
    if (tier) out = out.filter((p) => p.tier === tier);
    if (range) out = out.filter((p) => p.range === range);

    const sorted = [...out];
    switch (sort) {
      case "altitude_desc": sorted.sort((a, b) => b.altitudeM - a.altitudeM); break;
      case "altitude_asc":  sorted.sort((a, b) => a.altitudeM - b.altitudeM); break;
      case "count_desc":    sorted.sort((a, b) => b.count - a.count || b.altitudeM - a.altitudeM); break;
      case "recent":        sorted.sort((a, b) => b.lastDate.localeCompare(a.lastDate)); break;
      case "alpha":         sorted.sort((a, b) => a.name.localeCompare(b.name, "es")); break;
    }
    return sorted;
  }, [peaks, query, tier, range, sort]);

  return { query, setQuery, tier, setTier, range, setRange, sort, setSort, filtered };
}

const SORT_OPTIONS = [
  { id: "altitude_desc", label: "Altitud ↓" },
  { id: "altitude_asc",  label: "Altitud ↑" },
  { id: "count_desc",    label: "Más subidas" },
  { id: "recent",        label: "Más recientes" },
  { id: "alpha",         label: "Alfabético" },
];

Object.assign(window, {
  ProfileHeader, RarityDistribution, usePeakFilters, SORT_OPTIONS,
});
