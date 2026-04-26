"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ImageCropModal, resizeForStorage, type CropMeta } from "@/components/photos/ImageCropModal";
import { PhotoTagStep, type FaceDraft } from "@/components/photos/PhotoTagStep";
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
  editAscent?: EditAscent;
};

type ModalStep = "pick" | "crop" | "tag" | "form";

export function NewAscentModalContent({ onClose, onHeaderChange, defaultPeakId, editAscent }: Props) {
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
  const [pendingPhoto, setPendingPhoto] = useState<{ blob: Blob; faces: FaceDraft[]; preview: string } | null>(null);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(editAscent?.photoUrl ?? null);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(editAscent?.photoId ?? null);
  const [editOrigKey, setEditOrigKey] = useState<string | null>(editAscent?.originalStorageKey ?? null);
  const isEditPhotoReplaceRef = useRef(false);

  const cropApplyRef = useRef<(() => void) | null>(null);
  const tagDoneRef = useRef<(() => void) | null>(null);
  const tagSkipRef = useRef<(() => void) | null>(null);
  const tagToggleDrawRef = useRef<(() => void) | null>(null);
  const tagFaceRef = useRef<((faceId: string, userId: string, label: string) => void) | null>(null);
  const clearActiveFaceRef = useRef<(() => void) | null>(null);
  const confirmSuggestionRef = useRef<((faceId: string) => void) | null>(null);
  const removeTagRef = useRef<((faceId: string) => void) | null>(null);
  const [tagState, setTagState] = useState<{
    faces: FaceDraft[]; phase: "detecting" | "ready"; drawMode: boolean;
    activeFaceId: string | null; activeFace: FaceDraft | null;
  }>({ faces: [], phase: "detecting", drawMode: false, activeFaceId: null, activeFace: null });
  const [tagSearch, setTagSearch] = useState("");
  const [tagPersons, setTagPersons] = useState<{ id: string; name: string; username: string | null }[]>([]);
  const tagSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagQueueCounter = useRef(0);

  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [tagQueue, setTagQueue] = useState<
    { id: number; blob: Blob; cropMeta: CropMeta; originalFile: File; previewUrl: string }[]
  >([]);
  const [pendingTransition, setPendingTransition] = useState<{
    blob: Blob; cropMeta: CropMeta; originalFile: File; previewUrl: string;
  } | null>(null);
  const [readyItems, setReadyItems] = useState<
    { blob: Blob; cropMeta: CropMeta; originalFile: File; faces: FaceDraft[]; preview: string }[]
  >([]);

  useEffect(() => {
    return () => { readyItems.forEach((item) => URL.revokeObjectURL(item.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

  // ── Header management ────────────────────────────────────────────────────

  const goToPick = useCallback(() => {
    setCropQueue([]);
    setTagQueue([]);
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
    } else if (modalStep === "tag") {
      onHeaderChange({
        title: t.tag_tagPeople,
        size: "split",
        leftAction: (
          <button onClick={() => tagSkipRef.current?.()} style={{ ...headerBtnStyle, color: "#6b7280", fontSize: 14, fontWeight: 500 }}>
            {t.skip}
          </button>
        ),
        rightAction: (
          <button
            onClick={() => tagDoneRef.current?.()}
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

  // Reset search when active face changes
  useEffect(() => {
    setTagSearch("");
    setTagPersons([]);
  }, [tagState.activeFaceId]);

  // Debounced person search
  useEffect(() => {
    if (!tagSearch.trim()) { setTagPersons([]); return; }
    if (tagSearchTimer.current) clearTimeout(tagSearchTimer.current);
    tagSearchTimer.current = setTimeout(() => {
      fetch(`/api/persons?q=${encodeURIComponent(tagSearch.trim())}`)
        .then((r) => r.json())
        .then((d) => setTagPersons(Array.isArray(d) ? d : []));
    }, 300);
    return () => { if (tagSearchTimer.current) clearTimeout(tagSearchTimer.current); };
  }, [tagSearch]);

  // Warm up face-api models while user is in crop step
  useEffect(() => {
    if (modalStep === "crop") {
      import("@/components/photos/faceApiSingleton").then(({ getFaceApi }) => getFaceApi()).catch(() => {});
    }
  }, [modalStep]);

  function handleCropDone(blob: Blob, cropMeta: CropMeta) {
    const originalFile = cropQueue[0];
    const previewUrl = URL.createObjectURL(blob);
    // Show preview overlay on the crop step first, then switch after 2 frames
    setPendingTransition({ blob, cropMeta, originalFile, previewUrl });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setCropQueue((q) => q.slice(1));
      setTagQueue((q) => [...q, { id: ++tagQueueCounter.current, blob, cropMeta, originalFile, previewUrl }]);
      setPendingTransition(null);
      setCropApplying(false);
      setModalStep("tag");
    }));
  }

  function handleCropCancel() { goToPick(); }

  function handleTagDone(blob: Blob, faces: FaceDraft[]) {
    const current = tagQueue[0];
    const preview = current.previewUrl;
    if (isEditPhotoReplaceRef.current) {
      // Edit mode photo replacement — hold as pending, return to form
      isEditPhotoReplaceRef.current = false;
      setPendingPhoto({ blob, faces, preview });
      setEditPhotoUrl(preview);
      setTagQueue((q) => q.slice(1));
      setModalStep("form");
      return;
    }
    setReadyItems((prev) => [...prev, {
      blob, cropMeta: current.cropMeta,
      originalFile: current.originalFile, faces, preview,
    }]);
    setTagQueue((q) => q.slice(1));
    if (cropQueue.length > 0) setModalStep("crop");
    else setModalStep("form");
  }
  function handleTagSkip(blob: Blob) { handleTagDone(blob, []); }

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
          setTagQueue([]);
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
      setTagQueue([]);
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
      if (photoRes.ok && pendingPhoto.faces.length > 0) {
        const photo = await photoRes.json();
        setStatus(fmt(t.newAscent_savingTags, { i: 1 }));
        await fetch(`/api/photos/${photo.id}/faces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faces: pendingPhoto.faces.map((f) => ({
              boundingBox: f.boundingBox,
              descriptor: f.descriptor,
              userId: f.userId ?? null,
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
      if (item.faces.length > 0) {
        const photo = await photoRes.json();
        setStatus(fmt(t.newAscent_savingTags, { i: i + 1 }));
        await fetch(`/api/photos/${photo.id}/faces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faces: item.faces.map((f) => ({
              boundingBox: f.boundingBox,
              descriptor: f.descriptor,
              userId: f.userId ?? null,
            })),
          }),
        });
      }
    }

    window.location.href = `/ascents/${ascent.id}`;
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
        {/* Preview overlay — painted before we switch to tag step, eliminates blank frame */}
        {pendingTransition && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pendingTransition.previewUrl}
            alt=""
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "contain", background: "white", zIndex: 10,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    );
  }

  if (modalStep === "tag" && tagQueue.length > 0) {
    const { faces, phase, drawMode } = tagState;
    const taggedCount = faces.filter((f) => f.userId || f.suggestionUserId).length;
    return (
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        {/* Left panel — fixed 500px, foto + overlays, sin controles */}
        <div style={{
          flex: isMobile ? "1" : "0 0 500px",
          minWidth: 0, minHeight: 0,
          position: "relative",
          display: "flex", flexDirection: "column",
          borderRight: isMobile ? "none" : "1px solid #e5e7eb",
        }}>
          {/* Background preview — visible immediately, no blank during mount */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tagQueue[0].previewUrl}
            alt=""
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "contain", background: "#f3f4f6", zIndex: 0,
              pointerEvents: "none",
            }}
          />
          {/* Mobile: add person button — floating over the photo */}
          {isMobile && tagState.phase === "ready" && (
            <button
              onClick={() => tagToggleDrawRef.current?.()}
              style={{
                position: "absolute", bottom: 14, left: "50%",
                transform: "translateX(-50%)",
                zIndex: 5,
                background: tagState.drawMode ? "rgba(14,165,233,0.85)" : "rgba(0,0,0,0.52)",
                color: "white", border: "none",
                borderRadius: 24, padding: "10px 22px",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap",
                backdropFilter: "blur(4px)",
              }}
            >
              {tagState.drawMode ? `✕ ${t.tag_cancelDraw}` : `+ ${t.tag_addManual}`}
            </button>
          )}

          {/* PhotoTagStep renders on top — covers the preview once its image is painted */}
          <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex" }}>
          <PhotoTagStep
            key={tagQueue[0].id}
            blob={tagQueue[0].blob}
            initialSrc={tagQueue[0].previewUrl}
            onDone={handleTagDone}
            onSkip={handleTagSkip}
            embedded
            doneRef={tagDoneRef}
            skipRef={tagSkipRef}
            toggleDrawModeRef={tagToggleDrawRef}
            tagFaceRef={tagFaceRef}
            clearActiveFaceRef={clearActiveFaceRef}
            confirmSuggestionRef={confirmSuggestionRef}
            removeTagRef={removeTagRef}
            onStateChange={setTagState}
          />
          </div>
        </div>
        {/* Right panel */}
        {!isMobile && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {/* Default: status + add person */}
            {!tagState.activeFace && (
              <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                {phase === "ready" && (
                  <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                    {faces.length === 0 ? t.tag_noFaces
                      : `${faces.length} cara${faces.length > 1 ? "s" : ""} detectada${faces.length > 1 ? "s" : ""}${taggedCount > 0 ? ` · ${taggedCount} etiquetada${taggedCount > 1 ? "s" : ""}` : ""}`}
                  </p>
                )}
                {drawMode && (
                  <p style={{ margin: 0, fontSize: 13, color: "#0369a1", background: "#eff6ff", borderRadius: 8, padding: "8px 12px" }}>
                    {t.tag_drawHint}
                  </p>
                )}
                {phase === "ready" && (
                  <button
                    onClick={() => tagToggleDrawRef.current?.()}
                    style={{
                      width: "100%", padding: "12px",
                      background: drawMode ? "#eff6ff" : "#f9fafb",
                      border: drawMode ? "1.5px solid #bfdbfe" : "1.5px solid #e5e7eb",
                      borderRadius: 12, fontSize: 14, fontWeight: 600,
                      color: drawMode ? "#0369a1" : "#374151",
                      cursor: "pointer", transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{drawMode ? "✕" : "+"}</span>
                    {drawMode ? t.tag_cancelDraw : t.tag_addManual}
                  </button>
                )}
              </div>
            )}

            {/* "Qui és?" — shown when a face ring is tapped */}
            {tagState.activeFace && (() => {
              const af = tagState.activeFace!;
              // userIds already tagged in OTHER faces (not the current one)
              const usedUserIds = new Set(
                tagState.faces
                  .filter((f) => f.tempId !== af.tempId && f.userId)
                  .map((f) => f.userId!)
              );
              return (
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>{t.tag_whoIsThis}</p>

                  {af.suggestion && !af.userId && (
                    <button
                      onClick={() => confirmSuggestionRef.current?.(af.tempId)}
                      style={{
                        width: "100%", padding: "12px 16px",
                        background: "#eff6ff", border: "1.5px solid #bfdbfe",
                        borderRadius: 12, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 11, color: "#0369a1", margin: "0 0 1px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t.tag_looksLike}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#0369a1", margin: 0 }}>{af.suggestion}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "white", background: "#0369a1", borderRadius: 20, padding: "5px 14px", flexShrink: 0 }}>{t.tag_confirmCta}</span>
                    </button>
                  )}

                  <input
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagPersons.length === 1)
                        tagFaceRef.current?.(af.tempId, tagPersons[0].id, tagPersons[0].username ?? tagPersons[0].name);
                    }}
                    placeholder={t.tag_searchOrType}
                    autoFocus
                    style={{
                      width: "100%", padding: "10px 14px",
                      border: "1.5px solid #e5e7eb", borderRadius: 10,
                      fontSize: 15, outline: "none", background: "#f9fafb",
                      boxSizing: "border-box" as const,
                    }}
                  />

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {tagPersons.filter((u) => !usedUserIds.has(u.id)).slice(0, 5).map((user) => {
                      const label = user.username ?? user.name;
                      return (
                        <div
                          key={user.id}
                          onClick={() => tagFaceRef.current?.(af.tempId, user.id, label)}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "10px 4px", cursor: "pointer", borderRadius: 8,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, fontWeight: 700, color: "#1d4ed8", flexShrink: 0,
                          }}>{user.name[0]?.toUpperCase()}</div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{user.name}</p>
                            {user.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{user.username}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {af.userId && (
                      <button
                        onClick={() => removeTagRef.current?.(af.tempId)}
                        style={{ width: "100%", padding: "10px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}
                      >{t.tag_removeTag}</button>
                    )}
                    <button
                      onClick={() => clearActiveFaceRef.current?.()}
                      style={{ width: "100%", padding: "10px", background: "none", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#6b7280", cursor: "pointer" }}
                    >{t.cancel}</button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Mobile: "Qui és?" bottom sheet — shown when a face is tapped */}
        {isMobile && tagState.activeFace && (() => {
          const af = tagState.activeFace!;
          const usedUserIds = new Set(
            tagState.faces
              .filter((f) => f.tempId !== af.tempId && f.userId)
              .map((f) => f.userId!)
          );
          return (
            <>
              {/* Backdrop */}
              <div
                onClick={() => clearActiveFaceRef.current?.()}
                style={{
                  position: "fixed", inset: 0, zIndex: 15,
                  background: "rgba(0,0,0,0.4)",
                }}
              />
              {/* Sheet */}
              <div style={{
                position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 16,
                background: "white", borderRadius: "20px 20px 0 0",
                paddingBottom: "env(safe-area-inset-bottom)",
                maxHeight: "65svh", display: "flex", flexDirection: "column",
                animation: "aModalSlideUp 0.28s cubic-bezier(0.32,0.72,0,1)",
              }}>
                <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0" }} />
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>{t.tag_whoIsThis}</p>
                </div>
                <div style={{ overflowY: "auto", flex: 1, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {af.suggestion && !af.userId && (
                    <button
                      onClick={() => confirmSuggestionRef.current?.(af.tempId)}
                      style={{ width: "100%", padding: "12px 16px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}
                    >
                      <div>
                        <p style={{ fontSize: 11, color: "#0369a1", margin: "0 0 1px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t.tag_looksLike}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#0369a1", margin: 0 }}>{af.suggestion}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "white", background: "#0369a1", borderRadius: 20, padding: "5px 14px" }}>{t.tag_confirmCta}</span>
                    </button>
                  )}
                  <input
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagPersons.length === 1)
                        tagFaceRef.current?.(af.tempId, tagPersons[0].id, tagPersons[0].username ?? tagPersons[0].name);
                    }}
                    placeholder={t.tag_searchOrType}
                    autoFocus
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 16, outline: "none", background: "#f9fafb", boxSizing: "border-box" as const }}
                  />
                  {tagPersons.filter((u) => !usedUserIds.has(u.id)).slice(0, 5).map((user) => {
                    const label = user.username ?? user.name;
                    return (
                      <div key={user.id} onClick={() => tagFaceRef.current?.(af.tempId, user.id, label)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "pointer" }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#dbeafe,#bfdbfe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#1d4ed8", flexShrink: 0 }}>
                          {user.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{user.name}</p>
                          {user.username && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>@{user.username}</p>}
                        </div>
                      </div>
                    );
                  })}
                  {af.userId && (
                    <button onClick={() => removeTagRef.current?.(af.tempId)}
                      style={{ width: "100%", padding: "12px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>
                      {t.tag_removeTag}
                    </button>
                  )}
                  <button onClick={() => clearActiveFaceRef.current?.()}
                    style={{ width: "100%", padding: "12px", background: "none", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#6b7280", cursor: "pointer" }}>
                    {t.cancel}
                  </button>
                </div>
              </div>
            </>
          );
        })()}
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
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
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
