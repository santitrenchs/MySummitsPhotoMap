"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { PeakadexLogo } from "@/components/brand/Logo";

// ── Design tokens (DESIGN.md) ─────────────────────────────────────────────────
const C = {
  navy:        "#0D2538",
  navyMid:     "#5A6E84",
  navyLight:   "#94A3B8",
  border:      "#E5E7EB",
  green:       "#2F7A5F",
  greenHover:  "#256650",
  blue:        "#0369a1",
  pageBg:      "#F4F7FA",
  surface:     "#f9fafb",
} as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  fontSize: 15,
  color: C.navy,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "var(--font-inter, sans-serif)",
  transition: "border-color 0.15s",
};

function InputField(props: React.InputHTMLAttributes<HTMLInputElement> & { inputRef?: React.Ref<HTMLInputElement> }) {
  const { inputRef, ...rest } = props;
  return (
    <input
      ref={inputRef}
      {...rest}
      style={{ ...inputStyle, ...rest.style }}
      onFocus={(e) => { e.currentTarget.style.borderColor = C.green; props.onFocus?.(e); }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = C.border; props.onBlur?.(e); }}
    />
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const t = useT();
  const justRegistered = searchParams.get("registered") === "1";
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError(t.auth_invalidCredentials);
      setLoading(false);
      return;
    }
    window.location.href = "/home";
  }

  return (
    <div style={{
      width: "100%", maxWidth: 420,
      background: "#fff",
      borderRadius: 20,
      border: `1px solid ${C.border}`,
      boxShadow: "0 4px 24px rgba(13,37,56,0.07)",
      padding: "36px 32px 32px",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        <PeakadexLogo height={38} iconScale={1.0} />
      </div>

      {/* Sign-up prompt */}
      <p style={{ fontSize: 13, color: C.navyMid, marginBottom: 24, textAlign: "center" }}>
        {t.auth_noAccount}{" "}
        <Link href="/register" style={{ color: C.green, fontWeight: 600, textDecoration: "none" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = "none")}
        >
          {t.auth_createOne}
        </Link>
      </p>

      {/* Just registered banner */}
      {justRegistered && (
        <div style={{
          marginBottom: 16, fontSize: 13, color: "#166534",
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          borderRadius: 10, padding: "10px 14px",
        }}>
          {t.auth_accountCreated}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <InputField
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.settings_email}
        />

        {/* Password with show/hide */}
        <div style={{ position: "relative" }}>
          <InputField
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder={t.auth_password}
            style={{ paddingRight: 46 }}
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", padding: 0, color: C.navyLight,
          }}>
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* Forgot password */}
        <div style={{ textAlign: "right", marginTop: -4 }}>
          <Link href="/forgot-password" style={{ fontSize: 13, color: C.navyMid, textDecoration: "none" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.navy)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.navyMid)}
          >
            {t.auth_forgotPassword}
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 13, color: "#dc2626",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "10px 14px",
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "14px 16px", marginTop: 4,
            background: loading ? C.navyLight : C.green,
            color: "#fff",
            border: "none", borderRadius: 14,
            fontSize: 15, fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 4px 14px rgba(47,122,95,0.32)",
            transition: "background 0.2s, box-shadow 0.2s",
            fontFamily: "var(--font-inter, sans-serif)",
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = C.greenHover; }}
          onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = C.green; }}
        >
          {loading ? t.auth_signingIn : t.auth_signIn}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 12, color: C.navyLight }}>o</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/home" })}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, padding: "12px 16px",
          border: `1px solid ${C.border}`, borderRadius: 12,
          background: "#fff", fontSize: 14, fontWeight: 500, color: C.navy,
          cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
          fontFamily: "var(--font-inter, sans-serif)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = C.surface;
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#fff";
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
        }}
      >
        <GoogleIcon />
        {t.auth_continueWithGoogle}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100svh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: C.pageBg,
      padding: "24px 16px",
    }}>
      <Suspense fallback={
        <div style={{ width: "100%", maxWidth: 420, height: 400, background: "#fff", borderRadius: 20, border: `1px solid ${C.border}` }} />
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
