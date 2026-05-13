"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Floating particle ────────────────────────────────────────────────────────
function Particle({ delay, x, size, duration }: { delay: number; x: number; size: number; duration: number }) {
  return (
    <div style={{
      position: "absolute",
      left: `${x}%`,
      bottom: "-10px",
      width: size,
      height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(212,160,23,0.6) 0%, transparent 70%)",
      animation: `mythicParticle ${duration}s ${delay}s infinite ease-in`,
      pointerEvents: "none",
    }} />
  );
}

// ─── Feature block ────────────────────────────────────────────────────────────
function FeatureBlock({ icon, title, body, delay }: { icon: string; title: string; body: string; delay: number }) {
  return (
    <div className="mythic-feature" style={{ animationDelay: `${delay}s` }}>
      <div style={{ fontSize: 20, marginBottom: 10 }}>{icon}</div>
      <div style={{
        fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
        color: "#D4A017", textTransform: "uppercase", marginBottom: 6,
      }}>{title}</div>
      <div style={{ fontSize: 13, color: "rgba(240,237,232,0.55)", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingMythic() {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const [revealed,  setRevealed]  = useState(false);
  const [tilt,      setTilt]      = useState({ x: 0, y: 0 });
  const [sweeping,  setSweeping]  = useState(false);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setRevealed(true); },
      { threshold: 0.12 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Light sweep every 5s
  useEffect(() => {
    const run = () => {
      setSweeping(true);
      setTimeout(() => setSweeping(false), 1100);
    };
    run();
    const id = setInterval(run, 5000);
    return () => clearInterval(id);
  }, []);

  // Mouse tilt on card
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const dx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
    const dy = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    setTilt({ x: dy * -7, y: dx * 7 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const particles = [
    { x: 8,  size: 3, delay: 0,   duration: 7  },
    { x: 20, size: 2, delay: 1.2, duration: 9  },
    { x: 35, size: 4, delay: 2.5, duration: 6  },
    { x: 52, size: 2, delay: 0.8, duration: 11 },
    { x: 65, size: 3, delay: 3.1, duration: 8  },
    { x: 78, size: 2, delay: 1.7, duration: 10 },
    { x: 90, size: 3, delay: 4.0, duration: 7  },
  ];

  return (
    <>
      <style>{`
        /* ── Keyframes ── */
        @keyframes mythicParticle {
          0%   { opacity: 0;   transform: translateY(0)   scale(1); }
          20%  { opacity: 0.8; }
          100% { opacity: 0;   transform: translateY(-320px) scale(0.4); }
        }
        @keyframes mythicGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes mythicFloat {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-12px) rotate(-3deg); }
        }
        @keyframes mythicSweep {
          0%   { left: -80%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { left: 120%; opacity: 0; }
        }
        @keyframes mythicPulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }

        /* ── Manifesto lines ── */
        .mythic-manifesto-line {
          opacity: 0;
          transform: translateX(-28px);
          transition: opacity 0.75s ease, transform 0.75s ease;
        }
        .mythic-revealed .mythic-manifesto-line { opacity: 1; transform: translateX(0); }
        .mythic-manifesto-line[data-d="1"] { transition-delay: 0.28s; }
        .mythic-manifesto-line[data-d="2"] { transition-delay: 0.46s; }
        .mythic-manifesto-line[data-d="3"] { transition-delay: 0.64s; }

        /* ── CTA button ── */
        .mythic-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: rgba(212,160,23,0.12);
          border: 1px solid rgba(212,160,23,0.45);
          border-radius: 100px;
          color: #D4A017;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.2s;
        }
        .mythic-cta:hover {
          background: rgba(212,160,23,0.22);
          border-color: rgba(212,160,23,0.8);
          box-shadow: 0 0 24px rgba(212,160,23,0.25);
          transform: translateY(-1px);
        }

        /* ── Reveal animations ── */
        .mythic-reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.75s ease, transform 0.75s ease;
        }
        .mythic-revealed .mythic-reveal {
          opacity: 1;
          transform: translateY(0);
        }
        .mythic-reveal[data-d="1"] { transition-delay: 0.10s; }
        .mythic-reveal[data-d="2"] { transition-delay: 0.22s; }
        .mythic-reveal[data-d="3"] { transition-delay: 0.34s; }
        .mythic-reveal[data-d="4"] { transition-delay: 0.46s; }
        .mythic-reveal[data-d="5"] { transition-delay: 0.58s; }

        .mythic-card-reveal {
          opacity: 0;
          transform: scale(0.88) translateY(20px);
          filter: blur(8px);
          transition: opacity 0.9s ease, transform 0.9s ease, filter 0.9s ease;
          transition-delay: 0.3s;
        }
        .mythic-revealed .mythic-card-reveal {
          opacity: 1;
          transform: scale(1) translateY(0);
          filter: blur(0);
        }

        /* ── Responsive ── */
        .mythic-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 64px;
          align-items: center;
        }
        .mythic-card-col { order: 1; display: flex; flex-direction: column; align-items: center; gap: 0; }
        /* Tablet: two columns side by side */
        @media (min-width: 640px) and (max-width: 899px) {
          .mythic-layout { grid-template-columns: 1fr auto; gap: 40px; }
          .mythic-card-col { order: 1; }
        }
        @media (min-width: 900px) {
          .mythic-layout { grid-template-columns: 1fr 1fr; gap: 80px; }
        }
        .mythic-features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 36px;
        }
        @media (min-width: 600px) {
          .mythic-features-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <section
        ref={sectionRef}
        className={revealed ? "mythic-revealed" : ""}
        style={{
          position: "relative",
          background: "linear-gradient(170deg, #04080F 0%, #07111E 40%, #060D18 70%, #030710 100%)",
          overflow: "hidden",
          padding: "72px 0 36px",
        }}
      >
        {/* ── Ambient glow blobs ── */}
        <div style={{
          position: "absolute", top: "-10%", left: "55%",
          width: 600, height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,160,23,0.07) 0%, transparent 70%)",
          animation: "mythicGlow 6s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-5%", left: "5%",
          width: 400, height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(15,60,100,0.35) 0%, transparent 70%)",
          animation: "mythicGlow 8s 2s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* ── Topo texture overlay (SVG lines) ── */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.035, pointerEvents: "none" }}
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1200 800"
        >
          {[60,120,180,240,310,390,480,580,700,840].map((y, i) => (
            <ellipse key={i} cx="600" cy={y} rx={300 + i * 55} ry={28 + i * 6}
              fill="none" stroke="#D4A017" strokeWidth="0.8" />
          ))}
        </svg>

        {/* ── Floating particles ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {particles.map((p, i) => <Particle key={i} {...p} />)}
        </div>

        {/* ── Content ── */}
        <div className="ld-container">
          <div className="mythic-layout">

            {/* Left: storytelling */}
            <div>
              {/* Eyebrow */}
              <div className="mythic-reveal" data-d="1" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                marginBottom: 24,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#D4A017",
                  boxShadow: "0 0 8px rgba(212,160,23,0.8)",
                  animation: "mythicPulse 2s ease-in-out infinite",
                }} />
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
                  color: "#D4A017", textTransform: "uppercase",
                }}>Mythic Collection</span>
              </div>

              {/* Heading */}
              <h2 className="mythic-reveal ld-display" data-d="2" style={{
                fontSize: "clamp(36px, 5vw, 58px)",
                margin: "0 0 24px",
                lineHeight: 1.05,
              }}>
                <span style={{ color: "#F0EDE8", display: "block" }}>Algunas cimas</span>
                <span style={{ color: "#F0EDE8", display: "block" }}>no son raras.</span>
                <span style={{
                  display: "block",
                  background: "linear-gradient(90deg, #D4A017 0%, #F5C842 45%, #D4A017 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 18px rgba(212,160,23,0.4))",
                }}>Son Mythic.</span>
              </h2>

              {/* Sub */}
              {/* Manifesto lines */}
              <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 32 }}>
                {([
                  { d: "1", line: "Las montañas que todo alpinista conoce.", sub: null },
                  { d: "2", line: "Contadas cimas por cordillera.", sub: "Las que definen una vida montañera." },
                  { d: "3", line: "No son las más difíciles.", sub: "Son las que hay que subir una vez en la vida." },
                ] as const).map(({ d, line, sub }) => (
                  <div key={d} className="mythic-manifesto-line" data-d={d}
                    style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                    <span style={{
                      color: "#D4A017", fontSize: 16, lineHeight: 1,
                      flexShrink: 0, marginTop: 5,
                      filter: "drop-shadow(0 0 6px rgba(212,160,23,0.5))",
                    }}>✦</span>
                    <div>
                      <div style={{
                        fontSize: "clamp(18px, 1.9vw, 22px)",
                        color: "#F0EDE8", fontWeight: 700, lineHeight: 1.25,
                        letterSpacing: "-0.01em",
                      }}>{line}</div>
                      {sub && (
                        <div style={{
                          fontSize: "clamp(14px, 1.3vw, 16px)",
                          color: "rgba(240,237,232,0.42)",
                          marginTop: 8, lineHeight: 1.6, fontWeight: 400,
                        }}>{sub}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quote only */}
              <div className="mythic-reveal" data-d="5" style={{ marginTop: 28 }}>
                <blockquote style={{
                  margin: 0,
                  borderLeft: "2px solid rgba(212,160,23,0.4)",
                  paddingLeft: 20,
                }}>
                  <p style={{
                    fontSize: "clamp(18px, 2.2vw, 24px)",
                    fontFamily: "var(--font-space, sans-serif)",
                    fontWeight: 700,
                    color: "#F0EDE8",
                    lineHeight: 1.35,
                    margin: 0,
                  }}>
                    "Algunas cimas no se explican.<br />Solo se suben."
                  </p>
                </blockquote>
              </div>
            </div>

            {/* Right: Mythic card */}
            <div className="mythic-card-col mythic-card-reveal">
              <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  position: "relative",
                  width: 240,
                  perspective: 1000,
                  cursor: "default",
                }}
              >
                {/* Card — same structure as LandingCards CardFace front */}
                <div style={{
                  position: "relative",
                  width: 240,
                  height: 410,
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#FFFFFF",
                  border: "1px solid rgba(212,160,23,0.35)",
                  boxShadow: [
                    "0 0 0 1px rgba(212,160,23,0.25)",
                    "0 0 20px 4px rgba(212,160,23,0.45)",
                    "0 0 50px 12px rgba(212,160,23,0.25)",
                    "0 0 90px 24px rgba(212,160,23,0.12)",
                    "0 24px 60px rgba(0,0,0,0.5)",
                  ].join(", "),
                  animation: "mythicFloat 5s ease-in-out infinite",
                  transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotate(-3deg)`,
                  transition: tilt.x === 0 && tilt.y === 0
                    ? "transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)"
                    : "transform 0.1s ease",
                  willChange: "transform",
                  display: "flex", flexDirection: "column",
                }}>

                  {/* Light sweep */}
                  <div style={{ position: "absolute", inset: 0, zIndex: 10, overflow: "hidden", borderRadius: 18, pointerEvents: "none" }}>
                    <div style={{
                      position: "absolute", top: 0, bottom: 0, width: "55%",
                      background: "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                      animation: sweeping ? "mythicSweep 1.0s ease-in-out forwards" : "none",
                    }} />
                  </div>

                  {/* User header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", flexShrink: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "#EC4899",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#fff",
                    }}>LM</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0D2538" }}>Luc Moreau</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>22 jul 2023</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, opacity: 0.3 }}>
                      {[0,1,2].map(d => (
                        <div key={d} style={{ width: 3, height: 3, borderRadius: "50%", background: "#0D2538" }} />
                      ))}
                    </div>
                  </div>

                  {/* Photo area */}
                  <div style={{ flex: 1, position: "relative", overflow: "hidden", margin: "0 10px", borderRadius: 14 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/landing-montblanc.webp"
                      alt="Mont Blanc"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)",
                    }} />
                    {/* Mythic badge — top left */}
                    <div style={{
                      position: "absolute", top: 10, left: 10,
                      background: "linear-gradient(135deg, #D4A017, #F5C842)",
                      borderRadius: 100, padding: "4px 9px",
                      fontSize: 9, fontWeight: 800, color: "#1A0E00",
                      letterSpacing: "0.10em", textTransform: "uppercase",
                      boxShadow: "0 2px 10px rgba(212,160,23,0.5)",
                    }}>✦ MYTHIC</div>
                    {/* Peak overlay */}
                    <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 3, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
                        Mont Blanc
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
                        📍 45.8326°N · 6.8652°E
                      </div>
                    </div>
                  </div>

                  {/* Stat band */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px", flexShrink: 0 }}>
                    <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>RAREZA</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#A855F7", display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                        ✿ <span>Edelweiss</span>
                      </div>
                    </div>
                    <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>ALTITUD</div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#0D2538", whiteSpace: "nowrap" }}>4.808 m</div>
                    </div>
                    <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: "rgba(13,37,56,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>RECOMPENSA</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap" }}>+120 EP</div>
                    </div>
                  </div>

                </div>

                {/* Card shadow/glow on floor */}
                <div style={{
                  position: "absolute",
                  bottom: -24, left: "10%", right: "10%", height: 40,
                  background: "radial-gradient(ellipse, rgba(212,160,23,0.2) 0%, transparent 70%)",
                  filter: "blur(12px)",
                  animation: "mythicGlow 5s ease-in-out infinite",
                  pointerEvents: "none",
                }} />
              </div>

              {/* CTA below card */}
              <a href="/register" className="mythic-cta" style={{ marginTop: 36 }}>
                Explora la Mythic →
              </a>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
