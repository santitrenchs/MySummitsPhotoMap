"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { ImageCropModal } from "@/components/photos/ImageCropModal";
import { PhotoTagStep, type FaceDraft } from "@/components/photos/PhotoTagStep";

// ─── Types ────────────────────────────────────────────────────────────────────

type Person = { id: string; name: string; email: string | null };

export type AscentDetailProps = {
  id: string;
  peakName: string;
  peakAltitudeM: number;
  peakMountainRange: string | null;
  peakLatitude: number;
  peakLongitude: number;
  date: string;        // pre-formatted string
  dateLocale: string;  // for toLocaleString
  rawDate: string;     // ISO for metadata
  route: string | null;
  description: string | null;
  wikiloc: string | null;
  userName: string;
  heroPhoto: { id: string; url: string } | null;
  persons: Person[];
  ascentId: string;
};

// ─── Main component ───────────────────────────────────────────────────────────

export function AscentDetailClient(props: AscentDetailProps) {
  const {
    id, peakName, peakAltitudeM, peakMountainRange,
    peakLatitude, peakLongitude,
    date, dateLocale, rawDate, route, description, wikiloc, userName,
    heroPhoto: initialPhoto, persons,
  } = props;

  const t = useT();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState(initialPhoto);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [tagBlob, setTagBlob] = useState<Blob | null>(null);
  const [existingFaces, setExistingFaces] = useState<FaceDraft[]>([]);
  const [replacing, setReplacing] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }

  // ── Inline edit: date ─────────────────────────────────────────────────────
  const [currentRawDate, setCurrentRawDate] = useState(rawDate.slice(0, 10));
  const [currentDisplayDate, setCurrentDisplayDate] = useState(date);
  const [showDatePicker, setShowDatePicker] = useState(false);

  async function saveDateChange(val: string) {
    setCurrentRawDate(val);
    setShowDatePicker(false);
    const res = await fetch(`/api/ascents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: val }),
    });
    if (res.ok) {
      const formatted = new Date(val + "T12:00:00").toLocaleDateString(dateLocale, {
        day: "numeric", month: "long", year: "numeric",
      });
      setCurrentDisplayDate(formatted);
      showToast("Data guardada");
      router.refresh();
    }
  }

  // ── Inline edit: description + route ─────────────────────────────────────
  const [currentDescription, setCurrentDescription] = useState(description);
  const [currentRoute, setCurrentRoute] = useState(route);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingRoute, setEditingRoute] = useState(false);
  const [descDraft, setDescDraft] = useState(description ?? "");
  const [routeDraft, setRouteDraft] = useState(route ?? "");
  const [savingField, setSavingField] = useState(false);
  const descCancelRef = useRef(false);
  const routeCancelRef = useRef(false);

  async function saveDescriptionOnBlur() {
    if (descCancelRef.current) { descCancelRef.current = false; return; }
    setSavingField(true);
    try {
      const res = await fetch(`/api/ascents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descDraft || null }),
      });
      if (res.ok) {
        setCurrentDescription(descDraft || null);
        setEditingDescription(false);
        showToast("Notes guardades");
        router.refresh();
      }
    } finally {
      setSavingField(false);
    }
  }

  async function saveRouteOnBlur() {
    if (routeCancelRef.current) { routeCancelRef.current = false; return; }
    setSavingField(true);
    try {
      const res = await fetch(`/api/ascents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route: routeDraft || null }),
      });
      if (res.ok) {
        setCurrentRoute(routeDraft || null);
        setEditingRoute(false);
        showToast("Ruta guardada");
        router.refresh();
      }
    } finally {
      setSavingField(false);
    }
  }

  // ── Delete ascent ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/ascents/${id}`, { method: "DELETE" });
      router.push("/ascents");
    } finally {
      setDeleting(false);
    }
  }

  // ── Wikiloc inline add ────────────────────────────────────────────────────
  const [currentWikiloc, setCurrentWikiloc] = useState(wikiloc);
  const [showWikilockInput, setShowWikilockInput] = useState(false);
  const [wikilockDraft, setWikilockDraft] = useState("");
  const [savingWikiloc, setSavingWikiloc] = useState(false);

  function normalizeWikilockUrl(input: string): string {
    let url = input.trim();
    // Ensure absolute URL
    if (url && !url.startsWith("http")) url = "https://" + url;
    // If it's already an embed URL, use as-is
    if (url.includes("embedv2.do")) return url;
    // Transform regular Wikiloc route URL → embed URL
    // e.g. https://es.wikiloc.com/rutas-outdoor/name-12345678
    const match = url.match(/wikiloc\.com\/[^?#]*?-(\d+)(?:[?#]|$)/);
    if (match) return `https://es.wikiloc.com/wikiloc/embedv2.do?id=${match[1]}`;
    return url;
  }

  async function saveWikiloc() {
    const url = normalizeWikilockUrl(wikilockDraft);
    if (!url) return;
    setSavingWikiloc(true);
    try {
      const res = await fetch(`/api/ascents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wikiloc: url }),
      });
      if (res.ok) {
        setCurrentWikiloc(url);
        setShowWikilockInput(false);
        setWikilockDraft("");
        router.refresh();
      }
    } finally {
      setSavingWikiloc(false);
    }
  }

  async function removeWikiloc() {
    await fetch(`/api/ascents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wikiloc: null }),
    });
    setCurrentWikiloc(null);
    router.refresh();
  }

  // ── Photo replace flow ────────────────────────────────────────────────────

  async function openEditPhoto() {
    if (photo) {
      setReplacing(true);
      try {
        const [blobRes, facesRes] = await Promise.all([
          fetch(`/api/photos/${photo.id}/proxy`),
          fetch(`/api/photos/${photo.id}/faces`),
        ]);
        const [blob, facesData] = await Promise.all([blobRes.blob(), facesRes.json()]);
        const file = new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });

        const faces: FaceDraft[] = (Array.isArray(facesData) ? facesData : []).map(
          (det: { id: string; boundingBox: FaceDraft["boundingBox"]; descriptor: number[] | null; faceTags: { status: string; person: { name: string } }[] }) => ({
            tempId: `existing-${det.id}`,
            boundingBox: det.boundingBox,
            descriptor: det.descriptor ?? [],
            personName: det.faceTags[0]?.person.name ?? null,
            suggestion: null,
          })
        );

        setExistingFaces(faces);
        setCropFile(file);
      } finally {
        setReplacing(false);
      }
    } else {
      setExistingFaces([]);
      fileInputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCropFile(file);
    e.target.value = "";
  }

  function handleCropDone(blob: Blob) {
    setCropFile(null);
    setTagBlob(blob);
  }

  function handleCropCancel() {
    setCropFile(null);
    setExistingFaces([]);
  }

  async function uploadPhotoWithFaces(blob: Blob, faces: FaceDraft[]) {
    setTagBlob(null);
    setReplacing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      fd.append("ascentId", id);
      const uploadRes = await fetch("/api/photos/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const newPhoto = await uploadRes.json();

      // Save face tags if any were added
      if (faces.length > 0) {
        await fetch(`/api/photos/${newPhoto.id}/faces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faces: faces.map((f) => ({
              boundingBox: f.boundingBox,
              descriptor: f.descriptor,
              personName: f.personName ?? null,
            })),
          }),
        });
      }

      // Delete old photo if one existed
      if (photo) {
        await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
      }

      setPhoto({ id: newPhoto.id, url: newPhoto.url });
      router.refresh();
    } catch {
      // silently ignore — page refresh will show real state
    } finally {
      setReplacing(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const osmLink = `https://www.openstreetmap.org/?mlat=${peakLatitude}&mlon=${peakLongitude}#map=13/${peakLatitude}/${peakLongitude}`;
  // Build a public Wikiloc link from the embed URL (extract id param)
  const wikilockOpenUrl = (() => {
    if (!currentWikiloc) return null;
    try {
      const idMatch = currentWikiloc.match(/[?&]id=(\d+)/);
      if (idMatch) return `https://www.wikiloc.com/trails/hiking/${idMatch[1]}`;
      return currentWikiloc; // fallback: use as-is
    } catch { return currentWikiloc; }
  })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {toast && <ToastNotification message={toast} />}

      {/* Date picker sheet */}
      {showDatePicker && (
        <DatePickerSheet
          value={currentRawDate}
          locale={dateLocale}
          todayLabel={t.date_today}
          selectYearLabel={t.date_selectYear}
          onSelect={saveDateChange}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* Hidden file input for photo replace */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Crop modal */}
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      {/* Face tag step — same flow as new ascent creation */}
      {tagBlob && (
        <PhotoTagStep
          blob={tagBlob}
          initialFaces={existingFaces}
          onDone={(blob, faces) => uploadPhotoWithFaces(blob, faces)}
          onSkip={() => setTagBlob(null)}
        />
      )}


      <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 48 }}>

        {/* ── HERO IMAGE ────────────────────────────────────────────────── */}
        <div style={{ position: "relative", aspectRatio: "4/5", background: "#0f172a", overflow: "hidden" }}>

          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={peakName}
              style={{
                width: "100%", height: "100%", objectFit: "cover", display: "block",
                opacity: replacing ? 0.5 : 1, transition: "opacity 0.2s",
              }}
            />
          ) : (
            <HeroPlaceholder />
          )}

          {/* Upload overlay */}
          {replacing && tagBlob === null && cropFile === null && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 20,
              background: "rgba(0,0,0,0.5)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              pointerEvents: "none",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{t.saving}</span>
            </div>
          )}

          {/* Top gradient (for action buttons readability) */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 80,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />

          {/* Bottom gradient (for peak name readability) */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 140,
            background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
            pointerEvents: "none",
          }} />

          {/* ← Back button (top-left) */}
          <Link
            href="/ascents"
            style={{
              position: "absolute", top: 16, left: 16,
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 18, textDecoration: "none",
            }}
          >←</Link>

          {/* Action buttons (top-right) */}
          <div style={{
            position: "absolute", top: 16, right: 16,
            display: "flex", gap: 8,
          }}>
            {/* Edit photo */}
            <button
              onClick={openEditPhoto}
              disabled={replacing}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 13px", borderRadius: 20, border: "none",
                background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "white", fontSize: 12, fontWeight: 600,
                cursor: replacing ? "wait" : "pointer", opacity: replacing ? 0.7 : 1,
                minHeight: 36,
              }}
            >
              {replacing && !tagBlob ? (
                <>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                  <span>Carregant…</span>
                </>
              ) : (
                <>
                  <span>✏️</span>
                  <span>{photo ? t.detail_editPhoto : t.detail_addPhoto}</span>
                </>
              )}
            </button>

          </div>

          {/* Bottom-left: peak name + date */}
          <div style={{ position: "absolute", bottom: 14, left: 14, right: 80 }}>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 800, color: "white",
              lineHeight: 1.2, letterSpacing: "-0.01em",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}>
              {peakName}
            </h1>
            <p
              onClick={() => setShowDatePicker(true)}
              style={{
                margin: "4px 0 0", fontSize: 13, fontWeight: 500,
                color: "rgba(255,255,255,0.75)", cursor: "pointer",
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                textDecorationColor: "rgba(255,255,255,0.4)",
                textUnderlineOffset: 3,
              }}
            >
              {currentDisplayDate}
            </p>
          </div>

          {/* Bottom-right: altitude badge */}
          <div style={{
            position: "absolute", bottom: 14, right: 14,
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 20, padding: "5px 10px",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.01em" }}>
              {peakAltitudeM} m
            </span>
          </div>
        </div>

        {/* ── PERSONS ROW ──────────────────────────────────────────────── */}
        {persons.length > 0 && (
          <div style={{
            padding: "10px 14px",
            borderBottom: "1px solid #f3f4f6",
            background: "white",
            display: "flex", gap: 5, flexWrap: "wrap",
          }}>
            {persons.map((p) => (
              <Link key={p.id} href={`/persons/${p.id}`} style={{ textDecoration: "none" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 12, fontWeight: 600, color: "#374151",
                  background: "#f3f4f6", border: "1px solid #e5e7eb",
                  borderRadius: 20, padding: "3px 10px",
                }}>
                  <span style={{
                    width: 15, height: 15, borderRadius: "50%",
                    background: "#dbeafe", color: "#0369a1",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 700, flexShrink: 0,
                  }}>
                    {p.name[0]?.toUpperCase()}
                  </span>
                  {p.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div style={{ padding: "0 16px" }}>

          {/* ── CAPTION ───────────────────────────────────────────────── */}
          <div style={{ padding: "18px 0 0" }}>
            <p style={{ fontSize: 15, color: "#111827", lineHeight: 1.5, margin: 0 }}>
              <span style={{ fontWeight: 700 }}>{userName}</span>
              {persons.length > 0 && (
                <span style={{ fontWeight: 400 }}>
                  {" "}{t.detail_with.toLowerCase()}{" "}
                  {persons.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && (i === persons.length - 1 ? ` ${t.detail_and} ` : ", ")}
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                    </span>
                  ))}
                </span>
              )}
            </p>

            {/* Description — inline editable, autosave on blur */}
            <div style={{ marginTop: 6, marginBottom: 14 }}>
              {editingDescription ? (
                <div style={{ position: "relative" }}>
                  <textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onBlur={saveDescriptionOnBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        descCancelRef.current = true;
                        setEditingDescription(false);
                        setDescDraft(currentDescription ?? "");
                      }
                    }}
                    placeholder={t.field_notesPlaceholder}
                    rows={3}
                    autoFocus
                    disabled={savingField}
                    style={{
                      width: "100%", padding: "7px 10px",
                      border: "1px solid #d1d5db", borderRadius: 8,
                      fontSize: 14, color: "#111827", outline: "none",
                      boxSizing: "border-box", background: "white",
                      resize: "vertical", opacity: savingField ? 0.6 : 1,
                    }}
                  />
                  {savingField && (
                    <div style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #d1d5db", borderTopColor: "#0369a1", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{t.saving}</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setDescDraft(currentDescription ?? ""); setEditingDescription(true); }}
                  style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    textAlign: "left", width: "100%",
                  }}
                >
                  {currentDescription ? (
                    <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: 0 }}>
                      {currentDescription}
                    </p>
                  ) : (
                    <p style={{ fontSize: 14, color: "#d1d5db", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                      {t.field_notesPlaceholder}
                    </p>
                  )}
                </button>
              )}
            </div>

            {/* Route — inline editable, autosave on blur */}
            {editingRoute ? (
              <div style={{ marginBottom: 16, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>📍</span>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    value={routeDraft}
                    onChange={(e) => setRouteDraft(e.target.value)}
                    onBlur={saveRouteOnBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") {
                        routeCancelRef.current = true;
                        setEditingRoute(false);
                        setRouteDraft(currentRoute ?? "");
                      }
                    }}
                    placeholder={t.field_routePlaceholder}
                    autoFocus
                    disabled={savingField}
                    style={{
                      width: "100%", padding: "7px 10px",
                      border: "1px solid #d1d5db", borderRadius: 8,
                      fontSize: 14, color: "#111827", outline: "none",
                      boxSizing: "border-box", background: "white",
                      opacity: savingField ? 0.6 : 1,
                    }}
                  />
                  {savingField && (
                    <div style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #d1d5db", borderTopColor: "#0369a1", animation: "spin 0.7s linear infinite" }} />
                    </div>
                  )}
                </div>
              </div>
            ) : currentRoute ? (
              <button
                onClick={() => { setRouteDraft(currentRoute); setEditingRoute(true); }}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  textAlign: "left", marginBottom: 16, marginTop: 12,
                }}
              >
                <span style={{ fontSize: 14, color: "#6b7280" }}>
                  📍 {currentRoute}
                </span>
              </button>
            ) : (
              <button
                onClick={() => { setRouteDraft(""); setEditingRoute(true); }}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  marginBottom: 16, marginTop: 12,
                }}
              >
                <span style={{ fontSize: 13, color: "#d1d5db", fontStyle: "italic" }}>
                  📍 {t.field_routePlaceholder}
                </span>
              </button>
            )}
          </div>

          {/* ── MAP / WIKILOC ─────────────────────────────────────────── */}
          <section style={{ marginBottom: 28 }}>
            {currentWikiloc ? (
              /* ── Wikiloc replaces OSM map ── */
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                    {t.detail_routeWikiloc}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {wikilockOpenUrl && (
                      <a
                        href={wikilockOpenUrl}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, fontWeight: 600, color: "#4C8C2B", textDecoration: "none" }}
                      >
                        {t.detail_openWikiloc}
                      </a>
                    )}
                    <button
                      onClick={removeWikiloc}
                      title={t.delete}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 14, color: "#9ca3af", padding: "0 2px", lineHeight: 1,
                      }}
                    >✕</button>
                  </div>
                </div>
                <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                  <iframe
                    src={currentWikiloc}
                    width="600"
                    height="500"
                    scrolling="no"
                    style={{ border: "none", display: "block", width: "100%", height: 500 }}
                    title="Wikiloc route"
                    allowFullScreen
                  />
                </div>
              </>
            ) : (
              /* ── OSM map preview + add Wikiloc CTA ── */
              <>
                <a
                  href={osmLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "block", position: "relative" }}
                >
                  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${peakLongitude - 0.08},${peakLatitude - 0.05},${peakLongitude + 0.08},${peakLatitude + 0.05}&layer=mapnik&marker=${peakLatitude},${peakLongitude}`}
                      width="100%"
                      height="160"
                      style={{ border: "none", display: "block", pointerEvents: "none" }}
                      title="Peak location"
                    />
                    <div style={{
                      position: "absolute", bottom: 8, right: 8,
                      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)",
                      borderRadius: 20, padding: "3px 10px",
                      fontSize: 11, fontWeight: 600, color: "#374151",
                    }}>
                      {t.detail_viewOnMap} ↗
                    </div>
                  </div>
                </a>
                <div style={{ marginTop: 12 }}>
                {!showWikilockInput ? (
                  <button
                    onClick={() => setShowWikilockInput(true)}
                    style={{
                      width: "100%", padding: "10px 14px",
                      background: "none", border: "1px dashed #d1d5db",
                      borderRadius: 10, cursor: "pointer",
                      fontSize: 13, fontWeight: 600, color: "#6b7280",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://www.wikiloc.com/favicon.ico" alt="Wikiloc" width={18} height={18} style={{ flexShrink: 0, borderRadius: 3 }} />
                    <span>{t.detail_addWikiloc ?? "Afegir ruta Wikiloc"}</span>
                  </button>
                ) : (
                  <div style={{
                    border: "1px solid #e5e7eb", borderRadius: 10,
                    padding: "12px 14px", background: "#f9fafb",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <input
                      type="text"
                      value={wikilockDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Auto-extract src if user pastes full <iframe> HTML
                        const srcMatch = val.match(/src="([^"]+wikiloc[^"]+)"/);
                        setWikilockDraft(srcMatch ? srcMatch[1] : val);
                      }}
                      placeholder="URL o <iframe> de Wikiloc"
                      autoFocus
                      style={{
                        width: "100%", padding: "8px 10px",
                        border: "1px solid #d1d5db", borderRadius: 8,
                        fontSize: 13, color: "#111827", outline: "none",
                        boxSizing: "border-box", background: "white",
                      }}
                    />
                    <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                      Pega la URL o el código &lt;iframe&gt; de Wikiloc
                    </p>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => { setShowWikilockInput(false); setWikilockDraft(""); }}
                        style={{
                          padding: "7px 14px", borderRadius: 8,
                          border: "1px solid #e5e7eb", background: "white",
                          fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer",
                        }}
                      >
                        {t.cancel}
                      </button>
                      <button
                        onClick={saveWikiloc}
                        disabled={savingWikiloc || !wikilockDraft.trim()}
                        style={{
                          padding: "7px 14px", borderRadius: 8,
                          border: "none", background: "#111827",
                          fontSize: 13, fontWeight: 600, color: "white",
                          cursor: "pointer", opacity: savingWikiloc || !wikilockDraft.trim() ? 0.5 : 1,
                        }}
                      >
                        {savingWikiloc ? t.saving : t.save}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </>
            )}
          </section>

          {/* ── DELETE ────────────────────────────────────────────── */}
          <div style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid #f3f4f6",
          }}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: "100%", padding: "12px 16px",
                background: "#fff5f5",
                border: "1px solid #fecaca",
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 14, fontWeight: 600, color: "#ef4444",
                cursor: "pointer",
              }}
            >
              🗑 {t.delete}
            </button>
          </div>

        </div>
      </div>

      {/* ── Delete confirmation dialog ─────────────────────────────────── */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={() => setShowDeleteConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 520,
              background: "white", borderRadius: "20px 20px 0 0",
              padding: "28px 20px 40px",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ width: 32, height: 3, background: "#e5e7eb", borderRadius: 2, margin: "0 auto 24px" }} />
            <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 8px", textAlign: "center" }}>
              {t.ascents_delete_title}
            </p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 28px", textAlign: "center", lineHeight: 1.5 }}>
              {t.ascents_delete_body}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "13px", borderRadius: 12, border: "none",
                  background: "#ef4444", color: "white",
                  fontSize: 15, fontWeight: 700, cursor: "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? t.deleting : t.delete}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: "13px", borderRadius: 12,
                  border: "1px solid #e5e7eb", background: "white",
                  fontSize: 15, fontWeight: 600, color: "#374151", cursor: "pointer",
                }}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

// ── Date picker bottom sheet ──────────────────────────────────────────────────

function DatePickerSheet({
  value, locale, todayLabel, selectYearLabel, onSelect, onClose,
}: {
  value: string;        // "YYYY-MM-DD"
  locale: string;       // e.g. "ca-ES"
  todayLabel: string;
  selectYearLabel: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const [py, pm] = value.split("-").map(Number);
  const [viewYear, setViewYear] = useState(py);
  const [viewMonth, setViewMonth] = useState(pm - 1); // 0-indexed
  const [pickerView, setPickerView] = useState<"month" | "year">("month");

  // ── Swipe-down to close ───────────────────────────────────────────────────
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragY(delta);
  }
  function onTouchEnd() {
    isDragging.current = false;
    if (dragY > 60) { onClose(); }
    else { setDragY(0); }
  }

  const today = new Date();
  const todayVal = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mon = 0

  const rawMonthName = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, { month: "long" });
  const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);

  // Weekday headers starting Monday (Jan 1, 2024 = Monday)
  const weekHeaders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i);
    return d.toLocaleDateString(locale, { weekday: "narrow" });
  });

  const navPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const navNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const years = Array.from({ length: 80 }, (_, i) => 1950 + i);
  const yearGridRef = useRef<HTMLDivElement>(null);

  // Scroll selected year into view when opening year picker
  useEffect(() => {
    if (pickerView === "year" && yearGridRef.current) {
      const btn = yearGridRef.current.querySelector(`[data-year="${viewYear}"]`) as HTMLElement | null;
      btn?.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [pickerView]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.45)" }}
      />
      {/* Sheet */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed", bottom: 0, left: "50%",
          transform: `translateX(-50%) translateY(${dragY}px)`,
          transition: dragY === 0 ? "transform 0.2s ease" : "none",
          width: "100%", maxWidth: 520, zIndex: 151,
          background: "white", borderRadius: "16px 16px 0 0",
          padding: "6px 12px 20px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        }}
      >
        {/* Drag handle — visual affordance for swipe */}
        <div style={{ width: 32, height: 3, background: "#d1d5db", borderRadius: 2, margin: "0 auto 8px" }} />

        {pickerView === "year" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{selectYearLabel}</span>
              <button
                onClick={() => setPickerView("month")}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6b7280", padding: "0 4px", lineHeight: 1 }}
              >✕</button>
            </div>
            <div
              ref={yearGridRef}
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, maxHeight: 216, overflowY: "auto" }}
            >
              {years.map(y => {
                const isSel = y === viewYear;
                const isCur = y === today.getFullYear();
                return (
                  <button
                    key={y}
                    data-year={y}
                    onClick={() => { setViewYear(y); setPickerView("month"); }}
                    style={{
                      padding: "7px 4px", borderRadius: 8,
                      border: "none",
                      background: isSel ? "#111827" : isCur ? "#f3f4f6" : "transparent",
                      color: isSel ? "white" : "#374151",
                      fontSize: 13, fontWeight: isSel ? 700 : isCur ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >{y}</button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Month / year nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <button
                onClick={navPrev}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#374151", padding: "4px 8px", borderRadius: 6, lineHeight: 1 }}
              >‹</button>
              <button
                onClick={() => setPickerView("year")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 700, color: "#111827",
                  padding: "4px 8px", borderRadius: 6,
                }}
              >
                {monthName} {viewYear}
              </button>
              <button
                onClick={navNext}
                disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
                style={{
                  background: "none", border: "none", fontSize: 20, padding: "4px 8px", borderRadius: 6, lineHeight: 1,
                  color: viewYear === today.getFullYear() && viewMonth === today.getMonth() ? "#e5e7eb" : "#374151",
                  cursor: viewYear === today.getFullYear() && viewMonth === today.getMonth() ? "default" : "pointer",
                }}
              >›</button>
            </div>

            {/* Weekday headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
              {weekHeaders.map((h, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "#9ca3af", padding: "1px 0" }}>{h}</div>
              ))}
            </div>

            {/* Day grid — always 6 rows × 7 cols = 42 cells, fixed height */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {Array.from({ length: 42 }, (_, i) => {
                const d = i - firstDayOffset + 1;
                if (d < 1 || d > daysInMonth) {
                  return <div key={`x${i}`} style={{ height: 36 }} />;
                }
                const dayVal = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const isSel = dayVal === value;
                const isToday = dayVal === todayVal;
                const isFuture = dayVal > todayVal;
                return (
                  <button
                    key={d}
                    onClick={() => !isFuture && onSelect(dayVal)}
                    disabled={isFuture}
                    style={{
                      height: 36, width: "100%",
                      borderRadius: 8, border: "none",
                      background: isSel ? "#111827" : isToday ? "#f3f4f6" : "transparent",
                      color: isSel ? "white" : isFuture ? "#d1d5db" : isToday ? "#111827" : "#374151",
                      fontSize: 13, fontWeight: isSel || isToday ? 700 : 400,
                      cursor: isFuture ? "default" : "pointer",
                    }}
                  >{d}</button>
                );
              })}
            </div>

            {/* Today button */}
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => {
                  setViewYear(today.getFullYear());
                  setViewMonth(today.getMonth());
                  onSelect(todayVal);
                }}
                style={{
                  padding: "6px 20px", borderRadius: 16,
                  border: "1px solid #e5e7eb", background: "white",
                  fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer",
                }}
              >{todayLabel}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ToastNotification({ message }: { message: string }) {
  return (
    <div style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      zIndex: 200,
      background: "#111827", color: "white",
      borderRadius: 24, padding: "10px 20px",
      fontSize: 13, fontWeight: 600,
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      ✓ {message}
    </div>
  );
}

function StatChip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: "#f9fafb", border: "1px solid #e5e7eb",
      borderRadius: 20, padding: "5px 12px",
      fontSize: 12, fontWeight: 600, color: "#374151",
    }}>
      <span>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}

function HeroPlaceholder() {
  return (
    <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="hp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#3b6ea5" />
        </linearGradient>
        <linearGradient id="hp-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#64748b" /><stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="hp-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" /><stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect width="600" height="750" fill="url(#hp-sky)" />
      <polygon points="0,520 600,520 600,750 0,750" fill="#1e3a2f" opacity="0.8" />
      <polygon points="100,420 350,80 600,380 600,520 0,520" fill="url(#hp-rock)" />
      <polygon points="250,430 450,160 600,400 600,520 180,520" fill="#475569" opacity="0.55" />
      <polygon points="350,80 420,200 350,185 280,200" fill="url(#hp-snow)" />
      <circle cx="80" cy="100" r="14" fill="white" opacity="0.12" />
      <circle cx="140" cy="60" r="8" fill="white" opacity="0.1" />
      <circle cx="500" cy="80" r="10" fill="white" opacity="0.1" />
    </svg>
  );
}
