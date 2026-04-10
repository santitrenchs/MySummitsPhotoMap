"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Peak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
};

export function NewAscentForm({
  peaks,
  defaultPeakId,
}: {
  peaks: Peak[];
  defaultPeakId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const groups = peaks.reduce<Record<string, Peak[]>>((acc, peak) => {
    const group = peak.mountainRange ?? "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(peak);
    return acc;
  }, {});

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setSelectedFiles((prev) => [...prev, ...arr]);
    arr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);

    // Step 1 — create ascent
    setStatus("Saving ascent…");
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

    // Step 2 — upload photos (if any)
    if (selectedFiles.length > 0) {
      for (let i = 0; i < selectedFiles.length; i++) {
        setStatus(`Uploading photo ${i + 1} of ${selectedFiles.length}…`);
        const fd = new FormData();
        fd.append("file", selectedFiles[i]);
        fd.append("ascentId", ascent.id);
        const photoRes = await fetch("/api/photos/upload", { method: "POST", body: fd });
        if (!photoRes.ok) {
          // Non-fatal: ascent was saved, photos partially uploaded
          setError(`Ascent saved but photo ${i + 1} failed to upload.`);
          setLoading(false);
          setStatus(null);
          router.push(`/ascents/${ascent.id}`);
          router.refresh();
          return;
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
    <form
      onSubmit={handleSubmit}
      style={{
        background: "white", border: "1px solid #e5e7eb",
        borderRadius: 12, padding: 24,
        display: "flex", flexDirection: "column" as const, gap: 20,
      }}
    >
      {/* Peak */}
      <div>
        <label htmlFor="peakId" style={labelStyle}>Peak *</label>
        <select
          id="peakId" name="peakId" required
          defaultValue={defaultPeakId ?? ""}
          style={{ ...inputStyle, background: "white" }}
        >
          <option value="" disabled>Select a peak…</option>
          {Object.entries(groups).sort().map(([range, rangePeaks]) => (
            <optgroup key={range} label={range}>
              {rangePeaks.map((peak) => (
                <option key={peak.id} value={peak.id}>
                  {peak.name} ({peak.altitudeM.toLocaleString()} m)
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" style={labelStyle}>Date *</label>
        <input
          id="date" name="date" type="date" required
          defaultValue={new Date().toISOString().split("T")[0]}
          style={inputStyle}
        />
      </div>

      {/* Route */}
      <div>
        <label htmlFor="route" style={labelStyle}>
          Route <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
        </label>
        <input
          id="route" name="route" type="text"
          placeholder="e.g. Norte de Salenques"
          maxLength={500} style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" style={labelStyle}>
          Notes <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
        </label>
        <textarea
          id="description" name="description" rows={3}
          placeholder="Conditions, weather, memories…"
          maxLength={2000}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Photos */}
      <div>
        <label style={labelStyle}>
          Photos <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
        </label>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
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
            accept="image/jpeg,image/png,image/webp"
            multiple style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
          />
          <p style={{ fontSize: 22, margin: "0 0 4px" }}>📷</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>
            Click or drag photos here
          </p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
            JPEG, PNG, WebP · max 10 MB each
          </p>
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: 8, marginTop: 12,
          }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "#f3f4f6" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
            ))}
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
        {status && (
          <span style={{ fontSize: 13, color: "#6b7280", flex: 1 }}>{status}</span>
        )}
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
          Cancel
        </button>
        <button
          type="submit" disabled={loading}
          style={{
            padding: "9px 18px", background: "#0369a1", color: "white",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? status ?? "Saving…" : `Save${selectedFiles.length > 0 ? ` + ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""}` : ""}`}
        </button>
      </div>
    </form>
  );
}
