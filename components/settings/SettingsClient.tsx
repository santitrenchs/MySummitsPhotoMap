"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LOCALE_OPTIONS } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserSettings = {
  id: string; name: string; email: string; username: string | null; language: string;
  profilePublic: boolean; appearInSearch: boolean; reviewTagsBeforePost: boolean; allowOthersToTag: boolean;
  emailNotifications: boolean; activityNotifications: boolean;
  autoDetectFaces: boolean; autoSuggestPeople: boolean; reviewFacesBeforeSave: boolean;
};

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid";
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  return <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>{children}</div>;
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

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8,
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
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LOCALE_OPTIONS.map(({ value, label }) => (
              <button key={value} onClick={() => saveLanguage(value)}
                style={{
                  padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                  background: locale === value ? "#0369a1" : "#f3f4f6",
                  color: locale === value ? "white" : "#374151",
                  transition: "background 0.15s, color 0.15s",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
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
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: canSaveAccount && !accountSaving ? "pointer" : "default",
              opacity: canSaveAccount && !accountSaving ? 1 : 0.45, transition: "opacity 0.15s",
            }}>
            {accountSaving ? t.saving : t.settings_saveChanges}
          </button>
        </div>
      </Card>

      {/* Password */}
      <div style={{ marginTop: 10 }}>
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
                  style={{ padding: "9px 16px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {t.cancel}
                </button>
                <button type="submit" disabled={pwSaving}
                  style={{ padding: "9px 20px", background: "#111827", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: pwSaving ? "default" : "pointer", opacity: pwSaving ? 0.5 : 1 }}>
                  {pwSaving ? t.saving : t.settings_changePassword}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>

      {/* Privacy */}
      <SectionHeader label={t.settings_privacy} />
      <Card>
        <SettingsRow label={t.settings_profilePublic} description={t.settings_profilePublicDesc}>
          <Toggle value={settings.profilePublic} onChange={(v) => saveToggle("profilePublic", v)} />
        </SettingsRow>
        <SettingsRow label={t.settings_appearInSearch} description={t.settings_appearInSearchDesc}>
          <Toggle value={settings.appearInSearch} onChange={(v) => saveToggle("appearInSearch", v)} />
        </SettingsRow>
        <SettingsRow label={t.settings_reviewTags} description={t.settings_reviewTagsDesc}>
          <Toggle value={settings.reviewTagsBeforePost} onChange={(v) => saveToggle("reviewTagsBeforePost", v)} />
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

      {/* Photos & Tagging */}
      <SectionHeader label={t.settings_photosTagging} />
      <Card>
        <SettingsRow label={t.settings_autoDetect} description={t.settings_autoDetectDesc}>
          <Toggle value={settings.autoDetectFaces} onChange={(v) => saveToggle("autoDetectFaces", v)} />
        </SettingsRow>
        <SettingsRow label={t.settings_autoSuggest} description={t.settings_autoSuggestDesc}>
          <Toggle value={settings.autoSuggestPeople} onChange={(v) => saveToggle("autoSuggestPeople", v)} />
        </SettingsRow>
        <SettingsRow label={t.settings_reviewFaces} description={t.settings_reviewFacesDesc} last>
          <Toggle value={settings.reviewFacesBeforeSave} onChange={(v) => saveToggle("reviewFacesBeforeSave", v)} />
        </SettingsRow>
      </Card>

      {/* Danger zone */}
      <SectionHeader label={t.settings_dangerZone} />
      <Card>
        <SettingsRow label={t.settings_signOut} description={t.settings_signOutDesc}>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ padding: "8px 16px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {t.settings_signOut}
          </button>
        </SettingsRow>
        <div style={{ padding: "14px 16px", borderTop: "1px solid #f3f4f6" }}>
          {!deleteOpen ? (
            <button type="button" onClick={() => setDeleteOpen(true)}
              style={{ width: "100%", padding: "10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
                  style={{ flex: 1, padding: "10px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {t.cancel}
                </button>
                <button type="button" onClick={deleteAccount} disabled={!canDeleteConfirm || deleting}
                  style={{
                    flex: 1, padding: "10px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
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
    </div>
  );
}
