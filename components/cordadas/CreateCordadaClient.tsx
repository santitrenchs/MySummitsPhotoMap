"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function CreateCordadaClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        Nueva cordada
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            Nombre *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Ej. Los Piolets"
            required
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px",
              fontSize: 15, color: "#111827", outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            Descripción <span style={{ fontWeight: 400, color: "#9ca3af" }}>(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="¿Quiénes sois? ¿Qué montañas tenéis en mente?"
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
            color: "white", fontSize: 15, fontWeight: 700, cursor: loading || !name.trim() ? "default" : "pointer",
          }}
        >
          {loading ? "Creando…" : "Crear cordada"}
        </button>
      </form>
    </div>
  );
}
