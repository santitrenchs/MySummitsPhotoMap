/* ─────────────────────────────────────────────────────────────────
   VARIANT C — Galería de trofeos
   Filas anchas tipo carta horizontal: foto retrato a la izquierda
   con nombre y altitud overlay; panel meta con rareza, ×N visualizado
   como pila de capturas + fechas.
   ───────────────────────────────────────────────────────────────── */

function VariantC({ peaks, density = "cozy", showDistribution = true, initialFiltersOpen = false, initialFilters = null }) {
  const f = usePeakFilters(peaks);
  const [filtersOpen, setFiltersOpen] = React.useState(initialFiltersOpen);
  const activeFilters = !!(f.query || f.tier || f.range || f.sort !== "altitude_desc");

  // Apply initial filters once (used by the "filters open" demo artboard)
  const appliedInitial = React.useRef(false);
  React.useEffect(() => {
    if (appliedInitial.current || !initialFilters) return;
    appliedInitial.current = true;
    if (initialFilters.query)  f.setQuery(initialFilters.query);
    if (initialFilters.tier)   f.setTier(initialFilters.tier);
    if (initialFilters.range)  f.setRange(initialFilters.range);
    if (initialFilters.sort)   f.setSort(initialFilters.sort);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAscents = peaks.reduce((s, p) => s + p.count, 0);
  const raritiesSeen = new Set(peaks.map((p) => p.tier)).size;

  return (
    <div style={{
      background: "linear-gradient(180deg, #0D2538 0%, #112A40 160px, #F4F7FA 160px)",
      minHeight: "100%",
    }}>
      {/* Collection-wide KPIs (on dark BG) */}
      {showDistribution && peaks.length > 0 && (
        <CollectionStatsStrip
          totalUnique={peaks.length}
          totalAscents={totalAscents}
          raritiesSeen={raritiesSeen}
        />
      )}

      {/* Trophy carousel */}
      {showDistribution && peaks.length > 0 && (
        <div style={{ padding: "0 0 16px" }}>
          <TrophyCarousel peaks={peaks} />
        </div>
      )}
      {!showDistribution && <div style={{ height: 16 }} />}

      {/* Filters */}
      <div style={{
        background: "rgba(244,247,250,0.92)",
        backdropFilter: "blur(8px)",
        padding: "0 16px 12px",
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          marginBottom: filtersOpen ? 10 : 0,
        }}>
          <div style={{ position: "relative", flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={f.query}
              onChange={(e) => f.setQuery(e.target.value)}
              placeholder="Buscar cima…"
              style={{
                width: "100%",
                padding: "10px 12px 10px 32px",
                border: "1px solid #E5E7EB",
                background: "white",
                borderRadius: 12,
                fontSize: 13, color: "#0D2538",
                fontFamily: "var(--font-inter), Inter, sans-serif",
                outline: "none", boxSizing: "border-box",
                boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
              }}
            />
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 14px",
              borderRadius: 12,
              background: filtersOpen || f.tier || f.range || f.sort !== "altitude_desc" ? "#0D2538" : "white",
              color: filtersOpen || f.tier || f.range || f.sort !== "altitude_desc" ? "white" : "#0D2538",
              border: "1px solid #E5E7EB",
              fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(13,37,56,0.04)",
              fontFamily: "var(--font-inter), Inter, sans-serif",
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            <span>Filtros</span>
            {(f.tier || f.range || f.sort !== "altitude_desc") && (
              <span style={{
                background: filtersOpen ? "white" : "#FF5D2D",
                color: filtersOpen ? "#0D2538" : "white",
                fontSize: 10, fontWeight: 800,
                width: 16, height: 16, borderRadius: 999,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
              }}>{[f.tier, f.range, f.sort !== "altitude_desc"].filter(Boolean).length}</span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div style={{
            background: "white",
            borderRadius: 16,
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 24px rgba(13,37,56,0.08)",
            overflow: "hidden",
          }}>
            {/* Panel header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid #F1F5F9",
            }}>
              <div style={{
                fontFamily: "var(--font-space, sans-serif)",
                fontSize: 14, fontWeight: 700, color: "#0D2538",
                letterSpacing: "-0.01em",
              }}>Filtrar tus cimas</div>
              <button
                onClick={() => setFiltersOpen(false)}
                aria-label="Cerrar filtros"
                style={{
                  width: 26, height: 26, borderRadius: 999,
                  background: "#F1F5F9", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#5A6E84",
                }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Rarity section — full rarity bestiary, even if 0 (locked) */}
            <div style={{ padding: "14px 14px 4px" }}>
              <FilterLabel>Rareza</FilterLabel>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 6,
                marginBottom: 14,
              }}>
                {RARITY_ORDER.map((k) => {
                  const c = peaks.filter((p) => p.tier === k).length;
                  const isActive = f.tier === k;
                  const isLocked = c === 0;
                  const r = RARITIES[k];
                  return (
                    <button
                      key={k}
                      onClick={() => !isLocked && f.setTier(isActive ? null : k)}
                      disabled={isLocked}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px",
                        borderRadius: 12,
                        background: isActive ? r.color : (isLocked ? "#F8FAFC" : "white"),
                        color: isActive ? "white" : (isLocked ? "#94A3B8" : r.deep),
                        border: `1px solid ${isActive ? r.color : (isLocked ? "#F1F5F9" : r.soft)}`,
                        textAlign: "left", minWidth: 0,
                        cursor: isLocked ? "default" : "pointer",
                        fontFamily: "var(--font-inter), Inter, sans-serif",
                        opacity: isLocked ? 0.55 : 1,
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      <div style={{
                        flexShrink: 0,
                        width: 26, height: 26, borderRadius: 999,
                        background: isActive ? "rgba(255,255,255,0.18)" : (isLocked ? "#F1F5F9" : r.soft),
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <RarityFlower tier={k} size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          letterSpacing: "-0.005em",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{r.label}</span>
                        <span style={{
                          fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
                          fontSize: 9, opacity: 0.8, fontWeight: 600,
                          letterSpacing: "0.01em",
                          whiteSpace: "nowrap",
                        }}>{r.range}</span>
                      </div>
                      <span style={{
                        flexShrink: 0,
                        fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
                        fontSize: 11, fontWeight: 800,
                        padding: "2px 7px", borderRadius: 999,
                        background: isActive ? "rgba(255,255,255,0.22)" : (isLocked ? "transparent" : r.soft),
                        color: isActive ? "white" : (isLocked ? "#CBD5E1" : r.deep),
                        minWidth: 28, textAlign: "center",
                      }}>{isLocked ? "—" : c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cordillera */}
            <div style={{ padding: "0 14px 14px" }}>
              <FilterLabel>Cordillera</FilterLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {RANGE_LIST.map((rg) => {
                  const c = peaks.filter((p) => p.range === rg).length;
                  const isActive = f.range === rg;
                  return (
                    <button
                      key={rg}
                      onClick={() => f.setRange(isActive ? null : rg)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "6px 10px 6px 10px",
                        borderRadius: 999,
                        background: isActive ? "#0D2538" : "white",
                        color: isActive ? "white" : "#0D2538",
                        border: `1px solid ${isActive ? "#0D2538" : "#E5E7EB"}`,
                        fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-inter), Inter, sans-serif",
                      }}>
                      <span>{rg}</span>
                      <span style={{
                        fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
                        fontSize: 10, fontWeight: 700,
                        opacity: isActive ? 0.7 : 0.5,
                      }}>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort — segmented */}
            <div style={{ padding: "0 14px 14px" }}>
              <FilterLabel>Orden</FilterLabel>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 6,
              }}>
                {SORT_OPTIONS.map((o) => {
                  const isActive = f.sort === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => f.setSort(o.id)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: isActive ? "#0D2538" : "#F8FAFC",
                        color: isActive ? "white" : "#0D2538",
                        border: `1px solid ${isActive ? "#0D2538" : "#F1F5F9"}`,
                        fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "var(--font-inter), Inter, sans-serif",
                      }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: 999,
                        background: isActive ? "white" : "transparent",
                        border: `1.5px solid ${isActive ? "white" : "#CBD5E1"}`,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {isActive && (
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: "#0D2538" }} />
                        )}
                      </span>
                      <span>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action footer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "12px 14px",
              borderTop: "1px solid #F1F5F9",
              background: "#FAFBFC",
            }}>
              <button
                onClick={() => { f.setQuery(""); f.setTier(null); f.setRange(null); f.setSort("altitude_desc"); }}
                disabled={!activeFilters}
                style={{
                  padding: "8px 4px",
                  background: "transparent",
                  color: activeFilters ? "#5A6E84" : "#CBD5E1",
                  border: "none",
                  fontSize: 12, fontWeight: 600,
                  cursor: activeFilters ? "pointer" : "default",
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                }}>Limpiar todo</button>
              <button
                onClick={() => setFiltersOpen(false)}
                style={{
                  padding: "9px 16px",
                  background: "#2F7A5F", color: "white",
                  border: "none", borderRadius: 999,
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                Ver {f.filtered.length} {f.filtered.length === 1 ? "cima" : "cimas"}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active filter recap chips (when collapsed) */}
      {!filtersOpen && (f.tier || f.range || f.sort !== "altitude_desc") && (
        <div style={{
          padding: "0 16px 8px",
          display: "flex", flexWrap: "wrap", gap: 6,
        }}>
          {f.tier && (
            <ActiveChip
              label={RARITIES[f.tier].label}
              color={RARITIES[f.tier].color}
              onClear={() => f.setTier(null)}
            />
          )}
          {f.range && (
            <ActiveChip
              label={f.range}
              color="#0D2538"
              onClear={() => f.setRange(null)}
            />
          )}
          {f.sort !== "altitude_desc" && (
            <ActiveChip
              label={SORT_OPTIONS.find((o) => o.id === f.sort).label}
              color="#2F7A5F"
              onClear={() => f.setSort("altitude_desc")}
            />
          )}
        </div>
      )}

      {/* Cards */}
      <div style={{ padding: "8px 16px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
        {f.filtered.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 16, padding: "36px 20px",
            textAlign: "center", border: "1px solid #E5E7EB",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538", marginBottom: 4 }}>
              Ninguna carta encaja
            </div>
            <div style={{ fontSize: 12, color: "#5A6E84" }}>
              Prueba con menos filtros.
            </div>
          </div>
        ) : f.filtered.map((p) => (
          <TrophyCard key={p.id} peak={p} />
        ))}
      </div>
    </div>
  );
}

function FilterLabel({ children }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
      fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
      color: "#94A3B8", fontWeight: 700, marginBottom: 6,
    }}>{children}</div>
  );
}

function ActiveChip({ label, color, onClear }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 4px 4px 10px",
      borderRadius: 999,
      background: "white", border: `1px solid ${color}55`,
      color: color,
      fontSize: 11, fontWeight: 700,
      fontFamily: "var(--font-inter), Inter, sans-serif",
    }}>
      <span>{label}</span>
      <button onClick={onClear} style={{
        width: 16, height: 16, borderRadius: 999,
        background: `${color}1A`, border: "none",
        color: color, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, lineHeight: 1,
      }}>×</button>
    </span>
  );
}

function TrophyCarousel({ peaks }) {
  const [index, setIndex] = React.useState(0);
  const scrollerRef = React.useRef(null);

  const trophies = React.useMemo(() => {
    if (peaks.length === 0) return [];
    const byCount = [...peaks].sort((a, b) => b.count - a.count || b.altitudeM - a.altitudeM)[0];
    const byAlt   = [...peaks].sort((a, b) => b.altitudeM - a.altitudeM)[0];
    const byTier  = [...peaks].sort((a, b) => RARITY_ORDER.indexOf(b.tier) - RARITY_ORDER.indexOf(a.tier) || b.altitudeM - a.altitudeM)[0];
    const byRecent = [...peaks].sort((a, b) => b.lastDate.localeCompare(a.lastDate))[0];
    return [
      { id: "most",   eyebrow: "★  Cima más subida",    accent: "#FF5D2D", peak: byCount,  highlightLabel: "Ascensiones", highlightValue: `×${byCount.count}` },
      { id: "alt",    eyebrow: "⛰  Cima más alta",      accent: "#0E7490", peak: byAlt,    highlightLabel: "Altitud",     highlightValue: `${formatNumber(byAlt.altitudeM)} m` },
      { id: "rare",   eyebrow: "✨  Rareza más rara",    accent: RARITIES[byTier.tier].color, peak: byTier,  highlightLabel: "Especie",  highlightValue: RARITIES[byTier.tier].label },
      { id: "recent", eyebrow: "◐  Última cima",         accent: "#2F7A5F", peak: byRecent, highlightLabel: "Conquistada", highlightValue: formatDateShort(byRecent.lastDate) },
    ];
  }, [peaks]);

  // Update active dot on scroll
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const i = Math.round(el.scrollLeft / w);
      setIndex((cur) => (cur !== i ? i : cur));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function goTo(i) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        className="tc-scroller"
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <style>{`
          .tc-scroller::-webkit-scrollbar { display: none; }
        `}</style>
        {trophies.map((t, i) => (
          <div
            key={t.id}
            style={{
              flex: "0 0 100%",
              scrollSnapAlign: "start",
              padding: "0 16px",
              boxSizing: "border-box",
            }}
          >
            <TrophyHeroCard trophy={t} position={i + 1} total={trophies.length} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{
        display: "flex", gap: 6, justifyContent: "center",
        marginTop: 12,
      }}>
        {trophies.map((t, i) => (
          <button
            key={t.id}
            onClick={() => goTo(i)}
            aria-label={t.eyebrow}
            style={{
              width: i === index ? 22 : 6, height: 6,
              borderRadius: 999,
              background: i === index ? "#0D2538" : "rgba(13,37,56,0.22)",
              border: "none", cursor: "pointer", padding: 0,
              transition: "all 0.25s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TrophyHeroCard({ trophy, position, total }) {
  const { peak, eyebrow, accent, highlightLabel, highlightValue } = trophy;
  const r = RARITIES[peak.tier];
  const isLongValue = highlightValue.length > 7;
  return (
    <div style={{
      background: "white",
      borderRadius: 18,
      padding: 14,
      border: "1px solid rgba(13,37,56,0.07)",
      boxShadow: "0 1px 3px rgba(13,37,56,0.06), 0 12px 32px rgba(13,37,56,0.10)",
      display: "flex",
      gap: 14,
      alignItems: "stretch",
      position: "relative",
    }}>
      <div style={{ position: "relative", width: 84, height: 108, flexShrink: 0 }}>
        <PhotoPlaceholder thumb={peak.thumb} radius={12} />
        <div style={{
          position: "absolute", top: -4, right: -4,
          width: 28, height: 28, borderRadius: 999,
          background: "white",
          boxShadow: "0 2px 8px rgba(13,37,56,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <RarityFlower tier={peak.tier} size={20} />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top row: eyebrow + position */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
            fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
            color: accent, fontWeight: 700,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            flex: 1, minWidth: 0,
          }}>{eyebrow}</div>
          <span style={{
            fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
            fontSize: 9, letterSpacing: "0.10em",
            color: "#CBD5E1", fontWeight: 700, flexShrink: 0,
          }}>{position}/{total}</span>
        </div>

        <div style={{
          fontFamily: "var(--font-space, sans-serif)",
          fontSize: 17, fontWeight: 700, color: "#0D2538",
          letterSpacing: "-0.015em", lineHeight: 1.18,
          marginTop: 4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{peak.name}</div>
        <div style={{
          fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
          fontSize: 11, color: r.deep, fontWeight: 700, marginTop: 2,
        }}>{formatNumber(peak.altitudeM)} m · {r.label}</div>

        <div style={{ flex: 1, minHeight: 6 }} />

        {/* HERO STAT — the one thing that makes this trophy special */}
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: "1px dashed #E5E7EB",
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
              fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#94A3B8", fontWeight: 700,
            }}>{peak.range}</div>
            <div style={{
              fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
              fontSize: 10, color: "#5A6E84", fontWeight: 600, marginTop: 2,
            }}>{peak.country}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
              fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
              color: "#94A3B8", fontWeight: 700,
            }}>{highlightLabel}</div>
            <div style={{
              fontFamily: "var(--font-space, sans-serif)",
              fontSize: isLongValue ? 20 : 28, fontWeight: 800,
              color: accent, letterSpacing: "-0.025em", lineHeight: 1,
              marginTop: 3,
            }}>{highlightValue}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionStatsStrip({ totalUnique, totalAscents, raritiesSeen }) {
  return (
    <div style={{
      padding: "14px 16px 14px",
    }}>
      <div style={{
        fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
        fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.55)", fontWeight: 700,
        marginBottom: 6,
      }}>Tu colección</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <CollectionStat value={totalUnique} label="únicas" />
        <CollectionStat value={totalAscents} label="ascensiones" />
        <CollectionStat value={`${raritiesSeen}/9`} label="rarezas" />
      </div>
    </div>
  );
}

function CollectionStat({ value, label }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
      <span style={{
        fontFamily: "var(--font-space, sans-serif)",
        fontSize: 22, fontWeight: 700, color: "white",
        letterSpacing: "-0.025em", lineHeight: 1,
      }}>{value}</span>
      <span style={{
        fontFamily: "var(--font-inter), Inter, sans-serif",
        fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500,
      }}>{label}</span>
    </div>
  );
}

function MiniStat({ value, label, border = false, accent = null }) {
  return (
    <div style={{
      borderLeft: border ? "1px solid #F1F5F9" : "none",
      paddingLeft: border ? 10 : 0,
      paddingRight: 10,
      minWidth: 0,
    }}>
      <div style={{
        fontFamily: "var(--font-space, sans-serif)",
        fontSize: 15, fontWeight: 700, color: accent || "#0D2538",
        letterSpacing: "-0.015em", lineHeight: 1,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</div>
      <div style={{
        fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
        fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase",
        color: "#94A3B8", fontWeight: 700, marginTop: 3,
      }}>{label}</div>
    </div>
  );
}

function TrophyCard({ peak }) {
  const r = RARITIES[peak.tier];
  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      border: "1px solid rgba(13,37,56,0.06)",
      boxShadow: "0 1px 3px rgba(13,37,56,0.04)",
      display: "flex",
      overflow: "hidden",
      cursor: "pointer",
      transition: "transform 0.15s, box-shadow 0.15s",
      position: "relative",
    }}>
      {/* Rarity vertical strip */}
      <div style={{
        width: 4, background: r.color, flexShrink: 0,
      }} />

      {/* Photo with overlays */}
      <div style={{ position: "relative", width: 96, flexShrink: 0 }}>
        <PhotoPlaceholder thumb={peak.thumb} radius={0} />
        <div style={{
          position: "absolute", inset: "auto 0 0 0", height: "55%",
          background: "linear-gradient(to top, rgba(7,18,31,0.78), transparent)",
        }} />
        <div style={{
          position: "absolute", bottom: 6, left: 6, right: 6,
          fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
          fontSize: 10, color: "white", fontWeight: 700,
          letterSpacing: "0.04em",
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}>{formatNumber(peak.altitudeM)} m</div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, minWidth: 0,
        padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-space, sans-serif)",
              fontSize: 14, fontWeight: 700, color: "#0D2538",
              letterSpacing: "-0.01em", lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{peak.name}</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              marginTop: 4,
              padding: "2px 7px",
              borderRadius: 999,
              background: r.soft, color: r.deep,
              fontSize: 10, fontWeight: 700,
              fontFamily: "var(--font-inter), Inter, sans-serif",
            }}>
              <RarityFlower tier={peak.tier} size={11} />
              <span>{r.label}</span>
            </div>
          </div>
          <CaptureStack count={peak.count} color={r.color} />
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: "auto" }}>
          <div>
            <div style={{
              fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
              fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#94A3B8", fontWeight: 700,
            }}>Última</div>
            <div style={{
              fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
              fontSize: 11, fontWeight: 700, color: "#0D2538",
              letterSpacing: "0.02em",
            }}>{formatDateShort(peak.lastDate)}</div>
          </div>
          {peak.count > 1 && (
            <div>
              <div style={{
                fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
                fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#94A3B8", fontWeight: 700,
              }}>Primera</div>
              <div style={{
                fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
                fontSize: 11, fontWeight: 700, color: "#5A6E84",
                letterSpacing: "0.02em",
              }}>{formatDateShort(peak.firstDate)}</div>
            </div>
          )}
          <div style={{ flex: 1 }} />
          <span style={{
            fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
            fontSize: 10, color: "#CBD5E1", fontWeight: 600,
          }}>{peak.range}</span>
        </div>
      </div>
    </div>
  );
}

function CaptureStack({ count, color }) {
  // Stack of N small chips, max 4 visible + "+rest"
  const visible = Math.min(count, 4);
  const overflow = count - visible;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      paddingRight: count > 1 ? 4 : 0,
    }}>
      {Array.from({ length: visible }).map((_, i) => (
        <div key={i} style={{
          width: 18, height: 22,
          borderRadius: 4,
          background: i === 0 ? color : "white",
          color: i === 0 ? "white" : color,
          marginLeft: i === 0 ? 0 : -6,
          border: `1.5px solid ${color}`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
          fontSize: 9, fontWeight: 800,
          boxShadow: i === 0 ? "none" : "0 1px 2px rgba(13,37,56,0.08)",
          zIndex: visible - i,
          position: "relative",
        }}>
          {i === 0 && (
            <span style={{ fontFamily: "var(--font-mono-landing, ui-monospace, monospace)", fontSize: 11, fontWeight: 800 }}>
              ×{count}
            </span>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <span style={{
          marginLeft: 4,
          fontSize: 10, fontWeight: 700, color: color,
          fontFamily: "var(--font-mono-landing, ui-monospace, monospace)",
        }}>+{overflow}</span>
      )}
    </div>
  );
}

Object.assign(window, { VariantC });
