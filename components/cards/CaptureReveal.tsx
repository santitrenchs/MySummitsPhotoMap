"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/components/providers/I18nProvider";
import { type AscentCardData } from "@/components/cards/AscentCard";
import { ElevationProfile } from "@/components/cards/ElevationProfile";

// Only the Lottie flower is client-only — keeping the ssr:false boundary here (not
// on the whole card) lets the feed card render normally on SSR (no empty slot / flicker).
const RevealFlower = dynamic(
  () => import("@/components/cards/RevealFlower").then((m) => m.RevealFlower),
  { ssr: false },
);
import { getRarityId, RARITY_COLORS, RARITY_EP } from "@/lib/rarity";

// ── Timeline (ms), mirrors Android AscentCaptureReveal ───────────────────────────
const BLOOM = 2600;      // flower bloom (daisy is ~3s; we sequence off a fixed beat)
const T_RARITY = 700;    // rarity pop, after bloom
const RARITY_HOLD = 1400;
const T_EP = 2300;       // EP roll starts, after bloom
const EP_MS = 1300;      // EP roll-up duration
const T_MYTHIC = 400;    // mythic beat, after EP lands
const MYTHIC_EXTRA = 2200; // let the mythic beat play before auto-reveal
const HOLD = 2000;       // wait after the sequence before auto-reveal
const REVEAL_MS = 800;   // focus-pull before handing off
const PREPARE_TIMEOUT_MS = 1200;
const IMAGE_SOFT_TIMEOUT_MS = 450;
const FAIL_SETTLE_MS = 220;
const REDUCED_MOTION_SETTLE_MS = 80;

export type CaptureRevealStatus = "idle" | "mounting" | "playing" | "settling" | "done" | "failed";

export type CaptureRevealValues = {
  photoBlur: number;
  coverAlpha: number;
  epDisplay: number;
  epScale: number;
  rarityScale: number;
  fxAlpha: number;
  infoAppear: number;
  mythicBeat: boolean;
  status: CaptureRevealStatus;
};

type UseCaptureRevealProps = {
  enabled: boolean;
  ascent: AscentCardData;
  hostRef: RefObject<HTMLElement | null>;
  onFinished: () => void;
};

type OverlayProps = {
  ascent: AscentCardData;
  locale: string;
  values: CaptureRevealValues;
};

function hasStableRevealLayout(host: HTMLElement | null, startedAt: number): boolean {
  if (!host) return false;
  const card = host.querySelector<HTMLElement>(".peak-card");
  const frame = host.querySelector<HTMLElement>(".image-frame");
  if (!card || !frame) return false;

  const cardRect = card.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const layoutReady =
    cardRect.width > 100 &&
    cardRect.height > 260 &&
    frameRect.width > 100 &&
    frameRect.height > 160;
  if (!layoutReady) return false;

  const img = frame.querySelector<HTMLImageElement>("img");
  const imageReady = !img || (img.complete && img.naturalWidth > 0);
  return imageReady || performance.now() - startedAt > IMAGE_SOFT_TIMEOUT_MS;
}

function prefersReducedRevealMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function useCaptureReveal({ enabled, ascent, hostRef, onFinished }: UseCaptureRevealProps): CaptureRevealValues {
  const rarity = getRarityId(ascent.peak.altitudeM);
  const ep = RARITY_EP[rarity];
  const isMythic = ascent.peak.isMythic ?? false;

  const [status, setStatus] = useState<CaptureRevealStatus>("idle");
  const [phase, setPhase] = useState<"build" | "reveal">("build");
  const [infoAppear, setInfoAppear] = useState(0);
  const [rarityScale, setRarityScale] = useState(1);
  const [epCount, setEpCount] = useState(0);
  const [epScale, setEpScale] = useState(1);
  const [mythicBeat, setMythicBeat] = useState(false);

  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setPhase("build");
    setStatus("mounting");
    setInfoAppear(0);
    setRarityScale(1);
    setEpCount(0);
    setEpScale(1);
    setMythicBeat(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;
    const at = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };

    const finishSafely = () => {
      if (cancelled) return;
      setStatus("done");
      onFinishedRef.current();
    };

    const failSafely = () => {
      if (cancelled) return;
      setStatus("failed");
      setPhase("reveal");
      setInfoAppear(0);
      setRarityScale(1);
      setEpScale(1);
      setEpCount(ep);
      setMythicBeat(false);
      at(finishSafely, FAIL_SETTLE_MS);
    };

    const settleReducedMotion = () => {
      setStatus("settling");
      setPhase("reveal");
      setInfoAppear(0);
      setRarityScale(1);
      setEpScale(1);
      setEpCount(ep);
      setMythicBeat(false);
      at(finishSafely, REDUCED_MOTION_SETTLE_MS);
    };

    if (prefersReducedRevealMotion()) {
      settleReducedMotion();
      return () => {
        cancelled = true;
        timers.forEach(clearTimeout);
        cancelAnimationFrame(raf);
      };
    }

    const startTimeline = () => {
      if (cancelled) return;
      setStatus("playing");
      at(() => setInfoAppear(1), BLOOM);

      // Rarity pop (after the headline lands)
      at(() => setRarityScale(2.1), BLOOM + T_RARITY);
      at(() => setRarityScale(1), BLOOM + T_RARITY + RARITY_HOLD);

      // EP roll-up
      at(() => {
        setEpScale(1.9);
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / EP_MS);
          setEpCount(Math.round(p * ep));
          if (p < 1) raf = requestAnimationFrame(tick);
          else setEpScale(1);
        };
        raf = requestAnimationFrame(tick);
      }, BLOOM + T_EP);

      const epEnd = BLOOM + T_EP + EP_MS;
      let revealAt: number;
      if (isMythic) {
        at(() => setMythicBeat(true), epEnd + T_MYTHIC);
        revealAt = epEnd + T_MYTHIC + MYTHIC_EXTRA + HOLD;
      } else {
        revealAt = epEnd + HOLD;
      }
      at(() => {
        setStatus("settling");
        setPhase("reveal");
        at(finishSafely, REVEAL_MS);
      }, revealAt);
    };

    const startedAt = performance.now();
    const waitForReady = () => {
      if (cancelled) return;
      if (hasStableRevealLayout(hostRef.current, startedAt)) {
        startTimeline();
        return;
      }
      if (performance.now() - startedAt > PREPARE_TIMEOUT_MS) {
        failSafely();
        return;
      }
      raf = requestAnimationFrame(waitForReady);
    };
    raf = requestAnimationFrame(waitForReady);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [enabled, ep, hostRef, isMythic]);

  const isFailedOrDone = status === "failed" || status === "done" || status === "idle";
  const coverAlpha = isFailedOrDone ? 0 : phase === "build" ? 1 : 0;
  const photoBlur = isFailedOrDone ? 0 : phase === "build" ? 16 : 0;
  const fxAlpha = status === "playing" && phase === "build" ? 1 : 0;

  return {
    photoBlur,
    coverAlpha,
    epDisplay: epCount,
    epScale,
    rarityScale,
    fxAlpha,
    infoAppear,
    mythicBeat,
    status,
  };
}

