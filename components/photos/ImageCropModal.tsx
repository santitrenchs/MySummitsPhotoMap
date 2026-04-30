"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";


// Output resolution (Instagram standard)
const OUTPUT_W = 1080;

// Max long side for stored original (covers 20×30cm prints at 300 DPI)
const ORIGINAL_MAX_PX = 3000;

/**
 * Resize a File to at most ORIGINAL_MAX_PX on the longest side,
 * output as JPEG 0.85. Used to store a space-efficient original
 * that still supports high-quality reprints.
 */
function MagnifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

export function resizeForStorage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, ORIGINAL_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("resizeForStorage: toBlob failed"))),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("resizeForStorage: image load failed")); };
    img.src = url;
  });
}

export type CropMeta = {
  x: number;      // left edge as fraction [0-1] of effective (rotated) image width
  y: number;      // top edge as fraction [0-1] of effective (rotated) image height
  w: number;      // crop width as fraction [0-1] of effective image width
  h: number;      // crop height as fraction [0-1] of effective image height
  aspect: string; // e.g. "4:5"
  rotation: 0 | 90 | 180 | 270;
};

export function ImageCropModal({
  file,
  onCrop,
  onCancel,
  initialRotation = 0,
  embedded = false,
  applyRef,
  onApplyingChange,
}: {
  file: File;
  onCrop: (blob: Blob, cropMeta: CropMeta) => void;
  onCancel: () => void;
  initialRotation?: 0 | 90 | 180 | 270;
  /** Embedded mode: fills parent container instead of covering the screen. No internal header. */
  embedded?: boolean;
  applyRef?: React.MutableRefObject<(() => void) | null>;
  /** Called when applying state changes so parent header can show spinner */
  onApplyingChange?: (applying: boolean) => void;
}) {
  const t = useT();
  const [src, setSrc] = useState("");
  const [ratio, setRatio] = useState(4 / 5);   // w / h
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // pan in display px
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(initialRotation);
  const [zoomOpen, setZoomOpen] = useState(false);
  // Embedded mode: track container dimensions via ResizeObserver
  const [panelDims, setPanelDims] = useState({ w: 0, h: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

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

  // ── ResizeObserver for embedded mode ─────────────────────────────────────
  useEffect(() => {
    if (!embedded) return;
    const el = outerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setPanelDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [embedded]);

  // Reset transform when panel dimensions change in embedded mode
  useEffect(() => {
    if (embedded && panelDims.w > 0 && ready) resetTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelDims]);

  // ── Crop area size (responsive) ───────────────────────────────────────────
  function getCropSize() {
    if (embedded && panelDims.w > 0) {
      // In embedded mode controls are overlaid → use the full panel area
      const availW = panelDims.w;
      const availH = panelDims.h;
      const byHeight = { cropW: Math.round(availH * ratio), cropH: availH };
      const byWidth  = { cropW: availW, cropH: Math.round(availW / ratio) };
      const chosen = byHeight.cropW <= availW ? byHeight : byWidth;
      // Snap to fill available height if rounding leaves a tiny gap (≤ 8px)
      if (chosen.cropH < availH && availH - chosen.cropH <= 8) chosen.cropH = availH;
      return chosen;
    }
    const W = Math.min(typeof window !== "undefined" ? window.innerWidth : 400, 520);
    return { cropW: W, cropH: Math.round(W / ratio) };
  }

  // Returns the effective (post-rotation) dimensions of the image in natural pixels
  function effectiveDims(rot: number) {
    const img = imgRef.current;
    if (!img) return { ew: 1, eh: 1 };
    return rot % 180 === 0
      ? { ew: img.naturalWidth, eh: img.naturalHeight }
      : { ew: img.naturalHeight, eh: img.naturalWidth };
  }

  // ── Initial scale when image or ratio changes ─────────────────────────────
  function resetTransform(rot?: number) {
    const img = imgRef.current;
    if (!img || img.naturalWidth === 0) return;
    const r = rot ?? rotation;
    const { ew, eh } = effectiveDims(r);
    const { cropW, cropH } = getCropSize();
    const minS = Math.max(cropW / ew, cropH / eh);
    setScale(minS);
    setOffset({ x: 0, y: 0 });
    setReady(true);
  }

  useEffect(() => {
    if (ready) resetTransform(rotation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio]);

  // ── Clamp offset so image always covers the crop frame ────────────────────
  function clamp(ox: number, oy: number, sc: number, rot?: number): { x: number; y: number } {
    const r = rot ?? rotation;
    const { ew, eh } = effectiveDims(r);
    if (ew === 1 && eh === 1) return { x: ox, y: oy };
    const { cropW, cropH } = getCropSize();
    const maxX = Math.max(0, (ew * sc - cropW) / 2);
    const maxY = Math.max(0, (eh * sc - cropH) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }

  // ── Rotate 90° clockwise ──────────────────────────────────────────────────
  function handleRotate() {
    const newRot = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
    setRotation(newRot);
    resetTransform(newRot);
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
  // Registered as a native non-passive listener so preventDefault() works.
  // Kept in a ref so it always sees fresh state without re-registering.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    const { ew, eh } = effectiveDims(rotation);
    const { cropW, cropH } = getCropSize();
    const minS = Math.max(cropW / ew, cropH / eh);
    const newScale = Math.max(minS, Math.min(6, scale * (1 - e.deltaY * 0.001)));
    setScale(newScale);
    setOffset((prev) => clamp(prev.x, prev.y, newScale));
  };

  // ── Touch events (pan + pinch) ────────────────────────────────────────────
  function touchDist(t: TouchList | React.TouchList) {
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

  // touchmove is registered as non-passive via useEffect below so preventDefault works.
  // This ref is updated every render so the handler always sees fresh state/rotation.
  const touchMoveRef = useRef<(e: TouchEvent) => void>(() => {});
  touchMoveRef.current = (e: TouchEvent) => {
    e.preventDefault();
    const { ew, eh } = effectiveDims(rotation);
    const { cropW, cropH } = getCropSize();
    const minS = Math.max(cropW / ew, cropH / eh);

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
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => touchMoveRef.current(e);
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  function onTouchEnd() {
    drag.current.active = false;
    pinch.current.active = false;
  }

  // ── Apply crop → canvas → blob ────────────────────────────────────────────
  // Expose applyCrop to parent via ref (for embedded mode header button)
  useEffect(() => {
    if (applyRef) applyRef.current = applyCrop;
  });

  async function applyCrop() {
    const img = imgRef.current;
    if (!img) return;
    setApplying(true);
    onApplyingChange?.(true);

    const { cropW, cropH } = getCropSize();
    const outH = Math.round(OUTPUT_W / ratio);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    // Scale factor: display pixels → output pixels
    const s = OUTPUT_W / cropW;

    // Mirror the CSS transform: center → rotate → pan → draw image centered
    ctx.save();
    ctx.translate(OUTPUT_W / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(offset.x * s, offset.y * s);
    const dW = img.naturalWidth * scale * s;
    const dH = img.naturalHeight * scale * s;
    ctx.drawImage(img, -dW / 2, -dH / 2, dW, dH);
    ctx.restore();

    // Normalized crop coords in effective (rotated) image space
    const { ew, eh } = effectiveDims(rotation);
    const srcX = ((ew * scale - cropW) / 2 - offset.x) / scale;
    const srcY = ((eh * scale - cropH) / 2 - offset.y) / scale;
    const cropMeta: CropMeta = {
      x: srcX / ew,
      y: srcY / eh,
      w: cropW / scale / ew,
      h: cropH / scale / eh,
      aspect: ratio === 1 ? "1:1" : "4:5",
      rotation,
    };

    canvas.toBlob((blob) => {
      setApplying(false);
      // Don't call onApplyingChange(false) here — parent resets it after the step transition
      if (blob) onCrop(blob, cropMeta);
    }, "image/jpeg", 0.85);
  }

  const { cropW, cropH } = getCropSize();

  return (
    <div
      ref={outerRef}
      style={embedded ? {
        flex: 1, minHeight: 0, width: "100%",
        display: "flex", flexDirection: "column",
        background: "white", overflow: "hidden",
      } : {
        position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1100,
        background: "#000",
        display: "flex", flexDirection: "column",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Top bar — only in standalone (non-embedded) mode ─────────────── */}
      {!embedded && (
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
              color: applying ? "rgba(255,255,255,0.4)" : "#0095f6",
              fontSize: 15, fontWeight: 700, cursor: applying ? "wait" : "pointer", padding: 0,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {applying && <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#0095f6", animation: "spin 0.7s linear infinite", display: "inline-block" }} />}
            {applying ? "…" : t.crop_next}
          </button>
        </div>
      )}

      {/* ── Crop canvas ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: embedded ? "#f3f4f6" : "#000" }}>
        <div
          ref={containerRef}
          style={{
            width: cropW, height: cropH,
            position: "relative", overflow: "hidden",
            cursor: drag.current.active ? "grabbing" : "grab",
            touchAction: "none", userSelect: "none",
            background: embedded ? "#f3f4f6" : "#111",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              onLoad={() => resetTransform()}
              draggable={false}
              style={{
                position: "absolute",
                width: ready ? imgRef.current!.naturalWidth * scale : "auto",
                height: ready ? imgRef.current!.naturalHeight * scale : "auto",
                left: "50%", top: "50%",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg)`,
                maxWidth: "none",
                userSelect: "none", pointerEvents: "none",
              }}
            />
          )}

          {/* Controls overlay — embedded mode only */}
          {embedded && ready && imgRef.current && (() => {
            const { cropW: cW, cropH: cH } = getCropSize();
            const { ew, eh } = effectiveDims(rotation);
            const minS = Math.max(cW / ew, cH / eh);
            const maxS = minS * 4;
            return (
              <div style={{
                position: "absolute", bottom: 12, left: 12, right: 12,
                display: "flex", flexDirection: "column", gap: 8,
                zIndex: 10, pointerEvents: "none",
              }}>
                {/* Zoom slider — shown only when zoomOpen */}
                {zoomOpen && (
                  <div style={{
                    background: "rgba(0,0,0,0.52)",
                    borderRadius: 24, padding: "7px 14px",
                    display: "flex", alignItems: "center", gap: 10,
                    pointerEvents: "auto",
                  }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>−</span>
                    <input
                      type="range" min={0} max={1} step={0.001}
                      value={(scale - minS) / (maxS - minS)}
                      onChange={(e) => {
                        const s = minS + Number(e.target.value) * (maxS - minS);
                        setScale(s);
                        setOffset((prev) => clamp(prev.x, prev.y, s));
                      }}
                      style={{ flex: 1, accentColor: "white", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>+</span>
                  </div>
                )}
                {/* Icon buttons row */}
                <div style={{ display: "flex", justifyContent: "space-between", pointerEvents: "auto" }}>
                  {/* Zoom toggle (magnify icon) */}
                  <button
                    onClick={() => setZoomOpen((o) => !o)}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: zoomOpen ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.45)",
                      border: zoomOpen ? "1.5px solid rgba(255,255,255,0.5)" : "none",
                      color: "white", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    aria-label="Zoom"
                  >
                    <MagnifyIcon />
                  </button>
                  {/* Rotate button */}
                  <button
                    onClick={handleRotate}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "rgba(0,0,0,0.45)",
                      border: "none", color: "white", fontSize: 18,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    aria-label="Girar 90°"
                  >↻</button>
                </div>
              </div>
            );
          })()}

          {/* Rule-of-thirds overlay */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {[1 / 3, 2 / 3].map((f) => (
              <div key={`v${f}`} style={{
                position: "absolute", top: 0, bottom: 0,
                left: `${f * 100}%`, width: 1,
                background: embedded ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)",
              }} />
            ))}
            {[1 / 3, 2 / 3].map((f) => (
              <div key={`h${f}`} style={{
                position: "absolute", left: 0, right: 0,
                top: `${f * 100}%`, height: 1,
                background: embedded ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)",
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
                borderTop: hy === 0 ? `2px solid ${embedded ? "rgba(0,0,0,0.35)" : "white"}` : "none",
                borderBottom: hy === 1 ? `2px solid ${embedded ? "rgba(0,0,0,0.35)" : "white"}` : "none",
                borderLeft: hx === 0 ? `2px solid ${embedded ? "rgba(0,0,0,0.35)" : "white"}` : "none",
                borderRight: hx === 1 ? `2px solid ${embedded ? "rgba(0,0,0,0.35)" : "white"}` : "none",
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom controls — standalone mode only (embedded uses overlay above) */}
      {!embedded && (
        <div style={{
          padding: "16px 0 28px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          borderTop: "1px solid #262626", flexShrink: 0,
          background: "#000",
        }}>
          {ready && imgRef.current && (() => {
            const { cropW: cW, cropH: cH } = getCropSize();
            const { ew, eh } = effectiveDims(rotation);
            const minS = Math.max(cW / ew, cH / eh);
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
          {ready && (
            <button
              onClick={handleRotate}
              style={{
                background: "none", border: "1px solid #444", borderRadius: 8,
                color: "white", fontSize: 13, cursor: "pointer",
                padding: "6px 16px", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>↻</span>
              Girar 90°
            </button>
          )}
        </div>
      )}
    </div>
  );
}
