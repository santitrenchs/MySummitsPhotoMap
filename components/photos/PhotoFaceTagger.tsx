"use client";

import { useEffect, useRef, useState } from "react";
import { getFaceApi } from "./faceApiSingleton";

type BoundingBox = { x: number; y: number; width: number; height: number };
type TaggedUser = { id: string; name: string; username: string | null };
type FaceTag = { id: string; userId: string | null; user: TaggedUser | null };
type Detection = { id: string; boundingBox: BoundingBox; faceTags: FaceTag[]; descriptor?: number[] };
type KnownPerson = { userId: string; name: string; descriptors: number[][] };
type SearchUser = { id: string; name: string; username: string | null };

export function PhotoFaceTagger({
  photo,
  onClose,
}: {
  photo: { id: string; url: string };
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [activeBox, setActiveBox] = useState<string | null>(null); // faceDetectionId being tagged
  const [tagInput, setTagInput] = useState("");
  const [persons, setPersons] = useState<SearchUser[]>([]);
  const [saving, setSaving] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false); // kept for future use
  const [status, setStatus] = useState<string | null>(null);
  const [faceMatches, setFaceMatches] = useState<Map<string, { userId: string; label: string }>>(new Map());
  const [loadingInitial, setLoadingInitial] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing detections on mount
  useEffect(() => {
    fetch(`/api/photos/${photo.id}/faces`).then((r) => r.json()).catch(() => [])
      .then((facesData) => setDetections(Array.isArray(facesData) ? facesData : []))
      .finally(() => setLoadingInitial(false));
  }, [photo.id]);

  // Debounced friend search
  useEffect(() => {
    if (!tagInput.trim()) { setPersons([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetch(`/api/persons?q=${encodeURIComponent(tagInput.trim())}`)
        .then((r) => r.json()).then((d) => setPersons(Array.isArray(d) ? d : []));
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [tagInput]);

  // Focus input when a box is activated
  useEffect(() => {
    if (activeBox) setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeBox]);

  async function detectFaces() {
    setDetecting(true);
    setStatus("Carregant models…");
    let faceapi: Awaited<ReturnType<typeof getFaceApi>>;
    try {
      faceapi = await getFaceApi();
    } catch {
      setStatus("Error carregant models");
      setDetecting(false);
      return;
    }
    setModelLoaded(true);
    setStatus(null);
    if (!imgRef.current) { setDetecting(false); return; }

    const img = imgRef.current;
    if (!img.complete || img.width === 0 || img.naturalWidth === 0) {
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
    }

    setStatus("Detecting faces…");
    try {
      // Detect faces + landmarks + descriptors in one pass
      const results = await faceapi
        .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      const faces = results.map((det) => ({
        boundingBox: {
          x: det.detection.box.x / img.naturalWidth,
          y: det.detection.box.y / img.naturalHeight,
          width: det.detection.box.width / img.naturalWidth,
          height: det.detection.box.height / img.naturalHeight,
        },
        descriptor: Array.from(det.descriptor),
      }));

      setStatus(`Saving ${faces.length} face${faces.length !== 1 ? "s" : ""}…`);
      const res = await fetch(`/api/photos/${photo.id}/faces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faces }),
      });
      const savedData = await res.json();
      if (!res.ok) throw new Error(savedData.error ?? `HTTP ${res.status}`);
      setDetections(Array.isArray(savedData) ? savedData : []);

      // Match against known persons
      if (faces.length > 0) {
        setStatus("Matching known faces…");
        const knownRes = await fetch("/api/persons/descriptors");
        const known: KnownPerson[] = await knownRes.json();
        if (known.length > 0) {
          const userIdToLabel = new Map(known.map((p) => [p.userId, p.name]));
          const labeled = known.map(
            (p) => new faceapi.LabeledFaceDescriptors(
              p.userId,
              p.descriptors.map((d) => new Float32Array(d))
            )
          );
          const matcher = new faceapi.FaceMatcher(labeled, 0.6);
          const newSuggestions = new Map<string, { userId: string; label: string }>();
          (Array.isArray(savedData) ? savedData : []).forEach((det, i) => {
            if (!faces[i]) return;
            const desc = new Float32Array(faces[i].descriptor);
            const match = matcher.findBestMatch(desc);
            if (match.label !== "unknown") {
              newSuggestions.set(det.id, { userId: match.label, label: userIdToLabel.get(match.label) ?? match.label });
            }
          });
          setFaceMatches(newSuggestions);
          setStatus(newSuggestions.size > 0 ? `Matched ${newSuggestions.size} face(s)` : `No match (known: ${known.length})`);
        } else {
          setStatus("No known faces to compare");
        }
      }

      if (faces.length === 0) setStatus("No faces detected");
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setDetecting(false);
  }

  async function saveTag(faceDetectionId: string, userId: string) {
    setSaving(true);
    const res = await fetch(`/api/face-detections/${faceDetectionId}/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const tag: FaceTag = await res.json();
    setDetections((prev) =>
      prev.map((d) => d.id === faceDetectionId ? { ...d, faceTags: [tag] } : d)
    );
    setTagInput("");
    setActiveBox(null);
    setSaving(false);
  }

  async function removeTag(faceDetectionId: string) {
    await fetch(`/api/face-detections/${faceDetectionId}/tag`, { method: "DELETE" });
    setDetections((prev) =>
      prev.map((d) => d.id === faceDetectionId ? { ...d, faceTags: [] } : d)
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        background: "white", borderRadius: 16,
        width: "min(900px, 100%)", maxHeight: "calc(100vh - 32px)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid #e5e7eb",
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Tag faces</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {status && (
              <span style={{
                fontSize: 12, color: detecting ? "#0369a1" : "#6b7280",
                background: detecting ? "#eff6ff" : "#f3f4f6",
                padding: "3px 8px", borderRadius: 10, fontWeight: 500,
              }}>{status}</span>
            )}
            <button
              onClick={detectFaces}
              disabled={detecting || !imgLoaded || loadingInitial}
              style={{
                padding: "6px 14px", background: "#0369a1", color: "white",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer", opacity: detecting || !imgLoaded || loadingInitial ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {(detecting || loadingInitial) && (
                <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />
              )}
              {loadingInitial ? "Carregant…" : detecting ? "Detectant…" : !imgLoaded ? "Carregant…" : detections.length > 0 ? "Re-detectar" : "Detectar cares"}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, border: "none", background: "#f3f4f6",
                borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#6b7280",
              }}
            >✕</button>
          </div>
        </div>

        {/* Image area */}
        <div style={{ flex: 1, overflow: "auto", padding: 20, textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {loadingInitial && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.7)", borderRadius: 8,
                pointerEvents: "none",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#0369a1", animation: "spin 0.7s linear infinite" }} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={`/api/photos/${photo.id}/proxy`}
              alt="Photo"
              onLoad={() => setImgLoaded(true)}
              style={{ display: "block", maxWidth: "100%", maxHeight: "calc(100vh - 200px)", borderRadius: 8 }}
            />

            {/* SVG overlay — guaranteed to cover image exactly */}
            {imgLoaded && detections.length > 0 && (
              <svg
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
              >
                {detections.map((det, i) => {
                  const box = det.boundingBox as BoundingBox;
                  const tagged = det.faceTags[0]?.user;
                  const suggested = faceMatches.get(det.id);
                  const color = tagged ? "#16a34a" : suggested ? "#1d4ed8" : "#f59e0b";
                  const label = tagged ? (tagged.username ?? tagged.name) : suggested ? `? ${suggested}` : `Face ${i + 1}`;
                  return (
                    <g key={det.id} style={{ cursor: "pointer" }} onClick={(e) => {
                      e.stopPropagation();
                      setActiveBox(activeBox === det.id ? null : det.id);
                      setTagInput(tagged ? (tagged.username ?? tagged.name) : suggested ?? "");
                    }}>
                      <rect
                        x={box.x} y={box.y} width={box.width} height={box.height}
                        fill="rgba(0,0,0,0.05)" stroke={color} strokeWidth="0.004"
                        vectorEffect="non-scaling-stroke"
                      />
                      <rect
                        x={box.x} y={Math.max(0, box.y - 0.04)}
                        width={Math.min(box.width, 0.35)} height={0.035}
                        fill={color} rx="0.004"
                      />
                      <text
                        x={box.x + 0.005} y={Math.max(0.03, box.y - 0.01)}
                        fontSize="0.028" fill="white" fontWeight="bold"
                        style={{ userSelect: "none" }}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Popover for active box — positioned with % */}
            {activeBox && (() => {
              const det = detections.find((d) => d.id === activeBox);
              if (!det) return null;
              const box = det.boundingBox as BoundingBox;
              const tagged = det.faceTags[0]?.user;
              return (
                <div
                  style={{
                    position: "absolute",
                    left: `${box.x * 100}%`,
                    top: `${(box.y + box.height) * 100 + 1}%`,
                    background: "white", border: "1px solid #e5e7eb",
                    borderRadius: 8, padding: 10,
                    zIndex: 10, width: 200,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {faceMatches.has(det.id) && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Recognized as:</div>
                      <button
                        onClick={() => {
                          const m = faceMatches.get(det.id)!;
                          saveTag(det.id, m.userId);
                        }}
                        style={{
                          width: "100%", padding: "5px 8px", background: "#eff6ff",
                          color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6,
                          fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left",
                        }}
                      >
                        ✓ {faceMatches.get(det.id)!.label}
                      </button>
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && persons.length === 1) saveTag(det.id, persons[0].id);
                      if (e.key === "Escape") setActiveBox(null);
                    }}
                    placeholder="Person name…"
                    style={{
                      width: "100%", padding: "6px 8px",
                      border: "1px solid #d1d5db", borderRadius: 6,
                      fontSize: 16, outline: "none", boxSizing: "border-box",
                    }}
                  />
                  {suggestions.length > 0 && (
                    <div style={{ marginTop: 4, maxHeight: 120, overflowY: "auto" }}>
                      {persons.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => saveTag(det.id, p.id)}
                          style={{ padding: "4px 8px", fontSize: 12, cursor: "pointer", borderRadius: 4, color: "#374151" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {p.username ?? p.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button
                      onClick={() => persons.length === 1 && saveTag(det.id, persons[0].id)}
                      disabled={saving || persons.length !== 1}
                      style={{
                        flex: 1, padding: "5px 8px", background: "#0369a1",
                        color: "white", border: "none", borderRadius: 6,
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        opacity: saving || persons.length !== 1 ? 0.5 : 1,
                      }}
                    >
                      Save
                    </button>
                    {tagged && (
                      <button
                        onClick={() => { removeTag(det.id); setActiveBox(null); }}
                        style={{
                          padding: "5px 8px", background: "#fee2e2",
                          color: "#dc2626", border: "none", borderRadius: 6,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer: list of tagged persons */}
        {detections.some((d) => d.faceTags.length > 0) && (
          <div style={{
            padding: "12px 20px", borderTop: "1px solid #e5e7eb",
            display: "flex", gap: 8, flexWrap: "wrap",
          }}>
            {detections
              .filter((d) => d.faceTags.length > 0)
              .map((d) => (
                <span
                  key={d.id}
                  style={{
                    fontSize: 12, fontWeight: 600, color: "#16a34a",
                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                    borderRadius: 20, padding: "2px 10px",
                  }}
                >
                  {d.faceTags[0].user?.username ?? d.faceTags[0].user?.name ?? ""}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
