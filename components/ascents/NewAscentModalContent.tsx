"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ImageCropModal, resizeForStorage, type CropMeta } from "@/components/photos/ImageCropModal";
import { PeakPicker } from "@/components/ascents/PeakPicker";
import { useT } from "@/components/providers/I18nProvider";
import { i as fmt } from "@/lib/i18n";
import { extractImageMeta } from "@/lib/exif";
import { nearestPeak } from "@/lib/nearest-peak";
import { PickStep } from "@/components/ascents/PickStep";

type Peak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  latitude: number;
  longitude: number;
};

export type ModalHeaderConfig = {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  size?: "photo" | "split";
};

export type EditAscent = {
  id: string;
  peakId: string;
  peakName: string;
  date: string;
  route: string | null;
  description: string | null;
  wikiloc: string | null;
  photoUrl: string | null;
  photoId: string | null;
  originalStorageKey: string | null;
};

type Props = {
  onClose: () => void;
  onHeaderChange: (config: ModalHeaderConfig) => void;
  defaultPeakId?: string;
  defaultPeakName?: string;
  editAscent?: EditAscent;
};

type ModalStep = "pick" | "crop" | "form";
type Person = { id: string; name: string; username: string | null };

export function NewAscentModalContent({ onClose, onHeaderChange, defaultPeakId, defaultPeakName, editAscent }: Props) {
  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  const router = useRouter();
  const t = useT();
  const isEditMode = !!editAscent;

  const [peaks, setPeaks] = useState<Peak[]>([]);
  useEffect(() => {
    fetch("/api/peaks").then((r) => r.json()).then(setPeaks).catch(() => {});
  }, []);

  const [modalStep, setModalStep] = useState<ModalStep>(isEditMode ? "form" : "pick");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [cropApplying, setCropApplying] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState<string | null>(null);
  const [suggestedPeakId, setSuggestedPeakId] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
  const [personSearch, setPersonSearch] = useState("");
  const [personResults, setPersonResults] = useState<Person[]>([]);
  const personSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(editAscent?.photoUrl ?? null);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(editAscent?.photoId ?? null);
  const [editOrigKey, setEditOrigKey] = useState<string | null>(editAscent?.originalStorageKey ?? null);
  const isEditPhotoReplaceRef = useRef(false);

  const cropApplyRef = useRef<(() => void) | null>(null);

  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [readyItems, setReadyItems] = useState<
    { blob: Blob; cropMeta: CropMeta; originalFile: File; preview: string }[]
  >([]);

  useEffect(() => {
    return () => { readyItems.forEach((item) => URL.revokeObjectURL(item.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

  // ── Header management ────────────────────────────────────────────────────

  const goToPick = useCallback(() => {
    setCropQueue([]);
    setModalStep("pick");
  }, []);

  useEffect(() => {
    if (modalStep === "pick") {
      onHeaderChange({
        title: "Nueva ascensión",
        size: "photo",
        leftAction: (
          <button onClick={onClose} style={headerBtnStyle}>
            <CloseIcon />
          </button>
        ),
      });
    } else if (modalStep === "crop") {
      onHeaderChange({
        title: t.crop_title,
        size: "photo",
        leftAction: (
          <button onClick={goToPick} style={headerBtnStyle} aria-label="Atrás">
            <BackIcon />
          </button>
        ),
        rightAction: cropApplying ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: 14 }}>
            <Spinner />
          </span>
        ) : (
          <button
            onClick={() => cropApplyRef.current?.()}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#0369a1", fontSize: 15, fontWeight: 700, padding: "4px 0",
            }}
          >
            {t.crop_next}
          </button>
        ),
      });
    } else if (modalStep === "form") {
      onHeaderChange({
        title: isEditMode ? "Editar ascensión" : "Nueva ascensión",
        size: "split",
        leftAction: isEditMode ? (
          <button onClick={onClose} style={headerBtnStyle} aria-label="Cerrar">
            <CloseIcon />
          </button>
        ) : (
          <button onClick={() => setShowDiscardConfirm(true)} style={headerBtnStyle} aria-label="Atrás">
            <BackIcon />
          </button>
        ),
        rightAction: loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: 14 }}>
            <Spinner /> {status ?? "…"}
          </span>
        ) : (
          <button
            form="ascent-modal-form"
            type="submit"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#0369a1", fontSize: 15, fontWeight: 700, padding: "4px 0",
            }}
          >
            {t.newAscent_save}
          </button>
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalStep, loading, status, cropApplying, isEditMode]);

  // ── File handling ────────────────────────────────────────────────────────

  function handlePickFiles(files: FileList) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const oversized = arr.find((f) => f.size > MAX_PHOTO_BYTES);
    if (oversized) { setError(t.photo_tooLarge); return; }
    if (!arr.length) return;
    setError(null);
    setCropQueue(arr);
    setModalStep("crop");

    const first = arr[0];
    extractImageMeta(first).then(({ date, lat, lng }) => {
      if (date) setSuggestedDate(date);
      if (!defaultPeakId && lat !== null && lng !== null) {
        const found = nearestPeak(lat, lng, peaks);
        if (found) setSuggestedPeakId(found.id);
      }
    });
  }

  // Debounced person search for form step
  useEffect(() => {
    if (!personSearch.trim()) { setPersonResults([]); return; }
    if (personSearchTimer.current) clearTimeout(personSearchTimer.current);
    personSearchTimer.current = setTimeout(() => {
      fetch(`/api/persons?q=${encodeURIComponent(personSearch.trim())}`)
        .then((r) => r.json())
        .then((d) => setPersonResults(Array.isArray(d) ? d : []));
    }, 300);
    return () => { if (personSearchTimer.current) clearTimeout(personSearchTimer.current); };
  }, [personSearch]);

  function handleCropDone(blob: Blob, cropMeta: CropMeta) {
    const originalFile = cropQueue[0];
    const preview = URL.createObjectURL(blob);
    setCropQueue((q) => q.slice(1));
    if (isEditPhotoReplaceRef.current) {
      isEditPhotoReplaceRef.current = false;
      setPendingPhoto({ blob, preview });
      setEditPhotoUrl(preview);
      setCropApplying(false);
      setModalStep("form");
      return;
    }
    setReadyItems((prev) => [...prev, { blob, cropMeta, originalFile, preview }]);
    setCropApplying(false);
    if (cropQueue.length > 1) {
      // more files queued — stay in crop for next one (queue already sliced above)
    } else {
      setModalStep("form");
    }
  }

  function handleCropCancel() { goToPick(); }

  async function handleEditPhotoClick() {
    if (editOrigKey && editPhotoId) {
      // Fetch resized original for re-crop
      try {
        const res = await fetch(`/api/photos/${editPhotoId}/original`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], "original.jpg", { type: "image/jpeg" });
          isEditPhotoReplaceRef.current = true;
          setCropQueue([file]);
          setModalStep("crop");
          return;
        }
      } catch { /* fall through to file picker */ }
    }
    // No original or fetch failed — open file picker
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      isEditPhotoReplaceRef.current = true;
      setCropQueue([f]);
      setModalStep("crop");
    };
    input.click();
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editAscent) return;
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    if (!form.get("peakId")) {
      setError(t.field_peak);
      setLoading(false);
      return;
    }

    // Photo is required — either the existing photo is kept or a new one is pending
    if (!editPhotoUrl && !editPhotoId && !pendingPhoto) {
      setError(t.field_photos);
      setLoading(false);
      return;
    }

    setStatus(t.newAscent_savingAscent);
    const patchRes = await fetch(`/api/ascents/${editAscent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peakId: form.get("peakId"),
        date: form.get("date"),
        route: form.get("route") || null,
        description: form.get("description") || null,
        wikiloc: form.get("wikiloc") || null,
      }),
    });

    if (!patchRes.ok) {
      const data = await patchRes.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Error al guardar");
      setLoading(false);
      setStatus(null);
      return;
    }

    if (pendingPhoto) {
      setStatus(fmt(t.newAscent_uploadingPhoto, { i: 1, n: 1 }));
      const fd = new FormData();
      fd.append("file", pendingPhoto.blob, "photo.jpg");
      fd.append("ascentId", editAscent.id);
      if (editOrigKey) {
        fd.append("reuseOriginalPhotoId", editPhotoId ?? "");
      } else {
        const cropMeta: CropMeta = { x: 0, y: 0, w: 1, h: 1, aspect: "4:5", rotation: 0 };
        fd.append("cropMeta", JSON.stringify(cropMeta));
      }
      const photoRes = await fetch("/api/photos/upload", { method: "POST", body: fd });
      if (photoRes.ok && selectedPersons.length > 0) {
        const photo = await photoRes.json();
        setStatus(fmt(t.newAscent_savingTags, { i: 1 }));
        await fetch(`/api/photos/${photo.id}/faces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faces: selectedPersons.map((p) => ({
              boundingBox: { x: 0, y: 0, width: 1, height: 1 },
              descriptor: [],
              userId: p.id,
            })),
          }),
        });
      }
      // Delete old photo
      if (editPhotoId && !editOrigKey) {
        await fetch(`/api/photos/${editPhotoId}`, { method: "DELETE" }).catch(() => {});
      } else if (editAscent.photoId && editAscent.photoId !== editPhotoId) {
        await fetch(`/api/photos/${editAscent.photoId}?keepOriginal=1`, { method: "DELETE" }).catch(() => {});
      }
    }

    setLoading(false);
    setStatus(null);
    router.refresh();
    onClose();
  }

  async function handleDelete() {
    if (!editAscent) return;
    setLoading(true);
    await fetch(`/api/ascents/${editAscent.id}`, { method: "DELETE" });
    window.location.href = "/ascents";
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);

    if (!form.get("peakId")) {
      setError(t.field_peak);
      setLoading(false);
      return;
    }

    // Step 1 — create ascent
    setStatus(t.newAscent_savingAscent);
    const ascentRes = await fetch("/api/ascents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peakId: form.get("peakId"),
        date: form.get("date"),
        route: form.get("route") || undefined,
        description: form.get("description") || undefined,
        photoCount: readyItems.length,
      }),
    });

    if (!ascentRes.ok) {
      const data = await ascentRes.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to save ascent");
      setLoading(false);
      setStatus(null);
      return;
    }

    const ascent = await ascentRes.json();

    // Step 2 — upload photos + face tags
    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      setStatus(fmt(t.newAscent_uploadingPhoto, { i: i + 1, n: readyItems.length }));
      const fd = new FormData();
      fd.append("file", item.blob, "photo.jpg");
      fd.append("ascentId", ascent.id);
      const originalBlob = await resizeForStorage(item.originalFile);
      fd.append("originalFile", originalBlob, "original.jpg");
      fd.append("cropMeta", JSON.stringify(item.cropMeta));
      const photoRes = await fetch("/api/photos/upload", { method: "POST", body: fd });
      if (!photoRes.ok) {
        setError(fmt(t.newAscent_photoFailed, { i: i + 1 }));
        setLoading(false);
        setStatus(null);
        router.refresh(); onClose(); return;
        return;
      }
      if (selectedPersons.length > 0) {
        const photo = await photoRes.json();
        setStatus(fmt(t.newAscent_savingTags, { i: i + 1 }));
        await fetch(`/api/photos/${photo.id}/faces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faces: selectedPersons.map((p) => ({
              boundingBox: { x: 0, y: 0, width: 1, height: 1 },
              descriptor: [],
              userId: p.id,
            })),
          }),
        });
      }
    }

    window.location.href = `/ascents?highlight=${ascent.id}`;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (modalStep === "pick") {
    return <PickStep onFiles={handlePickFiles} error={error} />;
  }

  if (modalStep === "crop" && cropQueue.length > 0) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}>
        <ImageCropModal
          file={cropQueue[0]}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
          embedded
          applyRef={cropApplyRef}
          onApplyingChange={setCropApplying}
        />
      </div>
    );
  }

  if (modalStep === "form") {
    const preview = isEditMode ? (editPhotoUrl ?? null) : (readyItems[0]?.preview ?? null);
    return (
      <>
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        {/* Left: photo preview */}
        {!isMobile && (
          <div style={{
            flex: "0 0 500px", minWidth: 0, minHeight: 0,
            background: "#111", display: "flex", alignItems: "center", justifyContent: "center",
            borderRight: "1px solid #e5e7eb", overflow: "hidden",
            position: "relative",
          }}>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
            {isEditMode && (
              <button
                type="button"
                onClick={handleEditPhotoClick}
                style={{
                  position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                  background: "rgba(0,0,0,0.6)", color: "white", border: "none",
                  borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", backdropFilter: "blur(4px)",
                }}
              >
                ✏️ Editar foto
              </button>
            )}
          </div>
        )}

        {/* Right: form */}
        <div style={{
          flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px" : "24px",
          display: "flex", flexDirection: "column", gap: 0,
        }}>
          {/* Photo thumbnail on mobile */}
          {isMobile && preview && (
            <div style={{ marginBottom: 20, position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10, display: "block" }}
              />
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleEditPhotoClick}
                  style={{
                    position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.6)", color: "white", border: "none",
                    borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✏️ Editar foto
                </button>
              )}
            </div>
          )}

          <form
            id="ascent-modal-form"
            onSubmit={isEditMode ? handleEditSubmit : handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            {/* Peak */}
            <div>
              <label style={labelStyle}>{t.field_peak} *</label>
              <PeakPicker
                peaks={peaks}
                defaultPeakId={isEditMode ? editAscent!.peakId : (defaultPeakId ?? suggestedPeakId ?? undefined)}
                defaultPeakName={isEditMode ? editAscent!.peakName : (defaultPeakName ?? undefined)}
                name="peakId"
                placeholder={t.field_selectPeak}
                suggested={!isEditMode && !defaultPeakId && !!suggestedPeakId}
              />
            </div>

            {/* Date */}
            <div>
              <label htmlFor="modal-date" style={labelStyle}>{t.field_date} *</label>
              <input
                id="modal-date" name="date" type="date" required
                defaultValue={isEditMode ? editAscent!.date : (suggestedDate ?? new Date().toISOString().split("T")[0])}
                style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
              />
            </div>

            {/* Route */}
            <div>
              <label htmlFor="modal-route" style={labelStyle}>
                {t.field_route} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
              </label>
              <input
                id="modal-route" name="route" type="text"
                defaultValue={isEditMode ? (editAscent!.route ?? "") : undefined}
                placeholder={t.field_routePlaceholder}
                maxLength={500} style={inputStyle}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="modal-description" style={labelStyle}>
                {t.field_notes} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
              </label>
              <textarea
                id="modal-description" name="description" rows={3}
                defaultValue={isEditMode ? (editAscent!.description ?? "") : undefined}
                placeholder={t.field_notesPlaceholder}
                maxLength={2000}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Personas */}
            {!isEditMode && (
              <div>
                <label style={labelStyle}>
                  {t.tag_tagPeople} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
                </label>
                {/* Selected chips */}
                {selectedPersons.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {selectedPersons.map((p) => (
                      <span key={p.id} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "#eff6ff", border: "1px solid #bfdbfe",
                        borderRadius: 20, padding: "4px 10px",
                        fontSize: 13, fontWeight: 600, color: "#0369a1",
                      }}>
                        {p.name}
                        <button
                          type="button"
                          onClick={() => setSelectedPersons((prev) => prev.filter((x) => x.id !== p.id))}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, color: "#93c5fd", lineHeight: 1 }}
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  placeholder={t.tag_searchOrType}
                  style={{ ...inputStyle, fontSize: 15 }}
                />
                {personResults.length > 0 && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginTop: 4 }}>
                    {personResults
                      .filter((u) => !selectedPersons.some((s) => s.id === u.id))
                      .slice(0, 5)
                      .map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedPersons((prev) => [...prev, user]);
                            setPersonSearch("");
                            setPersonResults([]);
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            width: "100%", padding: "10px 12px",
                            background: "none", border: "none", borderBottom: "1px solid #f3f4f6",
                            cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            background: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, color: "#1d4ed8",
                          }}>{user.name[0]?.toUpperCase()}</div>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>{user.name}</p>
                            {user.username && <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>@{user.username}</p>}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Wikiloc (edit mode only) */}
            {isEditMode && (
              <div>
                <label htmlFor="modal-wikiloc" style={labelStyle}>
                  Wikiloc <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
                </label>
                <input
                  id="modal-wikiloc" name="wikiloc" type="url"
                  defaultValue={editAscent!.wikiloc ?? ""}
                  placeholder="https://www.wikiloc.com/…"
                  style={inputStyle}
                />
              </div>
            )}

            {error && (
              <p style={{
                fontSize: 13, color: "#dc2626",
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 8, padding: "8px 12px", margin: 0,
              }}>
                {error}
              </p>
            )}

            {/* Delete button (edit mode only) */}
            {isEditMode && (
              <div style={{ marginTop: 12, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    width: "100%", padding: "12px",
                    background: "none", border: "1px solid #fecaca",
                    borderRadius: 8, fontSize: 14, fontWeight: 600,
                    color: "#dc2626", cursor: "pointer",
                  }}
                >
                  🗑 Eliminar ascensión
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Discard confirmation dialog (create mode only) */}
      {showDiscardConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 32px",
        }}>
          <div style={{
            background: "white", borderRadius: 16,
            width: "100%", maxWidth: 320,
            overflow: "hidden",
            animation: "aModalFadeIn 0.15s ease",
          }}>
            <div style={{ padding: "24px 20px 20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#111827" }}>
                {t.newAscent_discardTitle}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
                {t.newAscent_discardMessage}
              </p>
            </div>
            <div style={{ borderTop: "1px solid #f3f4f6" }}>
              <button
                onClick={onClose}
                style={{
                  width: "100%", padding: "16px",
                  background: "none", border: "none",
                  borderBottom: "1px solid #f3f4f6",
                  fontSize: 16, fontWeight: 600, color: "#ef4444",
                  cursor: "pointer",
                }}
              >
                {t.newAscent_discard}
              </button>
              <button
                onClick={() => setShowDiscardConfirm(false)}
                style={{
                  width: "100%", padding: "16px",
                  background: "none", border: "none",
                  fontSize: 16, fontWeight: 400, color: "#111827",
                  cursor: "pointer",
                }}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation sheet (edit mode only) */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: "white", borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: 520,
            paddingBottom: "env(safe-area-inset-bottom)",
            animation: "aModalSlideUp 0.25s cubic-bezier(0.32,0.72,0,1)",
          }}>
            <div style={{ padding: "24px 20px 8px", textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#111827" }}>
                Eliminar ascensión
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{
                  width: "100%", padding: "14px",
                  background: "#dc2626", border: "none",
                  borderRadius: 12, fontSize: 16, fontWeight: 600,
                  color: "white", cursor: "pointer",
                }}
              >
                {loading ? "Eliminando…" : "Eliminar"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  width: "100%", padding: "14px",
                  background: "none", border: "1px solid #e5e7eb",
                  borderRadius: 12, fontSize: 16, fontWeight: 400,
                  color: "#111827", cursor: "pointer",
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

  return null;
}

// ── Shared sub-components ────────────────────────────────────────────────────

function RightPanelPlaceholder() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db", fontSize: 13 }}>
      Datos de la ascensión
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const headerBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  padding: 4, color: "#111827", display: "flex", alignItems: "center",
  borderRadius: 6,
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600,
  color: "#374151", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid #d1d5db", borderRadius: 8,
  fontSize: 16, color: "#111827",
  outline: "none", boxSizing: "border-box",
};

// ── Icons ────────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: "50%",
      border: "2px solid #e5e7eb", borderTopColor: "#0369a1",
      animation: "spin 0.7s linear infinite", display: "inline-block",
      flexShrink: 0,
    }} />
  );
}
