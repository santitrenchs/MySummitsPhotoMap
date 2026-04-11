"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PhotoFaceTagger } from "./PhotoFaceTagger";
import { ImageCropModal } from "./ImageCropModal";

type Photo = { id: string; url: string };

export function PhotoUploader({
  ascentId,
  existingPhotos,
}: {
  ascentId: string;
  existingPhotos: Photo[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Photo[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [tagging, setTagging] = useState<Photo | null>(null);

  // Crop queue: files waiting to be cropped one by one
  const [cropQueue, setCropQueue] = useState<File[]>([]);

  function queueFiles(files: FileList | File[]) {
    setError(null);
    setCropQueue(Array.from(files));
  }

  async function uploadBlob(blob: Blob) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", blob, "photo.jpg");
    formData.append("ascentId", ascentId);

    const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Upload failed");
      setUploading(false);
      return;
    }
    const photo: Photo = await res.json();
    setPreviews((prev) => [...prev, photo]);
    setUploading(false);
    router.refresh();
  }

  function handleCropDone(blob: Blob) {
    // Remove first item from queue, upload the cropped blob
    setCropQueue((q) => q.slice(1));
    uploadBlob(blob);
  }

  function handleCropCancel() {
    // Skip this file, move to next
    setCropQueue((q) => q.slice(1));
  }

  async function handleDelete(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    setPreviews((prev) => prev.filter((p) => p.id !== photoId));
    router.refresh();
  }

  return (
    <div>
      {/* Crop modal — shown one file at a time */}
      {cropQueue.length > 0 && (
        <ImageCropModal
          file={cropQueue[0]}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) queueFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#0369a1" : "#d1d5db"}`,
          borderRadius: 12,
          padding: "32px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "#eff6ff" : "#f9fafb",
          transition: "all 0.15s",
          marginBottom: 16,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.length) queueFiles(e.target.files); }}
        />
        <p style={{ fontSize: 28, margin: "0 0 8px" }}>📷</p>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>
          {uploading ? "Uploading…" : "Click or drag photos here"}
        </p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>
          JPEG, PNG, WebP · max 10 MB each
        </p>
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
              <button
                onClick={(e) => { e.stopPropagation(); setTagging(photo); }}
                style={{
                  position: "absolute", bottom: 4, left: 4,
                  padding: "2px 7px", borderRadius: 6,
                  background: "rgba(0,0,0,0.55)", border: "none",
                  color: "white", fontSize: 10, fontWeight: 600, cursor: "pointer",
                }}
              >
                Tag
              </button>
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

      {tagging && (
        <PhotoFaceTagger
          photo={tagging}
          onClose={() => setTagging(null)}
        />
      )}
    </div>
  );
}
