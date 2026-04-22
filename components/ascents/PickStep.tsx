"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";

type PickStepProps = {
  onFiles: (files: FileList) => void;
  error?: string | null;
};

export function PickStep({ onFiles, error }: PickStepProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 32,
        background: dragging ? "#eff6ff" : "white",
        transition: "background 0.15s",
        cursor: "default",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <PhotoStackIcon dragging={dragging} />

      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 20, fontWeight: 400, color: "#111827", margin: 0 }}>
          {t.newAscent_clickOrDrag}
        </p>
        <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
          {t.newAscent_maxSize}
        </p>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "#ef4444", margin: 0, textAlign: "center" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          background: "#0369a1",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "10px 24px",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#0284c7")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#0369a1")}
      >
        {t.newAscent_selectFiles}
      </button>
    </div>
  );
}

function PhotoStackIcon({ dragging }: { dragging: boolean }) {
  const color = dragging ? "#0369a1" : "#111827";
  return (
    <svg
      width="80" height="72" viewBox="0 0 80 72" fill="none"
      style={{ transition: "transform 0.2s", transform: dragging ? "scale(1.08)" : "scale(1)" }}
    >
      {/* Back card */}
      <rect x="22" y="8" width="46" height="38" rx="5" stroke={color} strokeWidth="2.2"
        fill="none" opacity="0.45" transform="rotate(-6 22 8)" />
      {/* Front card */}
      <rect x="12" y="20" width="46" height="38" rx="5" stroke={color} strokeWidth="2.2" fill="white" />
      {/* Mountain silhouette inside front card */}
      <path d="M20 50 L30 34 L37 42 L43 36 L57 50 Z"
        stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.5" />
      {/* Sun circle */}
      <circle cx="50" cy="30" r="4" stroke={color} strokeWidth="1.8" fill="none" opacity="0.5" />
    </svg>
  );
}
