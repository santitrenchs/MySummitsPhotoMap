"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";
import { i } from "@/lib/i18n";
import { AvatarCropModal } from "@/components/photos/AvatarCropModal";

type Ascent = {
  id: string;
  date: Date;
  peakName: string;
  altitudeM: number;
  mountainRange: string | null;
  firstPhoto: { id: string; url: string } | null;
  photoCount: number;
};

type Peak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  count: number;
};

type Photo = {
  id: string;
  url: string;
  ascentId: string;
};

type Props = {
  user: { name: string; username: string | null; bio: string | null; avatarUrl: string | null };
  ascents: Ascent[];
  peaks: Peak[];
  photos: Photo[];
  stats: { totalAscents: number; uniquePeaks: number; totalPhotos: number };
};

type Tab = "ascents" | "peaks" | "photos";

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

export function ProfileClient({ user: initialUser, ascents, peaks, photos, stats }: Props) {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ascents");
  const [editOpen, setEditOpen] = useState(false);

  // Local user state so edits show immediately
  const [user, setUser] = useState(initialUser);


  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 32px" }}>
      {/* ── Header ── */}
      <div style={{ padding: "28px 16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 700, color: "white",
            flexShrink: 0,
            boxShadow: "0 0 0 3px white, 0 0 0 4px #bfdbfe",
            overflow: "hidden",
          }}>
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              initials(user.name)
            )}
          </div>

          {/* Name / username */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 2px", lineHeight: 1.2 }}>
              {user.name}
            </h1>
            {user.username && (
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 6px" }}>@{user.username}</p>
            )}
            {user.bio && (
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.5 }}>{user.bio}</p>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={() => setEditOpen(true)}
            style={{
              padding: "7px 14px", border: "1px solid #d1d5db",
              background: "white", color: "#374151",
              borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", flexShrink: 0,
            }}
          >
            {t.profile_editProfile}
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1, marginTop: 20,
          background: "#e5e7eb", border: "1px solid #e5e7eb",
          borderRadius: 10, overflow: "hidden",
        }}>
          <StatCell value={stats.totalAscents} label={t.ascents_stat_ascents} />
          <StatCell value={stats.uniquePeaks} label={t.ascents_stat_peaks} />
          <StatCell value={stats.totalPhotos} label={t.profile_stat_photos} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: "var(--top-nav-h, 48px)", zIndex: 10,
        background: "white",
      }}>
        {(["ascents", "peaks", "photos"] as Tab[]).map((id) => {
          const label = id === "ascents" ? t.nav_ascents : id === "peaks" ? t.profile_tab_peaks : t.field_photos;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, padding: "12px 4px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                color: tab === id ? "#0369a1" : "#6b7280",
                borderBottom: tab === id ? "2px solid #0369a1" : "2px solid transparent",
                transition: "color 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: "16px" }}>
        {tab === "ascents" && (
          <AscentsTab ascents={ascents} dateLocale={t.dateLocale} noAscents={t.profile_noAscents} />
        )}
        {tab === "peaks" && (
          <PeaksTab peaks={peaks} dateLocale={t.dateLocale} timesClimbed={t.profile_timesClimbed} />
        )}
        {tab === "photos" && (
          <PhotosTab photos={photos} />
        )}
      </div>

      {/* ── Edit modal ── */}
      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setUser(updated);
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ── Stat cell ────────────────────────────────────────────────────────────────

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      background: "white", textAlign: "center",
      padding: "12px 8px",
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{label}</div>
    </div>
  );
}

// ── Ascents tab ───────────────────────────────────────────────────────────────

function AscentsTab({ ascents, dateLocale, noAscents }: {
  ascents: Ascent[];
  dateLocale: string;
  noAscents: string;
}) {
  if (ascents.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 16px", color: "#9ca3af", fontSize: 14 }}>
        {noAscents}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ascents.map((a) => (
        <Link key={a.id} href={`/ascents/${a.id}`} style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", gap: 12, alignItems: "center",
            background: "white", border: "1px solid #e5e7eb",
            borderRadius: 12, padding: "10px 12px",
            transition: "border-color 0.15s",
          }}>
            {/* Thumbnail */}
            <div style={{
              width: 56, height: 56, borderRadius: 8,
              background: "#f3f4f6", flexShrink: 0, overflow: "hidden",
            }}>
              {a.firstPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.firstPhoto.url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>
                  🏔
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 2 }}>
                {a.peakName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#0369a1",
                  background: "#eff6ff", borderRadius: 20, padding: "1px 6px",
                }}>
                  {a.altitudeM.toLocaleString(dateLocale)} m
                </span>
                {a.mountainRange && (
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{a.mountainRange}</span>
                )}
              </div>
            </div>

            {/* Date + photo count */}
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {new Date(a.date).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
              </div>
              {a.photoCount > 0 && (
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  📷 {a.photoCount}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Peaks tab ────────────────────────────────────────────────────────────────

function PeaksTab({ peaks, dateLocale, timesClimbed }: {
  peaks: Peak[];
  dateLocale: string;
  timesClimbed: string;
}) {
  if (peaks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 16px", color: "#9ca3af", fontSize: 14 }}>
        —
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {peaks.map((pk) => (
        <div key={pk.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "white", border: "1px solid #e5e7eb",
          borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{pk.name}</div>
            {pk.mountainRange && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{pk.mountainRange}</div>
            )}
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, color: "#0369a1",
            background: "#eff6ff", borderRadius: 20, padding: "2px 8px",
            flexShrink: 0,
          }}>
            {pk.altitudeM.toLocaleString(dateLocale)} m
          </span>
          {pk.count > 1 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#6b7280",
              background: "#f3f4f6", borderRadius: 20, padding: "2px 7px",
              flexShrink: 0,
            }}>
              {i(timesClimbed, { n: pk.count })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Photos tab ───────────────────────────────────────────────────────────────

function PhotosTab({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 16px", color: "#9ca3af", fontSize: 14 }}>
        —
      </div>
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 3,
    }}>
      {photos.map((p) => (
        <Link key={p.id} href={`/ascents/${p.ascentId}`} style={{ textDecoration: "none" }}>
          <div style={{ aspectRatio: "1", overflow: "hidden", background: "#f3f4f6", borderRadius: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────

function EditProfileModal({
  user,
  onClose,
  onSaved,
}: {
  user: { name: string; username: string | null; bio: string | null; avatarUrl: string | null };
  onClose: () => void;
  onSaved: (updated: { name: string; username: string | null; bio: string | null; avatarUrl: string | null }) => void;
}) {
  const t = useT();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCropFile(file);
  }, []);

  const handleCropDone = useCallback(async (blob: Blob) => {
    setCropFile(null);
    setUploadingAvatar(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/settings/avatar", { method: "POST", body: fd });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* ignore parse error */ }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.settings_failedToSave);
        return;
      }
      const newUrl = (data.avatarUrl as string) + `?v=${Date.now()}`;
      setAvatarUrl(newUrl);
      // Refresh the NavBar immediately after avatar is saved
      startTransition(() => router.refresh());
    } catch {
      setError(t.settings_failedToSave);
    } finally {
      setUploadingAvatar(false);
    }
  }, [t, router, startTransition]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : t.settings_failedToSave);
      return;
    }
    onSaved({
      name: name.trim(),
      username: username.trim() || null,
      bio: bio.trim() || null,
      avatarUrl,
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px",
    border: "1px solid #d1d5db", borderRadius: 8,
    fontSize: 16, color: "#111827",
    outline: "none", boxSizing: "border-box",
    background: "white",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "#374151", marginBottom: 5,
  };

  return (
    <>
    {cropFile && (
      <AvatarCropModal
        file={cropFile}
        onCrop={handleCropDone}
        onCancel={() => setCropFile(null)}
      />
    )}
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 0 env(safe-area-inset-bottom)",
      }}
    >
      {/* Sheet */}
      <div style={{
        width: "100%", maxWidth: 480,
        background: "white",
        borderRadius: "16px 16px 0 0",
        padding: "20px 20px 28px",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: "#d1d5db", margin: "0 auto 20px",
        }} />

        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
          {t.profile_editProfile}
        </h2>

        {/* Avatar picker */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              position: "relative", width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
              border: "none", cursor: uploadingAvatar ? "default" : "pointer",
              padding: 0, overflow: "hidden",
              boxShadow: "0 0 0 3px white, 0 0 0 4px #bfdbfe",
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 700, color: "white" }}>
                {initials(name || user.name)}
              </span>
            )}
            {/* Overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: uploadingAvatar ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {uploadingAvatar ? (
                <span style={{ fontSize: 18 }}>⏳</span>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>{t.settings_name}</label>
            <input
              type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100} style={inputStyle}
            />
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>
              {t.settings_username}
              <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>({t.optional})</span>
            </label>
            <input
              type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20} placeholder="@username"
              style={inputStyle}
            />
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>
              {t.profile_bio}
              <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>({t.optional})</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3} maxLength={200}
              placeholder={t.profile_bioPlaceholder}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>

        {error && (
          <p style={{
            fontSize: 13, color: "#dc2626", background: "#fef2f2",
            border: "1px solid #fecaca", borderRadius: 8,
            padding: "8px 12px", margin: "16px 0 0",
          }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose} disabled={saving}
            style={{
              flex: 1, padding: "10px 16px",
              border: "1px solid #e5e7eb", background: "white",
              color: "#374151", borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave} disabled={saving || !name.trim() || uploadingAvatar}
            style={{
              flex: 2, padding: "10px 16px",
              background: "#0369a1", color: "white",
              border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              opacity: (saving || !name.trim() || uploadingAvatar) ? 0.6 : 1,
            }}
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
