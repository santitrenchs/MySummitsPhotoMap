"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { PeakIndexT } from "@/lib/i18n/peaks";

type Props = {
  t: Pick<PeakIndexT,
    "hiw_step1_title" | "hiw_step1_desc" |
    "hiw_step2_title" | "hiw_step2_desc" |
    "hiw_step3_title" | "hiw_step3_desc"
  >;
};

export function HowItWorksSteps({ t }: Props) {
  const STEPS = [
    {
      num: "01",
      img: "/images/how-it-works/step1-climb.png",
      alt: t.hiw_step1_title,
      title: t.hiw_step1_title,
      desc: t.hiw_step1_desc,
      accent: "#0EA5E9",
    },
    {
      num: "02",
      img: "/images/how-it-works/step2-photo.png",
      alt: t.hiw_step2_title,
      title: t.hiw_step2_title,
      desc: t.hiw_step2_desc,
      accent: "#F5A623",
    },
    {
      num: "03",
      img: "/images/how-it-works/step3-card.png",
      alt: t.hiw_step3_title,
      title: t.hiw_step3_title,
      desc: t.hiw_step3_desc,
      accent: "#2F7A5F",
    },
  ];
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.10 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const ease = "cubic-bezier(0.25, 0.1, 0.25, 1)";

  return (
    <section
      ref={ref}
      style={{ background: "#FFFFFF", padding: "88px 24px 96px", borderBottom: "1px solid rgba(13,37,56,0.07)" }}
    >
      <style>{`
        @media (max-width: 680px) {
          .hw-row { flex-direction: column !important; align-items: center !important; gap: 48px !important; }
          .hw-connector { display: none !important; }
          .hw-step { max-width: 280px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Steps row ── */}
        <div
          className="hw-row"
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 0 }}
        >
          {STEPS.map((step, i) => (
            <React.Fragment key={step.num}>

              {/* Step */}
              <div
                className="hw-step"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  flex: "0 0 auto",
                  width: 240,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(32px)",
                  transition: `opacity 0.6s ${ease} ${0.08 + i * 0.14}s, transform 0.6s ${ease} ${0.08 + i * 0.14}s`,
                }}
              >
                {/* Circle image + badge */}
                <div style={{ position: "relative", width: 200, height: 200, marginBottom: 24 }}>

                  {/* Illustration */}
                  <Image
                    src={step.img}
                    alt={step.alt}
                    width={200}
                    height={200}
                    style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
                  />

                  {/* Step number badge */}
                  <div style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    background: "#FFFFFF",
                    borderRadius: 10,
                    padding: "5px 10px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                    lineHeight: 1,
                  }}>
                    <span style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: step.accent,
                      letterSpacing: "-0.01em",
                    }}>
                      {step.num}
                    </span>
                  </div>

                </div>

                {/* Title */}
                <h3 style={{
                  margin: "0 0 8px",
                  fontSize: 16, fontWeight: 700,
                  color: "#0D2538", letterSpacing: "-0.015em",
                  lineHeight: 1.25,
                }}>
                  {step.title}
                </h3>

                {/* Description */}
                <p style={{
                  margin: 0,
                  fontSize: 14, color: "#9CA3AF",
                  lineHeight: 1.65, maxWidth: 180,
                }}>
                  {step.desc}
                </p>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div
                  className="hw-connector"
                  style={{
                    flex: "1 1 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 96, // align with center of image
                    opacity: visible ? 1 : 0,
                    transition: `opacity 0.5s ${ease} ${0.28 + i * 0.14}s`,
                  }}
                >
                  <svg width="48" height="12" viewBox="0 0 48 12" fill="none">
                    <line
                      x1="0" y1="6" x2="36" y2="6"
                      stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="4 3"
                    />
                    <path
                      d="M33 2.5L38 6l-5 3.5"
                      stroke="#D1D5DB" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
              )}

            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
}
