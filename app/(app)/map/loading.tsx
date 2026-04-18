export default function MapLoading() {
  return (
    <div
      style={{
        width: "100%",
        height: "calc(100svh - var(--top-nav-h, 3rem) - var(--bottom-nav-h, 0px))",
        background: "linear-gradient(170deg, #c8d8e8 0%, #b8cce0 40%, #a8bdd6 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      {/* Pulsing map pin icon */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5a88b0"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.7, animation: "mapPulse 1.4s ease-in-out infinite" }}
      >
        <style>{`
          @keyframes mapPulse {
            0%, 100% { transform: scale(1);   opacity: 0.7; }
            50%       { transform: scale(1.15); opacity: 1;   }
          }
        `}</style>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#5a88b0", letterSpacing: "0.02em" }}>
        Atlas
      </span>
    </div>
  );
}
