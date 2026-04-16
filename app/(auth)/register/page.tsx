"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";

type Step = "voucher" | "form";

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();

  const [step, setStep] = useState<Step>("voucher");
  const [registrationToken, setRegistrationToken] = useState<string>("");

  // Voucher step state
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Form step state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Step A: verify voucher ────────────────────────────────────────────────
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVoucherError(null);
    setVerifying(true);

    try {
      const res = await fetch("/api/auth/validate-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVoucherError(data.error ?? t.auth_voucher_invalid);
        return;
      }

      setRegistrationToken(data.registrationToken);
      setStep("form");
    } catch {
      setVoucherError(t.auth_voucher_invalid);
    } finally {
      setVerifying(false);
    }
  }

  // ── Step B: register + auto-login ─────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, registrationToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Token expired → send back to voucher step
        if (res.status === 401) {
          setRegistrationToken("");
          setStep("voucher");
          setVoucherError(t.auth_voucher_tokenExpired);
          return;
        }
        setFormError(
          res.status === 409 ? t.auth_emailExists : (data.error ?? t.auth_registrationFailed)
        );
        return;
      }

      // Auto-login after successful registration
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        // Registration succeeded but auto-login failed — send to login
        router.push("/login?registered=1");
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setFormError(t.auth_registrationFailed);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Shared card wrapper ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 19 L8.5 7 L13 14 L17 9.5 L21 19 Z" fill="#dbeafe" stroke="#0369a1" strokeWidth="1.8" />
              <path d="M17 9.5 L19 6.5" stroke="#0369a1" strokeWidth="1.8" />
              <circle cx="19" cy="6" r="1.2" fill="#0369a1" />
            </svg>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0369a1", letterSpacing: "-0.03em", margin: 0 }}>AziTracks</h1>
          </div>
        </div>

        {step === "voucher" ? (
          // ── Voucher gate ────────────────────────────────────────────────
          <>
            <div className="mb-6 text-center">
              <p className="text-base font-semibold text-gray-900">{t.auth_voucher_title}</p>
              <p className="mt-1 text-sm text-gray-500">{t.auth_voucher_subtitle}</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setVoucherError(null);
                    setCode(e.target.value.toUpperCase());
                  }}
                  placeholder={t.auth_voucher_placeholder}
                  required
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                  style={{ borderColor: voucherError ? "#ef4444" : undefined }}
                />
                {voucherError && (
                  <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {voucherError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={verifying || !code.trim()}
                className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {verifying ? t.auth_voucher_verifying : t.auth_voucher_btn}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              {t.auth_voucher_noCode}
            </p>

            <p className="mt-4 text-center text-sm text-gray-500">
              {t.auth_haveAccount}{" "}
              <Link href="/login" className="text-primary-600 hover:underline font-medium">
                {t.auth_signIn}
              </Link>
            </p>
          </>
        ) : (
          // ── Registration form ────────────────────────────────────────────
          <>
            {/* Verified badge */}
            <div className="mb-6 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
                {t.auth_voucher_verified}
              </span>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t.auth_yourName}
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-400">{t.auth_nameHint}</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {t.settings_email}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setFormError(null); setEmail(e.target.value); }}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {t.auth_password}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-400">{t.auth_minPassword}</p>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? t.auth_creatingAccount : t.auth_createAccountSubmit}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              <button
                onClick={() => { setStep("voucher"); setFormError(null); }}
                className="text-gray-400 hover:underline text-xs"
              >
                ← {t.auth_voucher_btn}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
