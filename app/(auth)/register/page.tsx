"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useT } from "@/components/providers/I18nProvider";
import { PeakadexLogo } from "@/components/brand/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-suggest username from name while user hasn't manually edited it
  useEffect(() => {
    if (usernameEdited) return;
    const suggested = name.toLowerCase().trim()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30);
    setUsername(suggested);
  }, [name, usernameEdited]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(
          res.status === 409 && data.error === "Username already taken"
            ? t.auth_usernameTaken
            : res.status === 409
            ? t.auth_emailExists
            : (data.error ?? t.auth_registrationFailed)
        );
        return;
      }

      // Auto-login after successful registration
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PeakadexLogo height={38} iconScale={1.0} />
          </div>
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
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              {t.auth_username}
            </label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 14, color: "#6b7280", pointerEvents: "none",
              }}>@</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsernameEdited(true);
                  setFormError(null);
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                }}
                required
                autoComplete="username"
                minLength={3}
                maxLength={30}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ paddingLeft: 28 }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">{t.auth_usernameHint}</p>
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
          {t.auth_haveAccount}{" "}
          <Link href="/login" className="text-primary-600 hover:underline font-medium">
            {t.auth_signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
