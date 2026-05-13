/* ─────────────────────────────────────────────────────────────────
   FOTO + ETIQUETADO tabs — Re-imagined
   Mismos filtros (búsqueda, rareza, orden), grid con micro-overlay
   coleccionista y mejor info sobre quién tomó la foto (etiquetado).
   ───────────────────────────────────────────────────────────────── */

// Build a photos array from peaks (multiplied by count)
const PHOTOS_DATA = (() => {
  const out = [];
  PEAKS_DATA.forEach((p) => {
    for (let i = 0; i < p.count; i++) {
      const d = new Date(p.lastDate);
      d.setMonth(d.getMonth() - i * 7);
      const iso = d.toISOString().slice(0, 10);
      out.push({
        id: `${p.id}-ph${i}`,
        peakId: p.id,
        peakName: p.name,
        altitudeM: p.altitudeM,
        tier: p.tier,
        range: p.range,
        thumb: p.thumb,
        date: iso,
      });
    }
  });
  return out.sort((a, b) => b.date.localeCompare(a.date));
})();

// Tagged photos — pretend friends tagged Santi in their summits
const TAGGED_NAMES = ["Marc", "Laia", "Pol", "Núria"];
const TAGGED_DATA = (() => {
  const subset = PEAKS_DATA.slice(0, 10);
  return subset.map((p, i) => {
    const d = new Date(p.lastDate);
    d.setDate(d.getDate() - (i + 1) * 11);
    return {
      id: `tag-${p.id}`,
      peakId: p.id,
      peakName: p.name,
      altitudeM: p.altitudeM,
      tier: p.tier,
      range: p.range,
      thumb: p.thumb,
      date: d.toISOString().slice(0, 10),
      taggedBy: TAGGED_NAMES[i % TAGGED_NAMES.length],
    };
  });
})();

function PhotoGrid({ photos, isTagged = false }) {
  const [query, setQuery] = React.useState("");
  const [tier, setTier] = React.useState(null);
  const [sort, setSort] = React.useState("recent");

  const filtered = React.useMemo(() => {
    let out = photos;
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((p) => p.peakName.toLowerCase().includes(q));
    if (tier) out = out.filter((p) => p.tier === tier);
    const sorted = [...out];
    if (sort === "recent")        sorted.sort((a, b) => b.date.localeCompare(a.date));
    if (sort === "altitude_desc") sorted.sort((a, b) => b.altitudeM - a.altitudeM);
    if (sort === "alpha")         sorted.sort((a, b) => a.peakName.localeCompare(b.peakName, "es"));
    return sorted;
  }, [photos, query, tier, sort]);

  return (
    <div style={{ background: "white", minHeight: "100%" }}>
      {/* Filter bar */}
      <div style={{
        background: "white",
        padding: "12px 16px",
        borderBottom: "1px solid #E5E7EB",
        position: "sticky", top: 0, zIndex: 5,
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isTagged ? "Buscar foto donde apareces…" : "Buscar foto por cima…"}
            style={{
              width: "100%",
              padding: "9px 12px 9px 32px",
              border: "1px solid #E5E7EB",
              background: "#F8FAFC",
              borderRadius: 10,
              fontSize: 13, color: "#0D2538",
              fontFamily: "var(--font-inter), Inter, sans-serif",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        {/* Quick filters */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          <QuickChip
            active={!tier}
            label="Todas"
            onClick={() => setTier(null)}
          />
          {RARITY_ORDER.map((k) => {
            const c = photos.filter((p) => p.tier === k).length;
            if (c === 0) return null;
            const r = RARITIES[k];
            const isActive = tier === k;
            return (
              <button
                key={k}
                onClick={() => setTier(isActive ? null : k)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 9px 4px 5px",
                  borderRadius: 999,
                  background: isActive ? r.color : "white",
                  color: isActive ? "white" : r.deep,
                  border: `1px solid ${isActive ? r.color : r.soft}`,
                  fontSize: 11, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap",
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                }}
              >
                <RarityFlower tier={k} size={13} />
                <span>{r.label}</span>
                <span style={{
                  opacity: 0.7, fontWeight: 600,
                  fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
                }}>{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Count strip */}
      <div style={{
        padding: "10px 16px 6px",
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
      }}>
        <div style={{
          fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "#94A3B8", fontWeight: 700,
        }}>{filtered.length} {filtered.length === 1 ? "foto" : "fotos"}</div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            border: "none", background: "transparent",
            fontSize: 12, fontWeight: 600, color: "#0D2538",
            cursor: "pointer",
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}>
          <option value="recent">Más recientes</option>
          <option value="altitude_desc">Mayor altitud</option>
          <option value="alpha">Alfabético</option>
        </select>
      </div>

      {/* Grid */}
      <div style={{
        padding: "0 16px 32px",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 6,
      }}>
        {filtered.length === 0 ? (
          <div style={{
            gridColumn: "1 / -1",
            textAlign: "center", padding: "32px 8px",
            color: "#94A3B8", fontSize: 13,
          }}>—</div>
        ) : filtered.map((p) => (
          <PhotoTile key={p.id} photo={p} isTagged={isTagged} />
        ))}
      </div>
    </div>
  );
}

function QuickChip({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 999,
        background: active ? "#0D2538" : "white",
        color: active ? "white" : "#5A6E84",
        border: `1px solid ${active ? "#0D2538" : "#E5E7EB"}`,
        fontSize: 11, fontWeight: 700,
        cursor: "pointer", whiteSpace: "nowrap",
        fontFamily: "var(--font-inter), Inter, sans-serif",
      }}>{label}</button>
  );
}

function PhotoTile({ photo, isTagged }) {
  const r = RARITIES[photo.tier];
  return (
    <div style={{
      position: "relative", aspectRatio: "1",
      borderRadius: 8, overflow: "hidden",
      background: "#0D2538",
      cursor: "pointer",
    }}>
      <PhotoPlaceholder thumb={photo.thumb} radius={0} />

      {/* Rarity flower top-left */}
      <div style={{
        position: "absolute", top: 5, left: 5,
        width: 20, height: 20, borderRadius: 999,
        background: "rgba(255,255,255,0.95)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      }}>
        <RarityFlower tier={photo.tier} size={14} />
      </div>

      {/* Tagged-by badge */}
      {isTagged && photo.taggedBy && (
        <div style={{
          position: "absolute", top: 5, right: 5,
          padding: "2px 6px",
          borderRadius: 999,
          background: "rgba(13,37,56,0.78)",
          color: "white",
          fontSize: 8, fontWeight: 700,
          letterSpacing: "0.02em",
          backdropFilter: "blur(4px)",
          fontFamily: "var(--font-inter), Inter, sans-serif",
        }}>📸 @{photo.taggedBy.toLowerCase()}</div>
      )}

      {/* Bottom overlay: peak + altitude + date */}
      <div style={{
        position: "absolute", inset: "auto 0 0 0",
        background: "linear-gradient(to top, rgba(7,18,31,0.92) 0%, rgba(7,18,31,0.55) 60%, transparent 100%)",
        padding: "16px 6px 5px",
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: "white",
          lineHeight: 1.15,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{photo.peakName}</div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 2,
        }}>
          <span style={{
            fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
            fontSize: 8, color: r.color, fontWeight: 700,
            letterSpacing: "0.02em",
          }}>{formatNumber(photo.altitudeM)} m</span>
          <span style={{
            fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
            fontSize: 8, color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.02em",
          }}>{formatDateShort(photo.date)}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PhotoGrid, PHOTOS_DATA, TAGGED_DATA });
