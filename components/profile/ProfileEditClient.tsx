"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { AvatarCropModal } from "@/components/photos/AvatarCropModal";

type InitialUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: "#9ca3af",
      textTransform: "uppercase", letterSpacing: "0.06em",
      margin: "28px 0 8px 4px",
    }}>
      {label}
    </p>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "white", border: "1px solid #e5e7eb",
      borderRadius: "var(--radius-lg)", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #d1d5db", borderRadius: "var(--radius-md)",
  fontSize: 15, color: "#111827",
  outline: "none", boxSizing: "border-box",
  background: "white",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#374151", marginBottom: 5,
};

export function ProfileEditClient({ initialUser }: { initialUser: InitialUser }) {
  const t = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(initialUser.name);
  const [username, setUsername] = useState(initialUser.username ?? "");
  const [bio, setBio] = useState(initialUser.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.settings_failedToSave);
        return;
      }
      setAvatarUrl((data.avatarUrl as string) + `?v=${Date.now()}`);
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
    setSaved(false);
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    startTransition(() => router.refresh());
  }

  const dirty =
    name.trim() !== initialUser.name ||
    (username.trim() || null) !== initialUser.username ||
    (bio.trim() || null) !== initialUser.bio;

  return (
    <>
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onCrop={handleCropDone}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Page header — matches Settings page style */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 16px", height: 56,
        borderBottom: "1px solid #f3f4f6",
        background: "white",
        position: "sticky", top: "var(--top-nav-h, 0px)", zIndex: 10,
      }}>
        <Link href="/bitacora" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: "50%",
          color: "#374151", textDecoration: "none",
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>
          {t.nav_profile}
        </h1>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 48px" }}>

        <SectionHeader label={t.nav_profile} />

        {/* Avatar + identity card */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 16px" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                position: "relative", width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
                border: "none", cursor: uploadingAvatar ? "default" : "pointer",
                padding: 0, overflow: "hidden", flexShrink: 0,
                boxShadow: "0 0 0 3px white, 0 0 0 4px #bfdbfe",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 26, fontWeight: 700, color: "white" }}>
                  {initials((name || initialUser.name))}
                </span>
              )}
              <div style={{
                position: "absolute", inset: 0,
                background: uploadingAvatar ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {uploadingAvatar ? (
                  <span style={{ fontSize: 18 }}>⏳</span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </div>
            </button>
            <input
              ref={fileInputRef} type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>{name || initialUser.name}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{initialUser.email}</div>
              {username && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>@{username}</div>}
            </div>
          </div>
        </Card>

        <SectionHeader label={t.profile_editProfile} />

        {/* Edit fields */}
        <Card>
          <div style={{ padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
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
        </Card>

        {error && (
          <p style={{
            fontSize: 13, color: "#dc2626", background: "#fef2f2",
            border: "1px solid #fecaca", borderRadius: "var(--radius-md)",
            padding: "8px 12px", margin: "12px 0 0",
          }}>{error}</p>
        )}

        {saved && (
          <p style={{
            fontSize: 13, color: "#16a34a", background: "#f0fdf4",
            border: "1px solid #bbf7d0", borderRadius: "var(--radius-md)",
            padding: "8px 12px", margin: "12px 0 0",
          }}>✓ {t.save}</p>
        )}

        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !dirty || uploadingAvatar}
            style={{
              width: "100%", padding: "11px 16px",
              background: "#0369a1", color: "white",
              border: "none", borderRadius: "var(--radius-md)",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              opacity: (saving || !name.trim() || !dirty || uploadingAvatar) ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </>
  );
}
