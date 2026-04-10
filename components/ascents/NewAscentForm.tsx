"use client";

import { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group peaks by mountain range for the select
  const groups = peaks.reduce<Record<string, Peak[]>>((acc, peak) => {
    const group = peak.mountainRange ?? "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(peak);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/ascents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peakId: form.get("peakId"),
        date: form.get("date"),
        route: form.get("route") || undefined,
        description: form.get("description") || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Failed to save ascent");
      setLoading(false);
      return;
    }

    router.push("/ascents");
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
      {/* Peak selector */}
      <div>
        <label htmlFor="peakId" style={labelStyle}>Peak *</label>
        <select
          id="peakId"
          name="peakId"
          required
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
          id="date"
          name="date"
          type="date"
          required
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
          id="route"
          name="route"
          type="text"
          placeholder="e.g. Norte de Salenques"
          maxLength={500}
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" style={labelStyle}>
          Notes <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Conditions, weather, memories…"
          maxLength={2000}
          style={{ ...inputStyle, resize: "vertical" }}
        />
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
          type="button"
          onClick={() => router.back()}
          style={{
            padding: "9px 18px", border: "1px solid #e5e7eb",
            background: "white", color: "#374151",
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "9px 18px", background: "#0369a1", color: "white",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Saving…" : "Save ascent"}
        </button>
      </div>
    </form>
  );
}
