"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type * as FaceApiType from "@vladmandic/face-api";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { getFaceApi } from "./faceApiSingleton";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FaceDraft = {
  tempId: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  descriptor: number[];
  personName: string | null;
  suggestion: string | null;
};

type Person = { id: string; name: string; userId?: string | null };
type KnownPerson = { name: string; descriptors: number[][] };

// ── Main component ─────────────────────────────────────────────────────────────

export function PhotoTagStep({
  blob,
  onDone,
  onSkip,
  initialFaces = [],
}: {
  blob: Blob;
  onDone: (blob: Blob, faces: FaceDraft[]) => void;
  onSkip: (blob: Blob) => void;
  initialFaces?: FaceDraft[];
}) {
  const t = useT();
  const objUrlRef = useRef(URL.createObjectURL(blob));
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<"detecting" | "ready">("detecting");
  const [faces, setFaces] = useState<FaceDraft[]>([]);
  const [activeFaceId, setActiveFaceId] = useState<string | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(80);

  useEffect(() => {
    if (headerRef.current) setHeaderH(headerRef.current.getBoundingClientRect().height);
  }, []);

  // Lock body scroll while fullscreen tagging UI is visible.
  // On iOS Safari, overflow:hidden alone still allows the page to jump scroll position,
  // which repositions fixed elements. The position:fixed + top:-scrollY pattern prevents this.
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Revoke blob URL on unmount
  useEffect(() => {
    const url = objUrlRef.current;
    return () => URL.revokeObjectURL(url);
  }, []);

  // Debounced server-side search — only friends with linked accounts
  useEffect(() => {
    if (!search.trim()) {
      setPersons([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetch(`/api/persons?q=${encodeURIComponent(search.trim())}`)
        .then((r) => r.json())
        .then((d) => setPersons(Array.isArray(d) ? d : []));
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // Measure rendered image size via ResizeObserver
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el || !imgLoaded) return;
    const obs = new ResizeObserver(() => {
      setRenderedSize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    obs.observe(el);
    setRenderedSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => obs.disconnect();
  }, [imgLoaded]);

  // Auto-detect faces when image is ready
  useEffect(() => {
    if (!imgLoaded) return;
    runDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgLoaded]);

  // Focus search when bottom sheet opens
  useEffect(() => {
    if (activeFaceId) {
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 120);
    }
  }, [activeFaceId]);

  async function runDetection() {
    const img = imgRef.current;
    if (!img) return;
    setPhase("detecting");
    try {
      const faceapi = await getFaceApi();

      const results = await faceapi
        .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      // Match against known persons
      const suggestionMap = new Map<number, string>();
      if (results.length > 0) {
        const knownRes = await fetch("/api/persons/descriptors");
        const known: KnownPerson[] = await knownRes.json();
        if (known.length > 0) {
          const labeled = known.map(
            (p) => new faceapi.LabeledFaceDescriptors(
              p.name,
              p.descriptors.map((d) => new Float32Array(d))
            )
          );
          const matcher = new faceapi.FaceMatcher(labeled, 0.5);
          results.forEach((det, i) => {
            const match = matcher.findBestMatch(new Float32Array(det.descriptor));
            if (match.label !== "unknown") suggestionMap.set(i, match.label);
          });
        }
      }

      // Build detected faces
      const detected: FaceDraft[] = results.map((det, i) => ({
        tempId: `face-${i}`,
        boundingBox: {
          x: det.detection.box.x / img.naturalWidth,
          y: det.detection.box.y / img.naturalHeight,
          width: det.detection.box.width / img.naturalWidth,
          height: det.detection.box.height / img.naturalHeight,
        },
        descriptor: Array.from(det.descriptor),
        personName: null,
        suggestion: suggestionMap.get(i) ?? null,
      }));

      // Merge with initialFaces: match by bounding box center overlap
      const unmatched = [...initialFaces];
      const merged = detected.map((face) => {
        const cx = face.boundingBox.x + face.boundingBox.width / 2;
        const cy = face.boundingBox.y + face.boundingBox.height / 2;
        const idx = unmatched.findIndex(
          (init) =>
            cx >= init.boundingBox.x &&
            cx <= init.boundingBox.x + init.boundingBox.width &&
            cy >= init.boundingBox.y &&
            cy <= init.boundingBox.y + init.boundingBox.height
        );
        if (idx !== -1) {
          const match = unmatched.splice(idx, 1)[0];
          return { ...face, personName: match.personName, suggestion: match.personName ?? face.suggestion };
        }
        return face;
      });

      // Remaining initial faces that weren't re-detected → keep as manual boxes
      setFaces([...merged, ...unmatched]);
    } catch (err) {
      console.error("[PhotoTagStep] Detection failed:", err);
    }
    setPhase("ready");
  }

  function tagFace(faceId: string, personName: string) {
    setFaces((prev) =>
      prev.map((f) => (f.tempId === faceId ? { ...f, personName } : f))
    );
    // Update local persons list if new
    if (!persons.some((p) => p.name.toLowerCase() === personName.toLowerCase())) {
      setPersons((prev) =>
        [...prev, { id: `pending-${personName}`, name: personName }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    }
    setActiveFaceId(null);
    setSearch("");
  }

  function confirmSuggestion(faceId: string) {
    const face = faces.find((f) => f.tempId === faceId);
    if (face?.suggestion) tagFace(faceId, face.suggestion);
  }

  function removeTag(faceId: string) {
    setFaces((prev) => prev.map((f) => (f.tempId === faceId ? { ...f, personName: null } : f)));
  }

  const activeFace = faces.find((f) => f.tempId === activeFaceId) ?? null;
  // Count confirmed tags + pending suggestions (will be auto-confirmed on continue)
  const taggedCount = faces.filter((f) => f.personName || f.suggestion).length;

  // ── Manual tap-to-place helper ───────────────────────────────────────────────

  function handleImageTap(clientX: number, clientY: number) {
    if (!drawMode || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const r = 0.09; // circle radius as fraction of image dimension
    const newFace: FaceDraft = {
      tempId: `manual-${Date.now()}`,
      boundingBox: {
        x: Math.max(0, px - r),
        y: Math.max(0, py - r),
        width: r * 2,
        height: r * 2,
      },
      descriptor: [],
      personName: null,
      suggestion: null,
    };
    setFaces((prev) => [...prev, newFace]);
    setActiveFaceId(newFace.tempId);
    setDrawMode(false);
  }

  // Auto-confirm any pending suggestions before handing off
  function handleDone() {
    onDone(blob, faces.map((f) => ({
      ...f,
      personName: f.personName ?? f.suggestion ?? null,
    })));
  }

  return (
    <>
      <style>{`
        @keyframes tagSheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes tagFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .tag-sheet { animation: tagSheetUp 0.28s cubic-bezier(0.34,1.4,0.64,1) both; }
        .face-ring {
          position: absolute;
          border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.85);
          box-shadow: 0 0 0 1.5px rgba(0,0,0,0.35), 0 3px 12px rgba(0,0,0,0.35);
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .face-ring:active { transform: scale(0.94); }
        .face-ring.ring-tagged { border-color: #22c55e; box-shadow: 0 0 0 2px #22c55e, 0 3px 12px rgba(34,197,94,0.4); }
        .face-ring.ring-suggested { border-color: #60a5fa; border-style: dashed; box-shadow: 0 0 0 1.5px rgba(0,0,0,0.2), 0 3px 12px rgba(96,165,250,0.35); }
        .face-ring.ring-active { border-color: #0ea5e9; box-shadow: 0 0 0 2.5px #0ea5e9, 0 4px 18px rgba(14,165,233,0.5); }
        .person-row {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 20px; cursor: pointer; transition: background 0.1s;
        }
        .person-row:active { background: #f3f4f6; }
        .person-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 700; color: #0369a1; flex-shrink: 0;
        }
        .face-box {
          position: absolute;
          border-radius: 8px;
          border: 2.5px solid rgba(255,255,255,0.85);
          box-shadow: 0 0 0 1.5px rgba(0,0,0,0.35), 0 3px 12px rgba(0,0,0,0.35);
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .face-box.ring-tagged { border-color: #22c55e; box-shadow: 0 0 0 2px #22c55e, 0 3px 12px rgba(34,197,94,0.4); }
        .face-box.ring-active { border-color: #0ea5e9; box-shadow: 0 0 0 2.5px #0ea5e9, 0 4px 18px rgba(14,165,233,0.5); }
      `}</style>

      {/* ── Header — above the face-sheet backdrop (zIndex 1200) ─────────── */}
      <div ref={headerRef} style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1300,
        background: "#000",
        display: "flex", flexDirection: "column",
        padding: "16px 20px 10px",
        paddingTop: "max(16px, env(safe-area-inset-top))",
        gap: 6,
      }}>
        {/* Row 1: actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => onSkip(blob)}
            style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            {t.skip}
          </button>
          <button
            onClick={handleDone}
            style={{
              fontSize: 14, fontWeight: 700,
              color: phase === "ready" ? "#0ea5e9" : "rgba(255,255,255,0.35)",
              background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            }}
            disabled={phase === "detecting"}
          >
            {taggedCount > 0 ? `${t.done} (${taggedCount})` : t.done}
          </button>
        </div>
        {/* Row 2: status title */}
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "-0.01em", textAlign: "center" }}>
          {phase === "detecting" ? t.tag_detecting : faces.length === 0 ? t.tag_tagPeople : i(t.tag_tagPeopleFound, { n: faces.length })}
        </p>
      </div>

      {/* ── Full-screen dark container ─────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "#000",
        display: "flex", flexDirection: "column",
        paddingTop: headerH,
      }}>

        {/* Photo + face overlays */}
        <div
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "4px 0" }}
          onClick={(e) => {
            if (drawMode) handleImageTap(e.clientX, e.clientY);
            else setActiveFaceId(null);
          }}
          onTouchEnd={drawMode ? (e) => { e.preventDefault(); const t = e.changedTouches[0]; handleImageTap(t.clientX, t.clientY); } : undefined}
        >
          <div
            style={{ position: "relative", cursor: drawMode ? "crosshair" : "default" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={objUrlRef.current}
              alt="Photo to tag"
              onLoad={() => setImgLoaded(true)}
              style={{
                display: "block",
                maxWidth: "100vw",
                maxHeight: "calc(100svh - 180px)",
                objectFit: "contain",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            />
            {/* Detecting overlay — spinner over the image, not a black screen */}
            {phase === "detecting" && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.35)",
                borderRadius: 4,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.25)",
                  borderTopColor: "white",
                  animation: "spin 0.7s linear infinite",
                }} />
              </div>
            )}

            {/* Face rings (auto-detected) + boxes (manual) */}
            {imgLoaded && renderedSize.w > 0 && phase === "ready" && faces.map((face) => {
              const { x, y, width, height } = face.boundingBox;
              const isManual = face.descriptor.length === 0;
              const isActive = activeFaceId === face.tempId;
              const isTagged = !!face.personName;
              const hasSuggestion = !!face.suggestion && !isTagged;

              if (isManual) {
                // Rectangular box for manually drawn faces
                const boxClass = `face-box ${isActive ? "ring-active" : isTagged ? "ring-tagged" : ""}`;
                return (
                  <div
                    key={face.tempId}
                    className={boxClass}
                    style={{
                      left: x * renderedSize.w,
                      top: y * renderedSize.h,
                      width: width * renderedSize.w,
                      height: height * renderedSize.h,
                      pointerEvents: drawMode ? "none" : "auto",
                    }}
                    onClick={(e) => { e.stopPropagation(); setActiveFaceId(isActive ? null : face.tempId); }}
                  >
                    {isTagged && (
                      <span style={{
                        position: "absolute", bottom: -26, left: "50%",
                        transform: "translateX(-50%)",
                        whiteSpace: "nowrap", padding: "3px 10px",
                        background: "rgba(0,0,0,0.68)", backdropFilter: "blur(6px)",
                        borderRadius: 20, fontSize: 11, fontWeight: 700, color: "white",
                        pointerEvents: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                      }}>
                        {face.personName}
                      </span>
                    )}
                    {!isTagged && !isActive && (
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: 6,
                        background: "rgba(255,255,255,0.07)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>+</span>
                      </div>
                    )}
                  </div>
                );
              }

              // Circular ring for auto-detected faces
              const cx = (x + width / 2) * renderedSize.w;
              const cy = (y + height / 2) * renderedSize.h;
              const diameter = Math.max(width * renderedSize.w, height * renderedSize.h) * 1.25;
              const ringClass = `face-ring ${isActive ? "ring-active" : isTagged ? "ring-tagged" : hasSuggestion ? "ring-suggested" : ""}`;

              return (
                <div
                  key={face.tempId}
                  className={ringClass}
                  style={{
                    left: cx - diameter / 2,
                    top: cy - diameter / 2,
                    width: diameter,
                    height: diameter,
                    pointerEvents: drawMode ? "none" : "auto",
                  }}
                  onClick={(e) => { e.stopPropagation(); setActiveFaceId(isActive ? null : face.tempId); }}
                >
                  {hasSuggestion && !isActive && (
                    <button
                      style={{
                        position: "absolute", top: -32, left: "50%",
                        transform: "translateX(-50%)",
                        whiteSpace: "nowrap", padding: "4px 10px",
                        background: "rgba(14,165,233,0.88)", backdropFilter: "blur(6px)",
                        borderRadius: 20, border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 700, color: "white",
                        display: "flex", alignItems: "center", gap: 4,
                        animation: "tagFadeIn 0.2s ease",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      }}
                      onClick={(e) => { e.stopPropagation(); confirmSuggestion(face.tempId); }}
                    >
                      ✓ {face.suggestion}
                    </button>
                  )}
                  {isTagged && (
                    <span style={{
                      position: "absolute", bottom: -26, left: "50%",
                      transform: "translateX(-50%)",
                      whiteSpace: "nowrap", padding: "3px 10px",
                      background: "rgba(0,0,0,0.68)", backdropFilter: "blur(6px)",
                      borderRadius: 20, fontSize: 11, fontWeight: 700, color: "white",
                      pointerEvents: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    }}>
                      {face.personName}
                    </span>
                  )}
                  {!isTagged && !hasSuggestion && !isActive && (
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      background: "rgba(255,255,255,0.07)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>+</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Detecting overlay */}
            {phase === "detecting" && imgLoaded && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "tagFadeIn 0.2s ease",
              }}>
                <div style={{
                  background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
                  borderRadius: 18, padding: "14px 24px",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <Spinner />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{t.tag_detecting}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Draw mode hint / no faces hint */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", minHeight: 36, animation: "tagFadeIn 0.3s ease" }}>
          {drawMode ? (
            <span style={{
              fontSize: 12, color: "white",
              background: "rgba(14,165,233,0.85)", backdropFilter: "blur(6px)",
              borderRadius: 20, padding: "6px 18px", fontWeight: 600,
            }}>
              {t.tag_drawHint}
            </span>
          ) : phase === "ready" && faces.length === 0 ? (
            <span style={{
              fontSize: 12, color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 20, padding: "6px 18px",
            }}>
              {t.tag_noFaces}
            </span>
          ) : null}
        </div>

        {/* Add person + Continue buttons */}
        <div style={{
          padding: "8px 20px 12px",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          flexShrink: 0, display: "flex", flexDirection: "column", gap: 10,
        }}>
          {/* Add manually button */}
          {phase === "ready" && (
            <button
              onClick={() => { setDrawMode(!drawMode); setActiveFaceId(null); }}
              style={{
                width: "100%", padding: "12px",
                background: drawMode ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.1)",
                border: drawMode ? "1.5px solid rgba(14,165,233,0.6)" : "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: 14,
                fontSize: 14, fontWeight: 600,
                color: drawMode ? "#7dd3fc" : "rgba(255,255,255,0.75)",
                cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>{drawMode ? "✕" : "+"}</span>
              {drawMode ? t.tag_cancelDraw : t.tag_addManual}
            </button>
          )}

          {/* Continue button */}
          <button
            onClick={handleDone}
            disabled={phase === "detecting"}
            style={{
              width: "100%", padding: "15px",
              background: phase === "detecting" ? "rgba(255,255,255,0.2)" : "white",
              color: "#111827", border: "none", borderRadius: 14,
              fontSize: 15, fontWeight: 700,
              cursor: phase === "detecting" ? "default" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {phase === "detecting"
              ? t.tag_detecting2
              : taggedCount > 0
              ? i(t.tag_continueTagged, { n: taggedCount })
              : t.tag_continue}
          </button>
        </div>
      </div>

      {/* ── Bottom sheet for tagging ──────────────────────────────────── */}
      {activeFaceId && activeFace && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1200,
            background: "rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}
          onClick={() => setActiveFaceId(null)}
        >
          <div
            className="tag-sheet"
            style={{
              background: "white",
              borderRadius: "22px 22px 0 0",
              maxHeight: "65svh",
              display: "flex", flexDirection: "column",
              paddingBottom: "env(safe-area-inset-bottom)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet handle + header */}
            <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "0 auto 14px" }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>{t.tag_whoIsThis}</p>

              {/* Auto-suggestion confirm chip */}
              {activeFace.suggestion && !activeFace.personName && (
                <button
                  onClick={() => confirmSuggestion(activeFace.tempId)}
                  style={{
                    width: "100%", padding: "12px 16px",
                    background: "#eff6ff", border: "1.5px solid #bfdbfe",
                    borderRadius: 12, cursor: "pointer", marginBottom: 10,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <p style={{ fontSize: 11, color: "#0369a1", margin: "0 0 1px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t.tag_looksLike}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#0369a1", margin: 0 }}>{activeFace.suggestion}</p>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: "white",
                    background: "#0369a1", borderRadius: 20, padding: "5px 14px",
                    flexShrink: 0,
                  }}>{t.tag_confirmCta}</span>
                </button>
              )}

              {/* Search / type new */}
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim()) tagFace(activeFaceId, search.trim());
                }}
                placeholder={t.tag_searchOrType}
                style={{
                  width: "100%", padding: "10px 14px",
                  border: "1.5px solid #e5e7eb", borderRadius: 10,
                  fontSize: 16, outline: "none",
                  background: "#f9fafb", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Person list */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {/* Create new if not in list */}
              {search.trim() && !persons.some((p) => p.name.toLowerCase() === search.trim().toLowerCase()) && (
                <div
                  className="person-row"
                  onClick={() => tagFace(activeFaceId, search.trim())}
                >
                  <div className="person-avatar" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)", color: "#92400e" }}>+</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>
                      &ldquo;{search.trim()}&rdquo;
                    </p>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "1px 0 0" }}>{t.tag_createNew}</p>
                  </div>
                </div>
              )}

              {persons.slice(0, 5).map((person) => {
                const isVerified = !!person.userId;
                return (
                  <div
                    key={person.id}
                    className="person-row"
                    onClick={() => tagFace(activeFaceId, person.name)}
                  >
                    <div className="person-avatar" style={isVerified ? { background: "linear-gradient(135deg, #dbeafe, #bfdbfe)", color: "#1d4ed8" } : undefined}>
                      {person.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>
                          {person.name}
                        </p>
                        {isVerified && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 16, height: 16, borderRadius: "50%",
                            background: "#0369a1", flexShrink: 0,
                          }}>
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                    {activeFace.personName === person.name && (
                      <span style={{ marginLeft: "auto", fontSize: 13, color: "#22c55e", fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                );
              })}

              {/* Remove existing tag */}
              {activeFace.personName && (
                <>
                  <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0" }} />
                  <div
                    className="person-row"
                    onClick={() => { removeTag(activeFaceId); setActiveFaceId(null); }}
                  >
                    <div className="person-avatar" style={{ background: "#fee2e2", color: "#dc2626" }}>✕</div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#dc2626", margin: 0 }}>{t.tag_removeTag}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <style>{`@keyframes tSpin{to{transform:rotate(360deg)}} .tsp{animation:tSpin 0.75s linear infinite; transform-origin:12px 12px;}`}</style>
      <g className="tsp">
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 2a10 10 0 0 0-10 10" opacity="0.25" />
      </g>
    </svg>
  );
}
