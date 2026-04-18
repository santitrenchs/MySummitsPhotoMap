export default function HomeLoading() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .sk {
          background: linear-gradient(90deg, #e8edf2 25%, #d8dfe8 50%, #e8edf2 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
        .sk-dark {
          background: linear-gradient(90deg, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.07) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        {/* ── Hero section (283px, dark bg igual que la página real) ───────── */}
        <div style={{
          height: 283,
          background: "#1c2d3f",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-between",
          padding: "24px 28px 26px",
          overflow: "hidden",
        }}>
          {/* Bloque superior: avatar + nombre + subtítulo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            {/* Avatar circle */}
            <div style={{
              width: 78, height: 78, borderRadius: "50%",
              background: "rgba(255,255,255,0.10)",
              border: "2px solid rgba(255,255,255,0.15)",
              marginBottom: 10,
            }} />
            {/* Nombre */}
            <div className="sk-dark" style={{ height: 20, width: 120, marginBottom: 8 }} />
            {/* Subtítulo */}
            <div className="sk-dark" style={{ height: 13, width: 90 }} />
          </div>

          {/* Bloque inferior: 3 métricas */}
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div className="sk-dark" style={{ height: 18, width: 32 }} />
                <div className="sk-dark" style={{ height: 10, width: 48 }} />
                {i < 2 && (
                  <div style={{ position: "absolute" }} /> // spacer handled by flex
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px 16px 0" }}>

          {/* ── Progression card (nivel en progreso) ─────────────────────── */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            {/* Círculo nivel */}
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: "#bfdbfe",
              boxShadow: "0 0 0 3px #dbeafe",
            }} />
            {/* Tarjeta nivel */}
            <div style={{
              flex: 1,
              background: "#eff6ff",
              border: "1.5px solid #bfdbfe",
              borderRadius: 12, padding: "10px 12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div className="sk" style={{ width: 20, height: 20, borderRadius: 4 }} />
                <div className="sk" style={{ height: 13, width: "50%" }} />
              </div>
              {/* Requirement pills */}
              <div style={{ display: "flex", gap: 6 }}>
                <div className="sk" style={{ height: 22, width: 70, borderRadius: 6 }} />
                <div className="sk" style={{ height: 22, width: 90, borderRadius: 6 }} />
              </div>
              {/* Progress bar */}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #dbeafe" }}>
                <div style={{ height: 4, borderRadius: 2, background: "#dbeafe", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: "40%", borderRadius: 2, background: "#93c5fd" }} />
                </div>
                <div className="sk" style={{ height: 12, width: "55%" }} />
              </div>
            </div>
          </div>

          {/* Ver todos los niveles button */}
          <div className="sk" style={{ height: 36, borderRadius: 10, marginBottom: 24 }} />

          {/* ── 3 KPI boxes (fotos · regiones · amigos) ──────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="sk" style={{ height: 70, borderRadius: 12 }} />
            ))}
          </div>

          {/* ── Section title: leaderboard ────────────────────────────────── */}
          <div className="sk" style={{ height: 14, width: 160, marginBottom: 14 }} />

          {/* Leaderboard rows */}
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div className="sk" style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="sk" style={{ height: 13, width: "55%", marginBottom: 6 }} />
                <div className="sk" style={{ height: 10, width: "30%" }} />
              </div>
              <div className="sk" style={{ width: 38, height: 22, borderRadius: 10 }} />
            </div>
          ))}

          {/* ── Section title: últimas cimas ─────────────────────────────── */}
          <div className="sk" style={{ height: 14, width: 130, margin: "20px 0 12px" }} />

          {/* Horizontal ascent cards */}
          <div style={{ display: "flex", gap: 10, overflow: "hidden", marginBottom: 8 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ flexShrink: 0, width: 110 }}>
                <div className="sk" style={{ width: 110, aspectRatio: "4/5", borderRadius: 12 }} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
