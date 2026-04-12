"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";

const OUTPUT_SIZE = 400; // px — final avatar resolution

export function AvatarCropModal({
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
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef({ active: false, startX: 0, startY: 0, startOX: 0, startOY: 0 });
  const pinch = useRef({ active: false, dist: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Crop area size — square, responsive
  function getCropSize() {
    const W = Math.min(typeof window !== "undefined" ? window.innerWidth - 32 : 360, 360);
    return W;
  }

  function resetTransform() {
    const img = imgRef.current;
    if (!img || img.naturalWidth === 0) return;
    const size = getCropSize();
    const minS = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    setScale(minS);
    setOffset({ x: 0, y: 0 });
    setReady(true);
  }

  function clamp(ox: number, oy: number, sc: number) {
    const img = imgRef.current;
    if (!img) return { x: ox, y: oy };
    const size = getCropSize();
    const dW = img.naturalWidth * sc;
    const dH = img.naturalHeight * sc;
    const maxX = Math.max(0, (dW - size) / 2);
    const maxY = Math.max(0, (dH - size) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }

  // Mouse
  function onMouseDown(e: React.MouseEvent) {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, startOX: offset.x, startOY: offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active) return;
    setOffset(clamp(drag.current.startOX + (e.clientX - drag.current.startX), drag.current.startOY + (e.clientY - drag.current.startY), scale));
  }
  function onMouseUp() { drag.current.active = false; }

  // Wheel zoom
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const size = getCropSize();
    const minS = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const newScale = Math.max(minS, Math.min(8, scale * (1 - e.deltaY * 0.001)));
    setScale(newScale);
    setOffset((prev) => clamp(prev.x, prev.y, newScale));
  }

  // Touch
  function touchDist(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      drag.current = { active: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, startOX: offset.x, startOY: offset.y };
      pinch.current.active = false;
    } else if (e.touches.length === 2) {
      drag.current.active = false;
      pinch.current = { active: true, dist: touchDist(e.touches) };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const size = getCropSize();
    const minS = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    if (e.touches.length === 1 && drag.current.active) {
      setOffset(clamp(drag.current.startOX + (e.touches[0].clientX - drag.current.startX), drag.current.startOY + (e.touches[0].clientY - drag.current.startY), scale));
    } else if (e.touches.length === 2 && pinch.current.active) {
      const d = touchDist(e.touches);
      const newScale = Math.max(minS, Math.min(8, scale * (d / pinch.current.dist)));
      pinch.current.dist = d;
      setScale(newScale);
      setOffset((prev) => clamp(prev.x, prev.y, newScale));
    }
  }
  function onTouchEnd() { drag.current.active = false; pinch.current.active = false; }

  // Crop → circular canvas → blob
  async function applyCrop() {
    const img = imgRef.current;
    if (!img) return;
    setApplying(true);

    const size = getCropSize();
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d")!;

    // Circular clip
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const dW = img.naturalWidth * scale;
    const dH = img.naturalHeight * scale;
    const srcX = ((dW - size) / 2 - offset.x) / scale;
    const srcY = ((dH - size) / 2 - offset.y) / scale;
    const srcW = size / scale;
    const srcH = size / scale;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      setApplying(false);
      if (blob) onCrop(blob);
    }, "image/jpeg", 0.92);
  }

  const cropSize = getCropSize();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "rgba(0,0,0,0.92)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid #262626",
      }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "white", fontSize: 24, cursor: "pointer", padding: 0, lineHeight: 1 }}>
          ←
        </button>
        <span style={{ color: "white", fontSize: 15, fontWeight: 700 }}>{t.crop_title}</span>
        <button
          onClick={applyCrop}
          disabled={applying || !ready}
          style={{ background: "none", border: "none", color: applying ? "#555" : "#0095f6", fontSize: 15, fontWeight: 700, cursor: applying ? "default" : "pointer", padding: 0 }}
        >
          {applying ? "…" : t.crop_next}
        </button>
      </div>

      {/* Crop area */}
      <div style={{ position: "relative", width: cropSize, height: cropSize }}>
        {/* Image canvas */}
        <div
          style={{
            width: cropSize, height: cropSize,
            position: "relative", overflow: "hidden",
            cursor: drag.current.active ? "grabbing" : "grab",
            touchAction: "none", userSelect: "none",
            background: "#111",
            borderRadius: "50%",
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
                width: ready && imgRef.current ? imgRef.current.naturalWidth * scale : "auto",
                height: ready && imgRef.current ? imgRef.current.naturalHeight * scale : "auto",
                left: "50%", top: "50%",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                maxWidth: "none",
                userSelect: "none", pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* Circular border ring */}
        <div style={{
          position: "absolute", inset: -2,
          border: "2px solid rgba(255,255,255,0.6)",
          borderRadius: "50%",
          pointerEvents: "none",
        }} />
      </div>

      {/* Zoom slider */}
      {ready && imgRef.current && (() => {
        const img = imgRef.current!;
        const size = getCropSize();
        const minS = Math.max(size / img.naturalWidth, size / img.naturalHeight);
        const maxS = minS * 5;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28, width: "min(320px, 85vw)" }}>
            <span style={{ fontSize: 18, color: "#888", userSelect: "none" }}>−</span>
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
            <span style={{ fontSize: 18, color: "#888", userSelect: "none" }}>+</span>
          </div>
        );
      })()}
    </div>
  );
}
