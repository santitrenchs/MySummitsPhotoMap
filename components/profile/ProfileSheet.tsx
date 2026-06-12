"use client";

import { useState, useRef, useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";
import { AvatarCropModal } from "@/components/photos/AvatarCropModal";

type UserData = {
  name: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

type Props = {
  onClose: () => void;
};

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

export function ProfileSheet({ onClose }: Props) {
  const t = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Editing state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Fetch profile on open
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const u: UserData = {
          name: data.name ?? "",
          username: data.username ?? null,
          bio: data.bio ?? null,
          avatarUrl: data.avatarUrl ?? null,
        };
        setUser(u);
        setName(u.name);
        setUsername(u.username ?? "");
        setBio(u.bio ?? "");
        setAvatarUrl(u.avatarUrl);
      })
      .finally(() => setLoading(false));
  }, []);

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
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.settings_failedToSave);
        return;
      }
      const newUrl = (data.avatarUrl as string) + `?v=${Date.now()}`;
      setAvatarUrl(newUrl);
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
    const updated: UserData = {
      name: name.trim(),
      username: username.trim() || null,
      bio: bio.trim() || null,
      avatarUrl,
    };
    setUser(updated);
    setEditMode(false);
    startTransition(() => router.refresh());
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px",
    border: "1px solid #d1d5db", borderRadius: "var(--radius-md)",
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

      {/* Backdrop */}
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
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          padding: "20px 20px 28px",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
          maxHeight: "90svh",
          overflowY: "auto",
        }}>
          {/* Handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "#d1d5db", margin: "0 auto 20px",
          }} />

          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>…</div>
          ) : !editMode ? (
            /* ── View mode ── */
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
                {/* Avatar */}
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700, color: "white",
                  boxShadow: "0 0 0 3px white, 0 0 0 4px #bfdbfe",
                  overflow: "hidden",
                }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    initials(user?.name ?? "")
                  )}
                </div>

                {/* Name + username + bio */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                    {user?.name}
                  </div>
                  {user?.username && (
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                      @{user.username}
                    </div>
                  )}
                  {user?.bio && (
                    <div style={{
                      fontSize: 13, color: "#4b5563", marginTop: 6,
                      lineHeight: 1.5,
                    }}>
                      {user.bio}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setEditMode(true)}
                style={{
                  width: "100%", padding: "10px 16px",
                  border: "1px solid #d1d5db", background: "white",
                  color: "#374151", borderRadius: "var(--radius-md)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                {t.profile_editProfile}
              </button>
            </>
          ) : (
            /* ── Edit mode ── */
            <>
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
                      {initials((name || user?.name) ?? "")}
                    </span>
                  )}
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
                <div>
                  <label style={labelStyle}>{t.settings_name}</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>
                    {t.settings_username}
                    <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>({t.optional})</span>
                  </label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} placeholder="@username" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>
                    {t.profile_bio}
                    <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>({t.optional})</span>
                  </label>
                  <textarea
                    value={bio} onChange={(e) => setBio(e.target.value)}
                    rows={3} maxLength={200} placeholder={t.profile_bioPlaceholder}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>

              {error && (
                <p style={{
                  fontSize: 13, color: "#dc2626", background: "#fef2f2",
                  border: "1px solid #fecaca", borderRadius: "var(--radius-md)",
                  padding: "8px 12px", margin: "16px 0 0",
                }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => { setEditMode(false); setError(null); }}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "10px 16px",
                    border: "1px solid #e5e7eb", background: "white",
                    color: "#374151", borderRadius: "var(--radius-md)",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || uploadingAvatar}
                  style={{
                    flex: 2, padding: "10px 16px",
                    background: "#0369a1", color: "white",
                    border: "none", borderRadius: "var(--radius-md)",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    opacity: (saving || !name.trim() || uploadingAvatar) ? 0.6 : 1,
                  }}
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
