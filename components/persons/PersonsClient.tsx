"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export type PersonCard = {
  id: string;
  name: string;
  photoCount: number;
  ascentCount: number;
  highestPeak: { name: string; altitudeM: number } | null;
  lastAscentDate: string | null;
  lastTaggedAt: string | null;
  avatarPhotoUrl: string | null;
  avatarFaceBox: { x: number; y: number; width: number; height: number } | null;
  ascents: { id: string; peakName: string; altitudeM: number; photoUrl: string }[];
};

type Sort = "ascents" | "photos" | "recent" | "name";

function FaceAvatar({
  name,
  photoUrl,
  faceBox,
  size = 44,
}: {
  name: string;
  photoUrl: string | null;
  faceBox: { x: number; y: number; width: number; height: number } | null;
  size?: number;
}) {
  if (photoUrl && faceBox) {
    const pad = 0.3;
    const x = Math.max(0, faceBox.x - faceBox.width * pad);
    const y = Math.max(0, faceBox.y - faceBox.height * pad);
    const w = Math.min(1 - x, faceBox.width * (1 + 2 * pad));
    const h = Math.min(1 - y, faceBox.height * (1 + 2 * pad));

    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        overflow: "hidden", flexShrink: 0,
        border: "2.5px solid white",
        boxShadow: "0 0 0 2px #e5e7eb",
        backgroundImage: `url(${photoUrl})`,
        backgroundSize: `${size / w}px ${size / h}px`,
        backgroundPosition: `-${x * size / w}px -${y * size / h}px`,
        backgroundRepeat: "no-repeat",
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      border: "2.5px solid white",
      boxShadow: "0 0 0 2px #e5e7eb",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, color: "#0369a1", fontWeight: 700, flexShrink: 0,
    }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PersonsClient({ persons }: { persons: PersonCard[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("ascents");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; photoCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [renamingId]);

  const metrics = useMemo(() => {
    const mostAscents = persons.reduce((best, p) => p.ascentCount > (best?.ascentCount ?? -1) ? p : best, persons[0] ?? null);
    return {
      total: persons.length,
      mostFrequent: mostAscents?.name ?? "—",
      totalPhotos: persons.reduce((s, p) => s + p.photoCount, 0),
      totalAscents: persons.reduce((s, p) => s + p.ascentCount, 0),
    };
  }, [persons]);

  const filtered = useMemo(() => {
    let r = persons;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => {
      if (sort === "ascents") return b.ascentCount - a.ascentCount || a.name.localeCompare(b.name);
      if (sort === "photos") return b.photoCount - a.photoCount || a.name.localeCompare(b.name);
      if (sort === "recent") {
        const ta = a.lastTaggedAt ? new Date(a.lastTaggedAt).getTime() : 0;
        const tb = b.lastTaggedAt ? new Date(b.lastTaggedAt).getTime() : 0;
        return tb - ta;
      }
      return a.name.localeCompare(b.name);
    });
  }, [persons, search, sort]);

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    setSaving(true);
    await fetch(`/api/persons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    setSaving(false);
    setRenamingId(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    await fetch(`/api/persons/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteConfirm(null);
    router.refresh();
  }

  const SORTS: { value: Sort; label: string }[] = [
    { value: "ascents", label: "Ascents" },
    { value: "photos", label: "Photos" },
    { value: "recent", label: "Recent" },
    { value: "name", label: "A–Z" },
  ];

  return (
    <>
      <style>{`
        .person-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .person-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.10) !important;
        }
        .photo-thumb {
          transition: transform 0.18s ease;
          cursor: pointer;
        }
        .photo-thumb:hover {
          transform: scale(1.06);
        }
        .photos-scroll::-webkit-scrollbar {
          display: none;
        }
        .sort-pill {
          transition: background 0.14s, color 0.14s;
        }
        .sort-pill:hover {
          background: #f3f4f6 !important;
        }
      `}</style>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 16,
            padding: 28, width: "100%", maxWidth: 360,
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
              Delete &ldquo;{deleteConfirm.name}&rdquo;?
            </h3>
            {deleteConfirm.photoCount > 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 22px", lineHeight: 1.6 }}>
                Appears in <strong>{deleteConfirm.photoCount} photo{deleteConfirm.photoCount !== 1 ? "s" : ""}</strong>.
                All face tags will be removed. This cannot be undone.
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 22px" }}>
                This cannot be undone.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                style={{
                  padding: "9px 18px", background: "#f3f4f6", border: "none",
                  borderRadius: 9, fontSize: 13, fontWeight: 600,
                  color: "#374151", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: "9px 18px", background: "#ef4444", border: "none",
                  borderRadius: 9, fontSize: 13, fontWeight: 600,
                  color: "white", cursor: "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {openMenuId && (
        <div onClick={() => setOpenMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
      )}

      {/* Metrics pills */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20,
      }}>
        {[
          { emoji: "👥", value: metrics.total, label: "people" },
          { emoji: "📸", value: metrics.totalPhotos, label: "photos" },
          { emoji: "🏔", value: metrics.totalAscents, label: "ascents" },
        ].map(({ emoji, value, label }) => (
          <div key={label} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "white", border: "1px solid #e5e7eb",
            borderRadius: 24, padding: "6px 14px",
            fontSize: 13, fontWeight: 600, color: "#374151",
          }}>
            <span>{emoji}</span>
            <span style={{ fontWeight: 700, color: "#111827" }}>{value}</span>
            <span style={{ color: "#9ca3af", fontWeight: 400 }}>{label}</span>
          </div>
        ))}
        {metrics.mostFrequent !== "—" && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 24, padding: "6px 14px",
            fontSize: 13, fontWeight: 600, color: "#0369a1",
          }}>
            <span>🥇</span>
            <span>{metrics.mostFrequent}</span>
          </div>
        )}
      </div>

      {/* Search + Sort */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍  Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 18px", fontSize: 14,
            border: "1.5px solid #e5e7eb", borderRadius: 24,
            outline: "none", background: "white",
            boxSizing: "border-box",
          }}
        />
        {/* Segmented sort */}
        <div style={{
          display: "inline-flex", background: "#f3f4f6", borderRadius: 24,
          padding: 3, gap: 2, alignSelf: "flex-start",
        }}>
          {SORTS.map(({ value, label }) => (
            <button
              key={value}
              className="sort-pill"
              onClick={() => setSort(value)}
              style={{
                padding: "6px 16px", borderRadius: 20, border: "none",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: sort === value ? "white" : "transparent",
                color: sort === value ? "#111827" : "#6b7280",
                boxShadow: sort === value ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 0", color: "#9ca3af" }}>
          <p style={{ fontSize: 36, margin: "0 0 8px" }}>🔍</p>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>No people match your search</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((person) => (
            <div
              key={person.id}
              className="person-card"
              style={{
                background: "white", border: "1px solid #e5e7eb",
                borderRadius: 16, overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                cursor: "pointer", position: "relative",
              }}
              onClick={() => router.push(`/persons/${person.id}`)}
            >
              {/* Card header */}
              <div style={{ padding: "16px 16px 12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <FaceAvatar
                  name={person.name}
                  photoUrl={person.avatarPhotoUrl}
                  faceBox={person.avatarFaceBox}
                  size={52}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renamingId === person.id ? (
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(person.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        style={{
                          padding: "4px 8px", fontSize: 14, fontWeight: 700,
                          border: "1px solid #d1d5db", borderRadius: 6,
                          outline: "none", width: 150,
                        }}
                      />
                      <button
                        onClick={() => handleRename(person.id)}
                        disabled={saving}
                        style={{
                          padding: "4px 10px", background: "#0369a1", color: "white",
                          border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {saving ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontWeight: 700, fontSize: 16, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {person.name}
                      </p>
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
                        {person.ascentCount} ascent{person.ascentCount !== 1 ? "s" : ""} · {person.photoCount} photo{person.photoCount !== 1 ? "s" : ""}
                      </p>
                    </>
                  )}
                </div>

                {/* ⋮ menu */}
                <div
                  style={{ position: "relative", marginLeft: "auto", flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === person.id ? null : person.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#9ca3af", fontSize: 20, lineHeight: 1 }}
                  >
                    ⋮
                  </button>
                  {openMenuId === person.id && (
                    <div
                      style={{
                        position: "absolute", right: 0, top: 30, zIndex: 20,
                        background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 130, overflow: "hidden",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { setRenameValue(person.name); setRenamingId(person.id); setOpenMenuId(null); }}
                        style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, color: "#374151", cursor: "pointer" }}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => { setDeleteConfirm({ id: person.id, name: person.name, photoCount: person.photoCount }); setOpenMenuId(null); }}
                        style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, color: "#ef4444", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo strip */}
              {person.ascents.length > 0 && (
                <div
                  className="photos-scroll"
                  style={{
                    display: "flex", gap: 6, overflowX: "auto",
                    padding: "0 16px 14px",
                    scrollbarWidth: "none",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {person.ascents.map((a) => (
                    <Link
                      key={a.id}
                      href={`/ascents/${a.id}`}
                      style={{ textDecoration: "none", flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ position: "relative" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.photoUrl}
                          alt=""
                          className="photo-thumb"
                          style={{ width: 88, height: 88, borderRadius: 10, objectFit: "cover", display: "block" }}
                        />
                        <div style={{
                          position: "absolute", bottom: 4, left: 0, right: 0,
                          padding: "0 5px",
                        }}>
                          <p style={{
                            fontSize: 9, fontWeight: 700, color: "white", margin: 0,
                            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {a.peakName}
                          </p>
                          <p style={{
                            fontSize: 9, color: "rgba(255,255,255,0.85)", margin: 0,
                            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                          }}>
                            {a.altitudeM.toLocaleString()} m
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Card footer */}
              {(person.highestPeak || person.lastAscentDate) && (
                <div style={{
                  borderTop: "1px solid #f3f4f6", padding: "10px 16px",
                  display: "flex", gap: 12, flexWrap: "wrap",
                }}>
                  {person.highestPeak && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      🏔 <strong style={{ color: "#374151" }}>{person.highestPeak.name}</strong> · {person.highestPeak.altitudeM.toLocaleString()} m
                    </span>
                  )}
                  {person.lastAscentDate && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      🗓 Last climb: {formatDate(person.lastAscentDate)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
