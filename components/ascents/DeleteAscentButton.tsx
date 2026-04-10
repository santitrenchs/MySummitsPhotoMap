"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAscentButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this ascent?")) return;
    setLoading(true);
    await fetch(`/api/ascents/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        border: "1px solid #fee2e2", background: "white", color: "#ef4444",
        borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600,
        cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
