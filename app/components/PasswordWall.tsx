"use client";

import { useState, useEffect, type ReactNode } from "react";

const SESSION_KEY = "sff_access";
const CORRECT_PASSWORD = "sm2026";

export default function PasswordWall({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
    setReady(true);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,207,191,0.10)_0%,transparent_40%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-white/40">
          Sivar Music Group
        </p>

        <h1 className="text-[clamp(2.8rem,9vw,6rem)] font-black uppercase leading-[0.88] tracking-[-0.05em] text-white">
          Sound for Films
        </h1>

        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#d6cfbf]/60">
          Acceso restringido
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-2 flex flex-col items-center gap-4"
        >
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="Contraseña"
            autoFocus
            className="w-64 rounded-full border border-white/14 bg-white/5 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.22em] text-white placeholder-white/25 outline-none transition focus:border-white/35 focus:bg-white/8"
          />

          {error && (
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-red-400/80">
              Contraseña incorrecta
            </p>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-3 rounded-full border border-white/14 bg-black/35 px-7 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white transition hover:border-white/32 hover:bg-black/52"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
