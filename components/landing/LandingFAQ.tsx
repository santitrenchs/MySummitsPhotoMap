"use client";

import { useState } from "react";
import { useLandingT } from "./LandingLocaleContext";

function FAQItem({ q, a, open, onToggle }: {
  q: string; a: string; open: boolean; onToggle: () => void;
}) {
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(13,37,56,0.08)",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "20px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "var(--font-space, sans-serif)",
            color: "#0D2538",
            lineHeight: 1.4,
          }}
        >
          {q}
        </span>
        <span
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px solid rgba(13,37,56,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2F7A5F",
            fontSize: 16,
            lineHeight: 1,
            transition: "transform 0.25s ease",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      </button>

      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? 300 : 0,
          transition: "max-height 0.3s ease",
        }}
      >
        <p
          style={{
            fontSize: 15,
            color: "#5A6E84",
            lineHeight: 1.65,
            margin: "0 0 20px",
            paddingRight: 40,
          }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

export default function LandingFAQ() {
  const t = useLandingT();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      className="ld-section"
      style={{ background: "#F4F7FA" }}
    >
      <div className="ld-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 80,
            alignItems: "start",
          }}
          className="ld-faq-grid"
        >
          {/* Left: header */}
          <div style={{ position: "sticky", top: 100 }}>
            <div className="ld-section-label">{t.faq_label}</div>
            <h2
              className="ld-display"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                color: "#0D2538",
                margin: "0 0 16px",
                lineHeight: 1.1,
              }}
            >
              {t.faq_title}
            </h2>
            <p style={{ fontSize: 15, color: "#5A6E84", lineHeight: 1.6, margin: 0 }}>
              {t.faq_sub}
            </p>
          </div>

          {/* Right: accordion */}
          <div>
            {t.faq_items.map((faq, i) => (
              <FAQItem
                key={i}
                q={faq.q}
                a={faq.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .ld-faq-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .ld-faq-grid > div:first-child {
            position: static !important;
          }
        }
      `}</style>
    </section>
  );
}
