"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Extract embed src from a full <iframe> paste or return the URL as-is */
function normalizeWikiloc(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // If they pasted the full iframe HTML, extract the src attribute
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
  if (srcMatch) return srcMatch[1];
  return trimmed;
}

export function AscentEditForm({
  id,
  defaultDate,
  defaultRoute,
  defaultDescription,
  defaultWikiloc,
}: {
  id: string;
  defaultDate: string;
  defaultRoute: string;
  defaultDescription: string;
  defaultWikiloc: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wikiloc, setWikiloc] = useState(defaultWikiloc);

  const inputStyle = {
    width: "100%", padding: "9px 12px",
    border: "1px solid #d1d5db", borderRadius: 8,
    fontSize: 14, color: "#111827",
    outline: "none", boxSizing: "border-box" as const,
    background: "white",
  };
  const labelStyle = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#374151", marginBottom: 6,
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/ascents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.get("date"),
        route: (form.get("route") as string) || null,
        description: (form.get("description") as string) || null,
        wikiloc: normalizeWikiloc(wikiloc) || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    router.push(`/ascents/${id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "white", border: "1px solid #e5e7eb",
        borderRadius: 12, padding: 24,
        display: "flex", flexDirection: "column", gap: 20,
      }}
    >
      {/* Date */}
      <div>
        <label htmlFor="date" style={labelStyle}>Date *</label>
        <input
          id="date" name="date" type="date" required
          defaultValue={defaultDate}
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
          defaultValue={defaultRoute}
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
          defaultValue={defaultDescription}
          placeholder="Conditions, weather, memories…"
          maxLength={2000}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Wikiloc */}
      <div>
        <label htmlFor="wikiloc" style={labelStyle}>
          Wikiloc route <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
        </label>
        <textarea
          id="wikiloc"
          rows={3}
          value={wikiloc}
          onChange={(e) => setWikiloc(e.target.value)}
          placeholder={`Paste the iframe code from Wikiloc, e.g.\n<iframe src="https://es.wikiloc.com/wikiloc/embedv2.do?id=..." ...></iframe>`}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
        />
        {wikiloc.trim() && (
          <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0" }}>
            Embed URL: <code style={{ color: "#0369a1" }}>{normalizeWikiloc(wikiloc)}</code>
          </p>
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

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button
          type="button" onClick={() => router.back()}
          disabled={saving}
          style={{
            padding: "9px 18px", border: "1px solid #e5e7eb",
            background: "white", color: "#374151",
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: saving ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          type="submit" disabled={saving}
          style={{
            padding: "9px 18px", background: "#0369a1", color: "white",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
