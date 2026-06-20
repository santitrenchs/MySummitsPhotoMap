"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";

export function CreateCordadaClient() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/cordadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, description: description.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al crear la cordada");
      }
      const { cordada } = await res.json();

      // Upload avatar if one was selected (best-effort)
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        await fetch(`/api/v1/cordadas/${cordada.id}/avatar`, {
          method: "POST",
          body: fd,
        }).catch(() => {});
      }

      router.push(`/cordadas/${cordada.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 16px 80px" }}>
      {/* Back */}
      <div style={{ padding: "12px 0" }}>
        <Link href="/cordadas" style={{
          display: "flex", alignItems: "center", gap: 6,
          color: "#0369a1", textDecoration: "none", fontSize: 14, fontWeight: 500,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Cordadas
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D2538", margin: "0 0 20px" }}>
        {t.cordadas_createTitle}
      </h1>

      <form onSubmit={handleSubmit}>
        {/* Cover photo picker */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
            {t.cordadas_photoLabel} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%", aspectRatio: "3/2", borderRadius: 12, cursor: "pointer",
              border: photoPreview ? "none" : "2px dashed #d1d5db",
              background: photoPreview ? "none" : "#f9fafb",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", position: "relative",
            }}
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", color: "#9ca3af" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 8px", display: "block" }}>
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <div style={{ fontSize: 13 }}>Añadir foto</div>
              </div>
            )}
            {photoPreview && (
              <div style={{
                position: "absolute", bottom: 8, right: 8,
                background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "4px 10px",
                color: "white", fontSize: 12, fontWeight: 600,
              }}>
                {t.cordadas_changePhoto}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            {t.cordadas_nameLabel} *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={t.cordadas_namePlaceholder}
            required
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px",
              fontSize: 15, color: "#111827", outline: "none", fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            {t.cordadas_descriptionLabel} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder={t.cordadas_descriptionPlaceholder}
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px",
              fontSize: 15, color: "#111827", outline: "none", resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
            padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "#dc2626",
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            width: "100%", height: 50, borderRadius: 12, border: "none",
            background: loading || !name.trim() ? "#9ca3af" : "#2F7A5F",
            color: "white", fontSize: 15, fontWeight: 700,
            cursor: loading || !name.trim() ? "default" : "pointer",
          }}
        >
          {loading ? t.cordadas_creating : t.cordadas_createBtn}
        </button>
      </form>
    </div>
  );
}
