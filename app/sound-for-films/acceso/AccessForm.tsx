"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccessForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/sound-for-films/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No pudimos validar el acceso");
        setPassword("");
        return;
      }

      router.replace("/sound-for-films");
      router.refresh();
    } catch {
      setError("No pudimos validar el acceso");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col items-center gap-4">
      <input
        type="password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setError("");
        }}
        placeholder="Contraseña"
        autoFocus
        autoComplete="current-password"
        className="w-64 rounded-full border border-white/14 bg-white/5 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.22em] text-white placeholder-white/25 outline-none transition focus:border-white/35 focus:bg-white/8"
      />

      {error ? (
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-red-400/80">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-3 rounded-full border border-white/14 bg-black/35 px-7 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white transition hover:border-white/32 hover:bg-black/52 disabled:opacity-50"
      >
        {isSubmitting ? "Validando" : "Entrar"}
      </button>
    </form>
  );
}
