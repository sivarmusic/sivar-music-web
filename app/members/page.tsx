"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HeaderNav from "@/app/components/HeaderNav";

export default function MembersLoginPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.toLowerCase().trim(), password }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/${data.slug}`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Error al iniciar sesión");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <HeaderNav logoPriority />
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#040404] px-6">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04)_0%,transparent_55%)]" />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <span className="text-lg">🔐</span>
            </div>
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.36em] text-white/35">
                Sivar Music Group
              </p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.04em] text-white">
                Members
              </h1>
            </div>
            <p className="text-[0.7rem] text-white/40">
              Acceso exclusivo para creadores
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <label className="text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-white/40">
                Usuario
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setError(""); }}
                placeholder="tu nombre de usuario"
                autoComplete="username"
                autoCapitalize="none"
                className="w-full rounded-2xl border border-white/10 bg-white/4 px-5 py-3.5 text-sm font-medium text-white placeholder-white/20 outline-none transition focus:border-white/25 focus:bg-white/6"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-white/40">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/10 bg-white/4 px-5 py-3.5 text-sm font-medium text-white placeholder-white/20 outline-none transition focus:border-white/25 focus:bg-white/6"
              />
            </div>

            {error && (
              <p className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-red-400/80">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !slug || !password}
              className="mt-1 w-full rounded-2xl bg-white py-3.5 text-[0.78rem] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white/90 disabled:opacity-40"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-[0.62rem] text-white/20">
            Acceso restringido a miembros del equipo Sivar
          </p>
        </div>
      </main>
    </>
  );
}
