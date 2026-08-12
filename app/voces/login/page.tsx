"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/app/voces/components/I18n";
import { useAuth } from "@/app/voces/components/AuthContext";

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { refresh } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/voces/client/me", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled && j?.client) {
          const next = searchParams?.get("next") || "/voces";
          router.replace(next);
          return;
        }
      } catch {}
      if (!cancelled) setCheckingSession(false);
    })();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setErrorField(null);
    setLoading(true);
    try {
      const res = await fetch("/api/voces/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        if (j?.code === "EMAIL_NOT_FOUND") setErrorField("email");
        else if (j?.code === "WRONG_PASSWORD") setErrorField("password");
        setError(j?.error || "Credenciales inválidas");
        setLoading(false);
        return;
      }
      await refresh();
      const next = searchParams?.get("next") || "/voces";
      router.push(next);
      router.refresh();
    } catch (err: any) {
      setError("No se pudo conectar. Probá de nuevo.");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </main>
    );
  }

  const inputBase = "w-full border rounded-lg px-3 py-2.5 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 transition [color-scheme:dark]";
  const inputOk = "border-white/10 bg-[#0d1117] focus:ring-brand-500/50 focus:border-brand-500";
  const inputErr = "border-red-500/50 bg-[#0d1117] focus:ring-red-500/40 focus:border-red-500";

  return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/SMG PNG.png"
            alt="Sivar Music"
            className="h-14 w-auto mx-auto rounded-xl mb-4 opacity-90"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Sivar Voces</p>
        </div>
        <form onSubmit={onSubmit} className="bg-[#161b22] p-8 rounded-2xl w-full border border-white/10" noValidate>
          <h1 className="text-xl font-bold mb-6 text-white">{t("loginTitle")}</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-400">{t("email")}</label>
              <input
                value={email}
                onChange={(e)=>{ setEmail(e.target.value); if (errorField === "email") { setError(null); setErrorField(null); } }}
                autoComplete="email"
                disabled={loading}
                className={`${inputBase} ${errorField === "email" ? inputErr : inputOk}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-400">{t("password")}</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e)=>{ setPassword(e.target.value); if (errorField === "password") { setError(null); setErrorField(null); } }}
                  autoComplete="current-password"
                  disabled={loading}
                  className={`${inputBase} pr-14 ${errorField === "password" ? inputErr : inputOk}`}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-200 transition-colors"
                  tabIndex={-1}
                >
                  {show ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 rounded"
                style={{ accentColor: "var(--color-accent)" }}
              />
              Mantenerme conectado por 30 días
            </label>
          </div>
          {error && <p className="text-red-400 text-sm mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">{error}</p>}
          <button
            disabled={loading}
            className="mt-6 w-full bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2.5 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Ingresando…
              </>
            ) : t("login")}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
