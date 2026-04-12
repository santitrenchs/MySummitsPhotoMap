"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get("error") === "unauthorized";

  const [error, setError] = useState<string | null>(
    unauthorized ? "No tienes permisos de administrador." : null
  );
  const [loading, setLoading] = useState(false);

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
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    // Let the server-side layout verify isAdmin — redirects back here with
    // ?error=unauthorized if the user doesn't have admin rights
    router.push("/admin/users");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="mb-8 text-center">
        <div
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: "#1e293b", display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 22, marginBottom: 12,
          }}
        >
          ⚙️
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Backoffice</h1>
        <p className="mt-1 text-sm text-gray-500">MySummits · Administración</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "10px 16px",
            background: loading ? "#94a3b8" : "#1e293b",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Iniciando sesión…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#f1f5f9", padding: "0 16px",
      }}
    >
      <Suspense fallback={<div style={{ width: 448, height: 320, background: "white", borderRadius: 16 }} />}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
