"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImageCropModal, resizeForStorage, type CropMeta } from "@/components/photos/ImageCropModal";
import { PhotoTagStep, type FaceDraft } from "@/components/photos/PhotoTagStep";
import { PeakPicker } from "@/components/ascents/PeakPicker";
import { useT } from "@/components/providers/I18nProvider";
import { i as fmt } from "@/lib/i18n";
import { extractImageMeta } from "@/lib/exif";
import { nearestPeak } from "@/lib/nearest-peak";

type Peak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  latitude: number;
  longitude: number;
};

export function NewAscentForm({
  peaks,
  defaultPeakId,
  existingAscents = [],
}: {
  peaks: Peak[];
  defaultPeakId?: string;
  existingAscents?: { peakId: string; date: string }[];
}) {
  const router = useRouter();
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  // "pick" = photo-first entry, "form" = show the form
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState<string | null>(null);
  const [suggestedPeakId, setSuggestedPeakId] = useState<string | null>(null);

  // Step 1: crop queue (raw files)
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  // Step 2: tag queue (cropped blobs + metadata waiting for face tagging)
  const [tagQueue, setTagQueue] = useState<{ blob: Blob; cropMeta: CropMeta; originalFile: File }[]>([]);
  // Step 3: ready items (tagged, ready to upload on submit)
  const [readyItems, setReadyItems] = useState<{ blob: Blob; cropMeta: CropMeta; originalFile: File; faces: FaceDraft[]; preview: string }[]>([]);

  useEffect(() => {
    return () => { readyItems.forEach((item) => URL.revokeObjectURL(item.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function queueFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length) setCropQueue((prev) => [...prev, ...arr]);
  }

  // Called from the pick step only — queues files AND extracts EXIF from the first image
  function handlePickFiles(files: FileList | File[]) {
    queueFiles(files);
    const first = Array.from(files).find((f) => f.type.startsWith("image/"));
    if (!first) return;
    extractImageMeta(first).then(({ date, lat, lng }) => {
      if (date) setSuggestedDate(date);
      // Don't suggest a peak from GPS if one is already pre-selected (e.g. coming from the map)
      if (!defaultPeakId && lat !== null && lng !== null) {
        const found = nearestPeak(lat, lng, peaks);
        if (found) setSuggestedPeakId(found.id);
      }
    });
  }

  // Crop → tag step
  function handleCropDone(blob: Blob, cropMeta: CropMeta) {
    const originalFile = cropQueue[0];
    setCropQueue((q) => q.slice(1));
    setTagQueue((q) => [...q, { blob, cropMeta, originalFile }]);
  }
  function handleCropCancel() {
    setCropQueue((q) => q.slice(1));
  }

  // Tag step → ready
  function handleTagDone(blob: Blob, faces: FaceDraft[]) {
    const current = tagQueue[0];
    const preview = URL.createObjectURL(blob);
    setReadyItems((prev) => [...prev, { blob, cropMeta: current.cropMeta, originalFile: current.originalFile, faces, preview }]);
    setTagQueue((q) => q.slice(1));
    setStep("form");
  }
  function handleTagSkip(blob: Blob) {
    handleTagDone(blob, []);
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(readyItems[index].preview);
    setReadyItems((prev) => prev.filter((_, i) => i !== index));
  }

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

    // Duplicate check: same user, same peak, same day
    const peakId = form.get("peakId") as string;
    const date = form.get("date") as string;
    if (existingAscents.some((a) => a.peakId === peakId && a.date === date)) {
      setError(t.newAscent_duplicate);
      setLoading(false);
      return;
    }

    if (readyItems.length === 0) {
      setError(t.field_photos);
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
      const data = await ascentRes.json();
      setError(typeof data.error === "string" ? data.error : "Failed to save ascent");
      setLoading(false);
      setStatus(null);
      return;
    }

    const ascent = await ascentRes.json();

    // Step 2 — upload photos + save face tags
    if (readyItems.length > 0) {
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
          router.push(`/ascents/${ascent.id}`);
          router.refresh();
          return;
        }
        // Save face detections + tags in one shot
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
                personName: f.personName ?? null,
              })),
            }),
          });
        }
      }
    }

    router.push(`/ascents/${ascent.id}`);
    router.refresh();
  }

  const inputStyle = {
    width: "100%", padding: "8px 12px",
    border: "1px solid #d1d5db", borderRadius: 8,
    fontSize: 14, color: "#111827",
    outline: "none", boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#374151", marginBottom: 6,
  };

  return (
    <>
      {/* Crop modal — overlays on top of whichever step is active */}
      {cropQueue.length > 0 && (
        <ImageCropModal
          file={cropQueue[0]}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      {/* Tag step — overlays on top of whichever step is active */}
      {cropQueue.length === 0 && tagQueue.length > 0 && (
        <PhotoTagStep
          blob={tagQueue[0].blob}
          onDone={handleTagDone}
          onSkip={handleTagSkip}
        />
      )}

      {/* Pick step — photo-first entry point */}
      {step === "pick" && (
        <div style={{
          background: "white", border: "1px solid #e5e7eb",
          borderRadius: 12, padding: 32,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 40, margin: "0 0 8px" }}>📷</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
              {t.newAscent_pickTitle}
            </p>
          </div>

          {/* Drop zone */}
          <div
            style={{ width: "100%" }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handlePickFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
          >
            <div style={{
              border: `2px dashed ${dragging ? "#0369a1" : "#d1d5db"}`,
              borderRadius: 10, padding: "28px 16px",
              textAlign: "center", cursor: "pointer",
              background: dragging ? "#eff6ff" : "#f9fafb",
              transition: "all 0.15s",
            }}>
              <input
                ref={inputRef} type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.length) handlePickFiles(e.target.files); e.target.value = ""; }}
              />
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>
                {t.newAscent_clickOrDrag}
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                {t.newAscent_maxSize}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Form step */}
      {step === "form" && <form
      onSubmit={handleSubmit}
      style={{
        background: "white", border: "1px solid #e5e7eb",
        borderRadius: 12, padding: 24,
        display: "flex", flexDirection: "column" as const, gap: 20,
      }}
    >
      {/* Peak */}
      <div>
        <label style={labelStyle}>{t.field_peak} *</label>
        <PeakPicker
          peaks={peaks}
          defaultPeakId={defaultPeakId ?? suggestedPeakId ?? undefined}
          name="peakId"
          placeholder={t.field_selectPeak}
          suggested={!defaultPeakId && !!suggestedPeakId}
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" style={labelStyle}>{t.field_date} *</label>
        <input
          id="date" name="date" type="date" required
          defaultValue={suggestedDate ?? new Date().toISOString().split("T")[0]}
          style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
        />
      </div>

      {/* Route */}
      <div>
        <label htmlFor="route" style={labelStyle}>
          {t.field_route} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
        </label>
        <input
          id="route" name="route" type="text"
          placeholder={t.field_routePlaceholder}
          maxLength={500} style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" style={labelStyle}>
          {t.field_notes} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
        </label>
        <textarea
          id="description" name="description" rows={3}
          placeholder={t.field_notesPlaceholder}
          maxLength={2000}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Photos */}
      <div>
        <label style={labelStyle}>{t.field_photos} *</label>

        {/* Drop zone — hidden once photo is added (one photo per ascent) */}
        {readyItems.length === 0 && <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); queueFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#0369a1" : "#d1d5db"}`,
            borderRadius: 10, padding: "20px 16px",
            textAlign: "center", cursor: "pointer",
            background: dragging ? "#eff6ff" : "#f9fafb",
            transition: "all 0.15s",
          }}
        >
          <input
            ref={inputRef} type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.length) queueFiles(e.target.files); e.target.value = ""; }}
          />
          <p style={{ fontSize: 22, margin: "0 0 4px" }}>📷</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>
            {t.newAscent_clickOrDrag}
          </p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
            {t.newAscent_maxSize}
          </p>
        </div>}

        {/* Ready previews (cropped + tagged) */}
        {readyItems.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: 8, marginTop: 12,
          }}>
            {readyItems.map((item, i) => {
              const taggedCount = item.faces.filter((f) => f.personName).length;
              return (
                <div key={i} style={{ position: "relative", aspectRatio: "4/5", borderRadius: 8, overflow: "hidden", background: "#f3f4f6" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {taggedCount > 0 && (
                    <span style={{
                      position: "absolute", bottom: 4, left: 4,
                      background: "rgba(34,197,94,0.88)", backdropFilter: "blur(4px)",
                      borderRadius: 10, padding: "2px 6px",
                      fontSize: 9, fontWeight: 700, color: "white",
                    }}>
                      {fmt(t.newAscent_tagged, { n: taggedCount })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      position: "absolute", top: 3, right: 3,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(0,0,0,0.55)", border: "none",
                      color: "white", fontSize: 10, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p style={{
          fontSize: 13, color: "#dc2626", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", margin: 0,
        }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
        <button
          type="button" onClick={() => router.back()}
          disabled={loading}
          style={{
            padding: "9px 18px", border: "1px solid #e5e7eb",
            background: "white", color: "#374151",
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: loading ? 0.5 : 1,
          }}
        >
          {t.cancel}
        </button>
        <button
          type="submit" disabled={loading}
          style={{
            padding: "9px 18px", background: "#0369a1", color: "white",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
            minWidth: 90, justifyContent: "center",
          }}
        >
          {loading && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <style>{`@keyframes naSpin{to{transform:rotate(360deg)}} .na-sp{animation:naSpin 0.75s linear infinite;transform-origin:12px 12px;}`}</style>
              <g className="na-sp"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 2a10 10 0 0 0-10 10" opacity="0.25"/></g>
            </svg>
          )}
          {t.newAscent_save}
        </button>
      </div>
    </form>}
    </>
  );
}
