"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";

const RATIOS = [
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
];

// Output resolution (Instagram standard)
const OUTPUT_W = 1080;

export function ImageCropModal({
  file,
  onCrop,
  onCancel,
}: {
  file: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [src, setSrc] = useState("");
  const [ratio, setRatio] = useState(4 / 5);   // w / h
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // pan in display px
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state (mouse)
  const drag = useRef({ active: false, startX: 0, startY: 0, startOX: 0, startOY: 0 });
  // Pinch state (touch)
  const pinch = useRef({ active: false, dist: 0, midX: 0, midY: 0 });

  // ── Object URL ────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Crop area size (responsive) ───────────────────────────────────────────
  function getCropSize() {
    const W = Math.min(typeof window !== "undefined" ? window.innerWidth : 400, 520);
    return { cropW: W, cropH: W / ratio };
  }

  // ── Initial scale when image or ratio changes ─────────────────────────────
  function resetTransform() {
    const img = imgRef.current;
    if (!img || img.naturalWidth === 0) return;
    const { cropW, cropH } = getCropSize();
    const minS = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight);
    setScale(minS);
    setOffset({ x: 0, y: 0 });
    setReady(true);
  }

  useEffect(() => {
    if (ready) resetTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio]);

  // ── Clamp offset so image always covers the crop frame ────────────────────
  function clamp(ox: number, oy: number, sc: number): { x: number; y: number } {
    const img = imgRef.current;
    if (!img) return { x: ox, y: oy };
    const { cropW, cropH } = getCropSize();
    const dW = img.naturalWidth * sc;
    const dH = img.naturalHeight * sc;
    const maxX = Math.max(0, (dW - cropW) / 2);
    const maxY = Math.max(0, (dH - cropH) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }

  // ── Mouse events ──────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, startOX: offset.x, startOY: offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active) return;
    const ox = drag.current.startOX + (e.clientX - drag.current.startX);
    const oy = drag.current.startOY + (e.clientY - drag.current.startY);
    setOffset(clamp(ox, oy, scale));
  }
  function onMouseUp() { drag.current.active = false; }

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const { cropW, cropH } = getCropSize();
    const minS = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight);
    const newScale = Math.max(minS, Math.min(6, scale * (1 - e.deltaY * 0.001)));
    setScale(newScale);
    setOffset((prev) => clamp(prev.x, prev.y, newScale));
  }

  // ── Touch events (pan + pinch) ────────────────────────────────────────────
  function touchDist(t: React.TouchList) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      drag.current = { active: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, startOX: offset.x, startOY: offset.y };
      pinch.current.active = false;
    } else if (e.touches.length === 2) {
      drag.current.active = false;
      pinch.current = { active: true, dist: touchDist(e.touches), midX: 0, midY: 0 };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const { cropW, cropH } = getCropSize();
    const minS = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight);

    if (e.touches.length === 1 && drag.current.active) {
      const ox = drag.current.startOX + (e.touches[0].clientX - drag.current.startX);
      const oy = drag.current.startOY + (e.touches[0].clientY - drag.current.startY);
      setOffset(clamp(ox, oy, scale));
    } else if (e.touches.length === 2 && pinch.current.active) {
      const d = touchDist(e.touches);
      const newScale = Math.max(minS, Math.min(6, scale * (d / pinch.current.dist)));
      pinch.current.dist = d;
      setScale(newScale);
      setOffset((prev) => clamp(prev.x, prev.y, newScale));
    }
  }

  function onTouchEnd() {
    drag.current.active = false;
    pinch.current.active = false;
  }

  // ── Apply crop → canvas → blob ────────────────────────────────────────────
  async function applyCrop() {
    const img = imgRef.current;
    if (!img) return;
    setApplying(true);

    const { cropW, cropH } = getCropSize();
    const outH = Math.round(OUTPUT_W / ratio);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    // Map from display space → natural image coords
    const dW = img.naturalWidth * scale;
    const dH = img.naturalHeight * scale;
    const srcX = ((dW - cropW) / 2 - offset.x) / scale;
    const srcY = ((dH - cropH) / 2 - offset.y) / scale;
    const srcW = cropW / scale;
    const srcH = cropH / scale;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_W, outH);

    canvas.toBlob((blob) => {
      setApplying(false);
      if (blob) onCrop(blob);
    }, "image/jpeg", 0.93);
  }

  const { cropW, cropH } = getCropSize();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#000",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid #262626",
        flexShrink: 0,
      }}>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", color: "white", fontSize: 24, cursor: "pointer", padding: 0, lineHeight: 1 }}
        >←</button>
        <span style={{ color: "white", fontSize: 15, fontWeight: 700 }}>{t.crop_title}</span>
        <button
          onClick={applyCrop}
          disabled={applying || !ready}
          style={{
            background: "none", border: "none",
            color: applying ? "#555" : "#0095f6",
            fontSize: 15, fontWeight: 700, cursor: applying ? "default" : "pointer", padding: 0,
          }}
        >{applying ? "…" : t.crop_next}</button>
      </div>

      {/* ── Crop canvas ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div
          ref={containerRef}
          style={{
            width: cropW, height: cropH,
            position: "relative", overflow: "hidden",
            cursor: drag.current.active ? "grabbing" : "grab",
            touchAction: "none", userSelect: "none",
            background: "#111",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              onLoad={resetTransform}
              draggable={false}
              style={{
                position: "absolute",
                width: ready ? imgRef.current!.naturalWidth * scale : "auto",
                height: ready ? imgRef.current!.naturalHeight * scale : "auto",
                left: "50%", top: "50%",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                maxWidth: "none",
                userSelect: "none", pointerEvents: "none",
              }}
            />
          )}

          {/* Rule-of-thirds overlay */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {[1 / 3, 2 / 3].map((f) => (
              <div key={`v${f}`} style={{
                position: "absolute", top: 0, bottom: 0,
                left: `${f * 100}%`, width: 1,
                background: "rgba(255,255,255,0.18)",
              }} />
            ))}
            {[1 / 3, 2 / 3].map((f) => (
              <div key={`h${f}`} style={{
                position: "absolute", left: 0, right: 0,
                top: `${f * 100}%`, height: 1,
                background: "rgba(255,255,255,0.18)",
              }} />
            ))}
            {/* Corner marks */}
            {[[0,0],[1,0],[0,1],[1,1]].map(([hx, hy]) => (
              <div key={`c${hx}${hy}`} style={{
                position: "absolute",
                top: hy === 0 ? 0 : undefined,
                bottom: hy === 1 ? 0 : undefined,
                left: hx === 0 ? 0 : undefined,
                right: hx === 1 ? 0 : undefined,
                width: 18, height: 18,
                borderTop: hy === 0 ? "2px solid white" : "none",
                borderBottom: hy === 1 ? "2px solid white" : "none",
                borderLeft: hx === 0 ? "2px solid white" : "none",
                borderRight: hx === 1 ? "2px solid white" : "none",
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      <div style={{
        padding: "16px 0 28px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        borderTop: "1px solid #262626", flexShrink: 0,
      }}>
        {/* Zoom slider */}
        {ready && imgRef.current && (() => {
          const { cropW: cW, cropH: cH } = getCropSize();
          const img = imgRef.current!;
          const minS = Math.max(cW / img.naturalWidth, cH / img.naturalHeight);
          const maxS = minS * 4;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "min(360px, 90vw)" }}>
              <span style={{ fontSize: 11, color: "#666" }}>−</span>
              <input
                type="range" min={0} max={1} step={0.001}
                value={(scale - minS) / (maxS - minS)}
                onChange={(e) => {
                  const s = minS + Number(e.target.value) * (maxS - minS);
                  setScale(s);
                  setOffset((prev) => clamp(prev.x, prev.y, s));
                }}
                style={{ flex: 1, accentColor: "white" }}
              />
              <span style={{ fontSize: 11, color: "#666" }}>+</span>
            </div>
          );
        })()}

        {/* Ratio pills */}
        <div style={{ display: "flex", gap: 8 }}>
          {RATIOS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setRatio(value)}
              style={{
                padding: "6px 16px", borderRadius: 20, border: "none",
                background: ratio === value ? "white" : "rgba(255,255,255,0.12)",
                color: ratio === value ? "black" : "white",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                transition: "background 0.15s",
              }}
            >{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
