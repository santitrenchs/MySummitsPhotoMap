"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageCropModal, resizeForStorage, type CropMeta } from "./ImageCropModal";
import { PhotoTagStep, type FaceDraft } from "./PhotoTagStep";

type RetagItem = { photoId: string; blob: Blob; existingFaces: FaceDraft[] };
type TagItem = { blob: Blob; cropMeta: CropMeta; originalFile: File };
import { useT } from "@/components/providers/I18nProvider";

type Photo = { id: string; url: string };

export function PhotoUploader({
  ascentId,
  existingPhotos,
}: {
  ascentId: string;
  existingPhotos: Photo[];
}) {
  const router = useRouter();
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Photo[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Step 1: crop queue (new uploads)
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  // Step 2: tag queue for new uploads (cropped blobs + original + crop metadata)
  const [tagQueue, setTagQueue] = useState<TagItem[]>([]);
  // Re-tag queue for existing photos
  const [retagQueue, setRetagQueue] = useState<RetagItem[]>([]);

  const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

  function queueFiles(files: FileList | File[]) {
    setError(null);
    const arr = Array.from(files);
    const oversized = arr.find((f) => f.size > MAX_PHOTO_BYTES);
    if (oversized) { setError(t.photo_tooLarge); return; }
    setCropQueue(arr);
  }

  // Crop done → move to tag step
  function handleCropDone(blob: Blob, cropMeta: CropMeta) {
    const originalFile = cropQueue[0];
    setCropQueue((q) => q.slice(1));
    setTagQueue((q) => [...q, { blob, cropMeta, originalFile }]);
  }
  function handleCropCancel() {
    setCropQueue((q) => q.slice(1));
  }

  // Tag done → upload with faces
  async function handleTagDone(blob: Blob, faces: FaceDraft[]) {
    const current = tagQueue[0];
    setTagQueue((q) => q.slice(1));
    await uploadWithFaces(blob, faces, current?.cropMeta, current?.originalFile);
  }
  function handleTagSkip(blob: Blob) {
    handleTagDone(blob, []);
  }

  async function uploadWithFaces(blob: Blob, faces: FaceDraft[], cropMeta?: CropMeta, originalFile?: File) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", blob, "photo.jpg");
    formData.append("ascentId", ascentId);

    if (originalFile && cropMeta) {
      const originalBlob = await resizeForStorage(originalFile);
      formData.append("originalFile", originalBlob, "original.jpg");
      formData.append("cropMeta", JSON.stringify(cropMeta));
    }

    const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t.photo_uploadFailed);
      setUploading(false);
      return;
    }
    const photo: Photo = await res.json();
    setPreviews((prev) => [...prev, photo]);

    // Save face detections + tags atomically
    if (faces.length > 0) {
      await fetch(`/api/photos/${photo.id}/faces`, {
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

    setUploading(false);
    router.refresh();
  }

  async function handleDelete(photoId: string) {
    if (!confirm(t.photo_deleteConfirm)) return;
    await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    setPreviews((prev) => prev.filter((p) => p.id !== photoId));
    router.refresh();
  }

  async function openRetag(photo: Photo) {
    const [blobRes, facesRes] = await Promise.all([
      fetch(`/api/photos/${photo.id}/blob`),
      fetch(`/api/photos/${photo.id}/faces`),
    ]);
    const [blob, facesData] = await Promise.all([blobRes.blob(), facesRes.json()]);

    const existingFaces: FaceDraft[] = (facesData as {
      id: string;
      boundingBox: { x: number; y: number; width: number; height: number };
      descriptor: number[] | null;
      faceTags: { status: string; person: { name: string } }[];
    }[]).map((det) => ({
      tempId: `existing-${det.id}`,
      boundingBox: det.boundingBox,
      descriptor: det.descriptor ?? [],
      personName: det.faceTags[0]?.person.name ?? null,
      suggestion: null,
    }));

    setRetagQueue((q) => [...q, { photoId: photo.id, blob, existingFaces }]);
  }

  async function handleRetagDone(blob: Blob, faces: FaceDraft[]) {
    const current = retagQueue[0];
    setRetagQueue((q) => q.slice(1));
    if (!current) return;
    if (faces.length > 0) {
      await fetch(`/api/photos/${current.photoId}/faces`, {
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
    router.refresh();
  }

  function handleRetagSkip(_blob: Blob) {
    setRetagQueue((q) => q.slice(1));
  }

  return (
    <div>
      {/* Step 1 — Crop modal (new uploads) */}
      {cropQueue.length > 0 && (
        <ImageCropModal
          file={cropQueue[0]}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      {/* Step 2 — Tag step for new uploads */}
      {cropQueue.length === 0 && tagQueue.length > 0 && (
        <PhotoTagStep
          blob={tagQueue[0].blob}
          onDone={handleTagDone}
          onSkip={handleTagSkip}
        />
      )}

      {/* Re-tag step for existing photos */}
      {cropQueue.length === 0 && tagQueue.length === 0 && retagQueue.length > 0 && (
        <PhotoTagStep
          blob={retagQueue[0].blob}
          initialFaces={retagQueue[0].existingFaces}
          onDone={handleRetagDone}
          onSkip={handleRetagSkip}
        />
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { if (uploading) return; e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading && e.dataTransfer.files.length) queueFiles(e.dataTransfer.files);
        }}
        onClick={() => { if (!uploading) inputRef.current?.click(); }}
        style={{
          border: `2px dashed ${uploading ? "#bfdbfe" : dragging ? "#0369a1" : "#d1d5db"}`,
          borderRadius: 12, padding: "32px 16px",
          textAlign: "center", cursor: uploading ? "wait" : "pointer",
          background: uploading ? "#eff6ff" : dragging ? "#eff6ff" : "#f9fafb",
          transition: "all 0.15s", marginBottom: 16,
          position: "relative",
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.length) queueFiles(e.target.files); e.target.value = ""; }}
        />
        {uploading ? (
          <>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #bfdbfe", borderTopColor: "#0369a1", animation: "spin 0.7s linear infinite", margin: "0 auto 8px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0369a1", margin: 0 }}>{t.photo_uploading}</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>📷</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>{t.photo_clickOrDrag}</p>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>{t.photo_maxSize}</p>
          </>
        )}
      </div>

      {error && (
        <p style={{
          fontSize: 13, color: "#dc2626", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: 8,
          padding: "8px 12px", marginBottom: 16,
        }}>
          {error}
        </p>
      )}

      {/* Photo grid */}
      {previews.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}>
          {previews.map((photo) => (
            <div
              key={photo.id}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "#f3f4f6" }}
            >
              <Image
                src={photo.url}
                alt="Summit photo"
                fill
                style={{ objectFit: "cover" }}
                sizes="140px"
              />
              {/* Tag faces button */}
              <button
                onClick={(e) => { e.stopPropagation(); openRetag(photo); }}
                style={{
                  position: "absolute", bottom: 4, left: 4,
                  height: 22, borderRadius: 11,
                  background: "rgba(0,0,0,0.55)", border: "none",
                  color: "white", fontSize: 10, fontWeight: 700,
                  cursor: "pointer", padding: "0 7px",
                  display: "flex", alignItems: "center", gap: 3,
                }}
                aria-label="Tag faces"
              >
                👤
              </button>
              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                style={{
                  position: "absolute", top: 4, right: 4,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(0,0,0,0.55)", border: "none",
                  color: "white", fontSize: 11, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                aria-label="Delete photo"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
