"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    number: "01",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3C8.477 3 4 7.477 4 13s4.477 10 10 10 10-4.477 10-10S19.523 3 14 3z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14 8v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="13" r="1.5" fill="currentColor" />
        <path d="M4 13h2M22 13h2M14 3v2M14 23v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Explora el Atlas",
    description:
      "Abre el mapa interactivo de Peakadex. Busca tu próxima cima, filtra por rareza o región y márcala como objetivo.",
    color: "#3B82F6",
  },
  {
    number: "02",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="7" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="15" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7V5M18 7V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="19" cy="10" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: "Sube y captura",
    description:
      "Cuando llegues a la cumbre, registra tu ascensión. Añade una foto, la ruta y la fecha. Tu historia queda grabada para siempre.",
    color: "#F97316",
  },
  {
    number: "03",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4L6 8v8c0 4.418 3.582 7.5 8 8 4.418-.5 8-3.582 8-8V8L14 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 14l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Desbloquea tu rareza",
    description:
      "Según la altitud de la cima, Peakadex te asigna una rareza: Daisy, Gentian, Edelweiss... hasta Snow Lotus. Y genera tu carta de coleccionista.",
    color: "#A855F7",
  },
  {
    number: "04",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="19" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="20" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 11v2a5 5 0 005 5M19 11v2a5 5 0 01-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Comparte con tu cordada",
    description:
      "Tu ascensión aparece en el feed de tus amigos. Ellos ven tu carta. Tú ves las suyas. La cordada crece. La motivación también.",
    color: "#00995C",
  },
];

export default function LandingHowItWorks() {
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = stepsRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>(".step-item");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const i = Array.from(items).indexOf(el);
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, i * 120);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    items.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="como-funciona"
      className="ld-section"
      style={{ background: "var(--ld-bg-deep)" }}
    >
      <div className="ld-container">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div className="ld-section-label">Cómo funciona</div>
          <h2 className="ld-display ld-section-title" style={{ textAlign: "center" }}>
            Tan simple como subir una montaña.
            <br />
            <span style={{ color: "var(--ld-gold)", opacity: 0.9 }}>(Bueno, casi.)</span>
          </h2>
          <p className="ld-section-sub" style={{ textAlign: "center", margin: "0 auto" }}>
            Cuatro pasos para convertir cada ascensión en parte de tu leyenda.
          </p>
        </div>

        {/* Steps grid */}
        <div
          ref={stepsRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            position: "relative",
          }}
          className="ld-steps-grid"
        >
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              top: 44,
              left: "12.5%",
              right: "12.5%",
              height: 1,
              background: "linear-gradient(90deg, #3B82F620, #F9731620, #A855F720, #00995C20)",
              zIndex: 0,
            }}
            className="ld-step-line"
          />

          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="step-item"
              style={{ position: "relative", zIndex: 1 }}
            >
              {/* Number bg (decorative) */}
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: -8,
                  fontSize: 100,
                  fontFamily: "var(--font-mono-landing, monospace)",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.025)",
                  lineHeight: 1,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                {step.number}
              </div>

              {/* Icon circle */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: `${step.color}15`,
                  border: `1px solid ${step.color}35`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: step.color,
                  marginBottom: 20,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {step.icon}
              </div>

              {/* Step number label */}
              <div
                className="ld-mono"
                style={{
                  fontSize: 11,
                  color: step.color,
                  marginBottom: 8,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                }}
              >
                {step.number}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontFamily: "var(--font-space, sans-serif)",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#F0F4FF",
                  letterSpacing: "-0.01em",
                  marginBottom: 10,
                  lineHeight: 1.25,
                }}
              >
                {step.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(240,244,255,0.55)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: 64,
            textAlign: "center",
            padding: "40px 32px",
            background: "var(--ld-bg-surface)",
            borderRadius: 20,
            border: "1px solid var(--ld-border)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245,200,66,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <p
            style={{
              fontSize: 20,
              fontFamily: "var(--font-space, sans-serif)",
              fontWeight: 600,
              color: "#F0F4FF",
              marginBottom: 8,
            }}
          >
            ¿Tu próxima cima te espera?
          </p>
          <p style={{ fontSize: 14, color: "rgba(240,244,255,0.45)", marginBottom: 24 }}>
            Regístrate gratis y empieza a capturarla hoy.
          </p>
          <a href="/register" className="ld-btn-primary">
            Crear cuenta gratis →
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .ld-steps-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 32px !important;
          }
          .ld-step-line { display: none !important; }
        }
        @media (max-width: 520px) {
          .ld-steps-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
        }
      `}</style>
    </section>
  );
}