export function CaptureRevealOverlay({ ascent, locale, values }: OverlayProps) {
  const t = useT();
  const rarity = getRarityId(ascent.peak.altitudeM);
  const color = RARITY_COLORS[rarity];
  const isMythic = ascent.peak.isMythic ?? false;

  return (
    <div
      aria-hidden="true"
      data-testid="capture-reveal-overlay"
      data-reveal-status={values.status}
      style={{ position: "absolute", inset: 0, opacity: values.fxAlpha, transition: "opacity 450ms ease" }}
    >
      {/* Flower + "PEAK CAPTURED!" — upper group */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ height: "4%" }} />
        <div style={{ position: "relative", width: "80%", aspectRatio: "1 / 1" }}>
          <RevealFlower color={color} style={{ position: "absolute", inset: 0 }} />
          {isMythic && (
            <div style={{ position: "absolute", inset: 0, opacity: values.mythicBeat ? 1 : 0, transition: "opacity 900ms ease" }}>
              <RevealFlower color="#FFD700" style={{ position: "absolute", inset: 0 }} />
            </div>
          )}
        </div>
        {/* Pulled up into the daisy's empty lower frame so it hugs the flower */}
        <div style={{
          marginTop: "-20%",
          opacity: values.infoAppear, transition: "opacity 350ms ease, transform 350ms cubic-bezier(.34,1.56,.64,1)",
          transform: `scale(${values.infoAppear ? 1 : 0.85})`,
          fontSize: 22, fontWeight: 900, letterSpacing: "0.06em", color: "#111827",
          textShadow: `0 2px 16px ${color}66`, textTransform: "uppercase", textAlign: "center",
        }}>
          {t.capture_reveal_captured}
        </div>
      </div>

      {/* Peak name + altitude — above the profile (which is ~90px tall), in rarity color */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 104, textAlign: "center",
        opacity: values.infoAppear, transition: "opacity 350ms ease",
      }}>
        <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
          {ascent.peak.nameEn ?? ascent.peak.name}
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", letterSpacing: "-0.04em", lineHeight: 1 }}>
          {ascent.peak.altitudeM.toLocaleString(locale)} m
        </div>
      </div>

      {/* Elevation profile — rarity-tinted, flush to the bottom */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, opacity: values.infoAppear, transition: "opacity 350ms ease" }}>
        <ElevationProfile peakId={ascent.peak.id} altitudeM={ascent.peak.altitudeM} rarityColor={color} lineColor={color} />
      </div>

      {/* MYTHIC pill — top-left, pops in on the beat */}
      {isMythic && (
        <div style={{
          position: "absolute", top: 10, left: 10,
          background: "#EAB308", color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em",
          padding: "6px 10px", borderRadius: "var(--radius-full)",
          boxShadow: "0 4px 16px rgba(234,179,8,0.45)",
          opacity: values.mythicBeat ? 1 : 0,
          transform: `scale(${values.mythicBeat ? 1 : 0.6})`,
          transformOrigin: "top left",
          transition: "opacity 250ms ease, transform 300ms cubic-bezier(.34,1.56,.64,1)",
        }}>
          {t.card_mythic}
        </div>
      )}
    </div>
  );
}
