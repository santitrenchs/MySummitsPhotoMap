"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";

export type PersonCard = {
  id: string;
  name: string;
  email?: string | null;
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
        border: "2.5px solid white", boxShadow: "0 0 0 2px #e5e7eb",
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
      border: "2.5px solid white", boxShadow: "0 0 0 2px #e5e7eb",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, color: "#0369a1", fontWeight: 700, flexShrink: 0,
    }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

function formatDate(iso: string | null, dateLocale: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
}

export function PersonsClient({ persons }: { persons: PersonCard[] }) {
  const router = useRouter();
  const t = useT();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("ascents");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const navigate = useCallback((href: string) => {
    if (navigatingTo) return;
    setNavigatingTo(href);
    router.push(href);
  }, [navigatingTo, router]);

  // Edit modal state
  const [editingPerson, setEditingPerson] = useState<PersonCard | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; photoCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPerson) setTimeout(() => editNameRef.current?.focus(), 50);
  }, [editingPerson]);

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
      r = r.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
      );
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

  function openEdit(person: PersonCard) {
    setEditingPerson(person);
    setEditName(person.name);
    setEditEmail(person.email ?? "");
    setOpenMenuId(null);
  }

  async function handleSaveEdit() {
    if (!editingPerson || !editName.trim()) return;
    setSaving(true);
    await fetch(`/api/persons/${editingPerson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, email: editEmail || null }),
    });
    setSaving(false);
    setEditingPerson(null);
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
    { value: "ascents", label: t.people_sort_ascents },
    { value: "photos", label: t.people_sort_photos },
    { value: "recent", label: t.people_sort_recent },
    { value: "name", label: t.people_sort_az },
  ];

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .person-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .person-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.10) !important; }
        .photo-thumb { transition: transform 0.18s ease; cursor: pointer; }
        .photo-thumb:hover { transform: scale(1.06); }
        .photos-scroll::-webkit-scrollbar { display: none; }
        .sort-pill { transition: background 0.14s, color 0.14s; }
        .sort-pill:hover { background: #f3f4f6 !important; }
      `}</style>

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editingPerson && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 18,
            padding: 28, width: "100%", maxWidth: 380,
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
              {t.people_editPerson}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 5 }}>
                  {t.settings_name}
                </label>
                <input
                  ref={editNameRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingPerson(null); }}
                  placeholder={t.people_fullName}
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: 14, fontWeight: 600,
                    border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 5 }}>
                  {t.settings_email} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({t.optional})</span>
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingPerson(null); }}
                  placeholder="name@example.com"
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: 14,
                    border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none",
                    boxSizing: "border-box", color: "#374151",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingPerson(null)}
                disabled={saving}
                style={{ padding: "9px 18px", background: "#f3f4f6", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
                style={{ padding: "9px 18px", background: "#0369a1", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ──────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 18,
            padding: 28, width: "100%", maxWidth: 360,
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
              Delete &ldquo;{deleteConfirm.name}&rdquo;?
            </h3>
            {deleteConfirm.photoCount > 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 22px", lineHeight: 1.6 }}>
                {t.people_delete_body_photos.replace("{n}", String(deleteConfirm.photoCount))}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 22px" }}>{t.people_delete_body_simple}</p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                style={{ padding: "9px 18px", background: "#f3f4f6", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                {t.cancel}
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ padding: "9px 18px", background: "#ef4444", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? t.deleting : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {openMenuId && (
        <div onClick={() => setOpenMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
      )}

      {/* ── Metrics pills ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { emoji: "👥", value: metrics.total, label: t.people_stat_people },
          { emoji: "📸", value: metrics.totalPhotos, label: t.people_stat_photos },
          { emoji: "🏔", value: metrics.totalAscents, label: t.people_stat_ascents },
        ].map(({ emoji, value, label }) => (
          <div key={label} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "white", border: "1px solid #e5e7eb", borderRadius: 24,
            padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#374151",
          }}>
            <span>{emoji}</span>
            <span style={{ fontWeight: 700, color: "#111827" }}>{value}</span>
            <span style={{ color: "#9ca3af", fontWeight: 400 }}>{label}</span>
          </div>
        ))}
        {metrics.mostFrequent !== "—" && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 24,
            padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#0369a1",
          }}>
            <span>🥇</span><span>{metrics.mostFrequent}</span>
          </div>
        )}
      </div>

      {/* ── Search + Sort ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder={t.people_search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 18px", fontSize: 14,
            border: "1.5px solid #e5e7eb", borderRadius: 24,
            outline: "none", background: "white", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "inline-flex", background: "#f3f4f6", borderRadius: 24, padding: 3, gap: 2, alignSelf: "flex-start" }}>
          {SORTS.map(({ value, label }) => (
            <button key={value} className="sort-pill" onClick={() => setSort(value)} style={{
              padding: "6px 16px", borderRadius: 20, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: sort === value ? "white" : "transparent",
              color: sort === value ? "#111827" : "#6b7280",
              boxShadow: sort === value ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 0" }}>
          <p style={{ fontSize: 36, margin: "0 0 8px" }}>🔍</p>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{t.people_noMatch}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((person) => (
            <div
              key={person.id}
              className={openMenuId === person.id ? "" : "person-card"}
              style={{
                background: "white", border: "1px solid #e5e7eb",
                borderRadius: 16,
                // NO overflow:hidden here — would clip the dropdown menu
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                cursor: navigatingTo === `/persons/${person.id}` ? "wait" : "pointer",
                position: "relative",
                opacity: navigatingTo === `/persons/${person.id}` ? 0.65 : 1,
                transition: "opacity 0.15s",
              }}
              onClick={() => navigate(`/persons/${person.id}`)}
            >
              {/* Loading spinner overlay */}
              {navigatingTo === `/persons/${person.id}` && (
                <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #e5e7eb", borderTopColor: "#0369a1", animation: "spin 0.7s linear infinite" }} />
                </div>
              )}

              {/* Card header */}
              <div style={{ padding: "16px 16px 12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <FaceAvatar
                  name={person.name}
                  photoUrl={person.avatarPhotoUrl}
                  faceBox={person.avatarFaceBox}
                  size={52}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {person.name}
                  </p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
                    {person.ascentCount} ascent{person.ascentCount !== 1 ? "s" : ""} · {person.photoCount} photo{person.photoCount !== 1 ? "s" : ""}
                  </p>
                  {person.email && (
                    <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      ✉️ {person.email}
                    </p>
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
                  >⋮</button>
                  {openMenuId === person.id && (
                    <div
                      style={{
                        position: "absolute", right: 0, top: 34, zIndex: 30,
                        background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.14)", minWidth: 130, overflow: "hidden",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openEdit(person)}
                        style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, color: "#374151", cursor: "pointer" }}
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => { setDeleteConfirm({ id: person.id, name: person.name, photoCount: person.photoCount }); setOpenMenuId(null); }}
                        style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, color: "#ef4444", cursor: "pointer" }}
                      >
                        {t.delete}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo strip — clipped separately so it doesn't affect the dropdown */}
              {person.ascents.length > 0 && (
                <div style={{ borderRadius: "0 0 0 0", overflow: "hidden" }}>
                  <div
                    className="photos-scroll"
                    style={{
                      display: "flex", gap: 6, overflowX: "auto",
                      padding: "0 16px 14px", scrollbarWidth: "none",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {person.ascents.map((a) => (
                      <Link key={a.id} href={`/ascents/${a.id}`}
                        style={{ textDecoration: "none", flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ position: "relative" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.photoUrl} alt="" className="photo-thumb"
                            style={{ width: 88, height: 88, borderRadius: 10, objectFit: "cover", display: "block" }} />
                          <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, padding: "0 5px" }}>
                            <p style={{ fontSize: 9, fontWeight: 700, color: "white", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {a.peakName}
                            </p>
                            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                              {a.altitudeM.toLocaleString("en-GB")} m
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Card footer */}
              {(person.highestPeak || person.lastAscentDate) && (
                <div style={{
                  borderTop: "1px solid #f3f4f6", padding: "10px 16px",
                  display: "flex", gap: 12, flexWrap: "wrap",
                  borderRadius: "0 0 16px 16px",
                }}>
                  {person.highestPeak && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      🏔 <strong style={{ color: "#374151" }}>{person.highestPeak.name}</strong> · {person.highestPeak.altitudeM.toLocaleString("en-GB")} m
                    </span>
                  )}
                  {person.lastAscentDate && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      🗓 {t.people_lastClimb} {formatDate(person.lastAscentDate, t.dateLocale)}
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
