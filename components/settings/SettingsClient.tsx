"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LOCALE_OPTIONS } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserSettings = {
  id: string; name: string; email: string; username: string | null; language: string;
  appearInSearch: boolean; allowOthersToTag: boolean;
  emailNotifications: boolean; activityNotifications: boolean;
  hasPassword: boolean; googleLinked: boolean;
};

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid";
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoogleIcon({ size = 20, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill={color ?? "#4285F4"} />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill={color ?? "#34A853"} />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill={color ?? "#FBBC05"} />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill={color ?? "#EA4335"} />
    </svg>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!value)}
      aria-checked={value} role="switch"
      style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: value ? "#0369a1" : "#d1d5db",
        border: "none", cursor: disabled ? "default" : "pointer",
        position: "relative", transition: "background 0.2s", opacity: disabled ? 0.5 : 1,
      }}>
      <span style={{
        position: "absolute", top: 3, left: value ? 21 : 3,
        width: 20, height: 20, borderRadius: "50%", background: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
        transition: "left 0.18s cubic-bezier(0.34,1.56,0.64,1)", display: "block",
      }} />
    </button>
  );
}

function SettingsRow({ label, description, children, last }: { label: string; description?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      padding: "14px 16px", borderBottom: last ? "none" : "1px solid #f3f4f6", minHeight: 52,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0, lineHeight: 1.3 }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0", lineHeight: 1.4 }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "28px 0 8px 4px" }}>{label}</p>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>{children}</div>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsClient({ initialUser }: { initialUser: UserSettings }) {
  const { t, locale, setLocale } = useI18n();
  const [settings, setSettings] = useState(initialUser);
  // Account form
  const [name, setName] = useState(initialUser.name);
  const [username, setUsername] = useState(initialUser.username ?? "");
  const [usernameState, setUsernameState] = useState<UsernameState>("idle");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Password form
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Language picker
  const [langOpen, setLangOpen] = useState(false);
  const currentLangOption = LOCALE_OPTIONS.find(o => o.value === locale);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Connected accounts
  const [googleLinked, setGoogleLinked] = useState(initialUser.googleLinked);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);

  // Username validation
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === (initialUser.username ?? "")) { setUsernameState("idle"); return; }
    if (!USERNAME_RE.test(trimmed)) { setUsernameState("invalid"); return; }
    setUsernameState("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/settings/check-username?username=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setUsernameState(data.available ? "available" : "taken");
      } catch { setUsernameState("idle"); }
    }, 400);
    return () => clearTimeout(timer);
  }, [username, initialUser.username]);

  async function saveAccount() {
    if (usernameState === "taken" || usernameState === "invalid") return;
    setAccountSaving(true); setAccountError(null); setAccountSuccess(false);
    const res = await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), username: username.trim() || null }),
    });
    const data = await res.json();
    setAccountSaving(false);
    if (!res.ok) { setAccountError(data.error ?? t.settings_failedToSave); }
    else {
      setSettings((s) => ({ ...s, name: data.name, username: data.username }));
      setAccountSuccess(true);
      setTimeout(() => setAccountSuccess(false), 2500);
    }
  }

  const saveToggle = useCallback(async (field: keyof UserSettings, value: boolean) => {
    setSettings((s) => ({ ...s, [field]: value }));
    await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }, []);

  async function saveLanguage(newLocale: Locale) {
    setLocale(newLocale); // immediate UI update
    await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLocale }),
    });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwError(null);
    if (newPw !== confirmPw) { setPwError(t.settings_passwordsDontMatch); return; }
    if (newPw.length < 8) { setPwError(t.settings_passwordTooShort); return; }
    setPwSaving(true);
    const res = await fetch("/api/settings/password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (!res.ok) { setPwError(data.error ?? t.settings_failedToSave); }
    else {
      setPwSuccess(true); setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setPwSuccess(false); setPwOpen(false); }, 2000);
    }
  }

  async function unlinkGoogle() {
    setUnlinkConfirmOpen(false);
    setUnlinkingGoogle(true); setUnlinkError(null);
    const res = await fetch("/api/settings/accounts/google", { method: "DELETE" });
    setUnlinkingGoogle(false);
    if (res.ok) setGoogleLinked(false);
    else setUnlinkError(t.settings_unlinkGoogleNeedPassword);
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE" && deleteConfirm !== "ELIMINAR" && deleteConfirm !== "LÖSCHEN" && deleteConfirm !== "SUPPRIMER") return;
    setDeleting(true);
    await fetch("/api/settings/account", { method: "DELETE" });
    signOut({ callbackUrl: "/login" });
  }

  // Flexible delete confirm word based on locale
  const deleteWord = locale === "es" ? "ELIMINAR" : locale === "ca" ? "ELIMINAR" : locale === "fr" ? "SUPPRIMER" : locale === "de" ? "LÖSCHEN" : "DELETE";
  const canDeleteConfirm = deleteConfirm === deleteWord;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "var(--radius-sm)",
    fontSize: 16, color: "#111827", outline: "none", boxSizing: "border-box", background: "white",
  };

  const usernameIndicator = () => {
    if (usernameState === "idle") return null;
    if (usernameState === "checking") return <span style={{ fontSize: 12, color: "#9ca3af" }}>{t.settings_usernameChecking}</span>;
    if (usernameState === "available") return <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>{t.settings_usernameAvailable}</span>;
    if (usernameState === "taken") return <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{t.settings_usernameTaken}</span>;
    if (usernameState === "invalid") return <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>{t.settings_usernameInvalid}</span>;
  };

  const canSaveAccount = name.trim() && usernameState !== "taken" && usernameState !== "invalid" && usernameState !== "checking";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 56px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 2px", letterSpacing: "-0.02em" }}>{t.settings_title}</h1>
      <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{t.settings_subtitle}</p>

      {/* Language */}
      <SectionHeader label={t.settings_language} />
      <Card>
        {/* Collapsed row — always visible, shows active language */}
        <button type="button" onClick={() => setLangOpen(o => !o)} style={{
          display: "flex", alignItems: "center", gap: 12,
          width: "100%", padding: "0 16px", height: 52,
          background: "none", border: "none", cursor: "pointer",
          borderBottom: langOpen ? "1px solid #f3f4f6" : "none",
          textAlign: "left",
        }}>
          {currentLangOption && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentLangOption.flagImg} alt={currentLangOption.name} style={{ width: 20, height: 14, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>{currentLangOption?.name}</span>
          <span style={{ fontSize: 11, color: "#9ca3af", transform: langOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        </button>

        {/* Expanded options */}
        {langOpen && LOCALE_OPTIONS.map(({ value, flagImg, name }, idx) => {
          const active = locale === value;
          return (
            <button key={value} onClick={() => { saveLanguage(value); setLangOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "0 16px", height: 48,
              background: "none", border: "none", cursor: "pointer",
              borderBottom: idx < LOCALE_OPTIONS.length - 1 ? "1px solid #f3f4f6" : "none",
              textAlign: "left", transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagImg} alt={name} style={{ width: 20, height: 14, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: active ? 600 : 400, color: active ? "#0369a1" : "#111827" }}>
                {name}
              </span>
              {active && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </Card>

      {/* Account */}
      <SectionHeader label={t.settings_account} />
      <Card>
        {/* Username */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t.settings_username}</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: 12, fontSize: 14, color: "#9ca3af", fontWeight: 500, pointerEvents: "none" }}>@</span>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username" maxLength={20} autoComplete="off" autoCapitalize="none"
              style={{ ...inputStyle, paddingLeft: 28, borderColor: usernameState === "taken" || usernameState === "invalid" ? "#fca5a5" : usernameState === "available" ? "#86efac" : "#d1d5db" }} />
          </div>
          <div style={{ minHeight: 20, marginTop: 4 }}>{usernameIndicator()}</div>
        </div>

        {/* Name */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t.settings_name}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} style={inputStyle} />
        </div>

        {/* Email */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t.settings_email}</label>
          <input type="email" value={settings.email} readOnly style={{ ...inputStyle, background: "#f9fafb", color: "#6b7280", cursor: "default" }} />
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{t.settings_emailNote}</p>
        </div>

        {/* Save */}
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          {accountSuccess && <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>{t.settings_saved}</span>}
          {accountError && <span style={{ fontSize: 13, color: "#dc2626" }}>{accountError}</span>}
          <button onClick={saveAccount} disabled={!canSaveAccount || accountSaving}
            style={{
              marginLeft: "auto", padding: "9px 20px", background: "#111827", color: "white",
              border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600,
              cursor: canSaveAccount && !accountSaving ? "pointer" : "default",
              opacity: canSaveAccount && !accountSaving ? 1 : 0.45, transition: "opacity 0.15s",
            }}>
            {accountSaving ? t.saving : t.settings_saveChanges}
          </button>
        </div>
      </Card>

      {/* Connected accounts */}
      <SectionHeader label={t.settings_connectedAccounts} />
      <Card>
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <GoogleIcon />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>
              {googleLinked ? t.settings_googleConnected : t.settings_googleNotConnected}
            </p>
            {!googleLinked && (
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{settings.email}</p>
            )}
            {unlinkError && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: "4px 0 0" }}>{unlinkError}</p>
            )}
          </div>
          {googleLinked && (
            initialUser.hasPassword ? (
              <button onClick={() => setUnlinkConfirmOpen(true)} disabled={unlinkingGoogle}
                style={{ padding: "7px 14px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: unlinkingGoogle ? "default" : "pointer", opacity: unlinkingGoogle ? 0.5 : 1, flexShrink: 0 }}>
                {unlinkingGoogle ? "…" : t.settings_unlinkGoogle}
              </button>
            ) : (
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, maxWidth: 160, textAlign: "right", lineHeight: 1.4 }}>
                {t.settings_unlinkGoogleNeedPassword}
              </p>
            )
          )}
        </div>
      </Card>

      {/* Password — hidden for Google-only users */}
      {initialUser.hasPassword && <div style={{ marginTop: 10 }}>
        <Card>
          <button type="button" onClick={() => { setPwOpen((o) => !o); setPwError(null); setPwSuccess(false); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "14px 16px", background: "none", border: "none",
              cursor: "pointer", textAlign: "left", borderBottom: pwOpen ? "1px solid #f3f4f6" : "none",
            }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>{t.settings_changePassword}</p>
              {!pwOpen && <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{t.settings_changePasswordDesc}</p>}
              {!pwOpen && googleLinked && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-full)", padding: "3px 8px" }}>
                  <GoogleIcon size={11} color="#15803d" />
                  <span style={{ fontSize: 11, color: "#15803d", fontWeight: 500 }}>{t.settings_changePasswordGoogleNote}</span>
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, color: "#9ca3af", transform: pwOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
          </button>
          {pwOpen && (
            <form onSubmit={changePassword} style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t.settings_currentPassword}</label>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required style={inputStyle} autoComplete="current-password" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t.settings_newPassword}</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} style={inputStyle} autoComplete="new-password" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{t.settings_confirmPassword}</label>
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required
                  style={{ ...inputStyle, borderColor: confirmPw && confirmPw !== newPw ? "#fca5a5" : "#d1d5db" }} autoComplete="new-password" />
              </div>
              {pwError && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{pwError}</p>}
              {pwSuccess && <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 600, margin: 0 }}>{t.settings_passwordChanged}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button type="button" onClick={() => { setPwOpen(false); setPwError(null); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
                  style={{ padding: "9px 16px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {t.cancel}
                </button>
                <button type="submit" disabled={pwSaving}
                  style={{ padding: "9px 20px", background: "#111827", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: pwSaving ? "default" : "pointer", opacity: pwSaving ? 0.5 : 1 }}>
                  {pwSaving ? t.saving : t.settings_changePassword}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>}

      {/* Privacy */}
      <SectionHeader label={t.settings_privacy} />
      <Card>
        <SettingsRow label={t.settings_appearInSearch} description={t.settings_appearInSearchDesc}>
          <Toggle value={settings.appearInSearch} onChange={(v) => saveToggle("appearInSearch", v)} />
        </SettingsRow>
        <SettingsRow label={t.settings_allowTagging} last>
          <Toggle value={settings.allowOthersToTag} onChange={(v) => saveToggle("allowOthersToTag", v)} />
        </SettingsRow>
      </Card>

      {/* Notifications */}
      <SectionHeader label={t.settings_notifications} />
      <Card>
        <SettingsRow label={t.settings_emailNotif} description={t.settings_emailNotifDesc}>
          <Toggle value={settings.emailNotifications} onChange={(v) => saveToggle("emailNotifications", v)} />
        </SettingsRow>
        <SettingsRow label={t.settings_activityNotif} description={t.settings_activityNotifDesc} last>
          <Toggle value={settings.activityNotifications} onChange={(v) => saveToggle("activityNotifications", v)} />
        </SettingsRow>
      </Card>

      {/* Danger zone */}
      <SectionHeader label={t.settings_dangerZone} />
      <Card>
        <SettingsRow label={t.settings_signOut} description={t.settings_signOutDesc}>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ padding: "8px 16px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {t.settings_signOut}
          </button>
        </SettingsRow>
        <div style={{ padding: "14px 16px", borderTop: "1px solid #f3f4f6" }}>
          {!deleteOpen ? (
            <button type="button" onClick={() => setDeleteOpen(true)}
              style={{ width: "100%", padding: "10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {t.settings_deleteAccount}
            </button>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, margin: "0 0 4px" }}>{t.settings_deletePermanent}</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.5 }}>
                {t.settings_deleteWarning.replace("DELETE", deleteWord).replace("ELIMINAR", deleteWord).replace("LÖSCHEN", deleteWord).replace("SUPPRIMER", deleteWord)}
              </p>
              <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={t.settings_deleteConfirmPlaceholder.replace("DELETE", deleteWord).replace("ELIMINAR", deleteWord).replace("LÖSCHEN", deleteWord).replace("SUPPRIMER", deleteWord)}
                style={{ ...inputStyle, borderColor: "#fca5a5", marginBottom: 12, fontFamily: "monospace" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}
                  style={{ flex: 1, padding: "10px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {t.cancel}
                </button>
                <button type="button" onClick={deleteAccount} disabled={!canDeleteConfirm || deleting}
                  style={{
                    flex: 1, padding: "10px", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600,
                    background: canDeleteConfirm ? "#dc2626" : "#fef2f2",
                    color: canDeleteConfirm ? "white" : "#fca5a5",
                    cursor: canDeleteConfirm && !deleting ? "pointer" : "default",
                    transition: "background 0.2s, color 0.2s",
                  }}>
                  {deleting ? t.settings_deleting : t.settings_deleteConfirmButton}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Unlink Google confirmation bottom sheet */}
      {unlinkConfirmOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
          <div onClick={() => setUnlinkConfirmOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "white", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
            padding: "24px 20px 36px", maxWidth: 480, margin: "0 auto",
          }}>
            <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: "var(--radius-full)", margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <GoogleIcon size={22} />
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                {t.settings_unlinkGoogle}
              </p>
            </div>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: "0 0 16px" }}>
              {t.settings_unlinkGoogleConfirmNeutral}
            </p>
            {initialUser.hasPassword ? (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: 24 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>🔑</span>
                <p style={{ fontSize: 13, color: "#15803d", margin: 0, lineHeight: 1.5 }}>{t.settings_unlinkGoogleHasPassword}</p>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: 24 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>⚠️</span>
                <p style={{ fontSize: 13, color: "#dc2626", margin: 0, lineHeight: 1.5 }}>{t.settings_unlinkGoogleNoPassword}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setUnlinkConfirmOpen(false)}
                style={{ flex: 1, padding: "12px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {t.cancel}
              </button>
              <button onClick={unlinkGoogle} disabled={unlinkingGoogle}
                style={{ flex: 1, padding: "12px", background: "#111827", color: "white", border: "none", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 600, cursor: unlinkingGoogle ? "default" : "pointer", opacity: unlinkingGoogle ? 0.6 : 1 }}>
                {unlinkingGoogle ? "…" : t.settings_unlinkGoogle}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
