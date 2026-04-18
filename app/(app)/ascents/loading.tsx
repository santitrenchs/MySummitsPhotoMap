export default function AscentsLoading() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .sk {
          background: linear-gradient(90deg, #f0f2f5 25%, #e4e6ea 50%, #f0f2f5 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 12px" }}>

        {/* ── Search input + filter button ───────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <div className="sk" style={{ flex: 1, height: 42, borderRadius: 24 }} />
          <div className="sk" style={{ width: 100, height: 42, borderRadius: 24 }} />
        </div>

        {/* ── Ascent cards ───────────────────────────────────────────────── */}
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            border: "1px solid #e5e7eb", borderRadius: 16,
            overflow: "hidden", marginBottom: 16, background: "white",
          }}>
            {/* Card header: avatar + nombre */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px 8px" }}>
              <div className="sk" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }} />
              <div className="sk" style={{ height: 13, width: "40%" }} />
            </div>

            {/* Imagen 4:5 */}
            <div className="sk" style={{ width: "100%", aspectRatio: "4/5", borderRadius: 0 }} />

            {/* Caption */}
            <div style={{ padding: "10px 14px 12px" }}>
              <div className="sk" style={{ height: 13, width: "60%", marginBottom: 6 }} />
              <div className="sk" style={{ height: 11, width: "45%" }} />
            </div>
          </div>
        ))}

      </div>
    </>
  );
}
