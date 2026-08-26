"use client";

// Cuenta propia: cambio de contraseña. Ported from voces-bds's
// app/admin/cuenta/page.tsx, con dos cambios:
//  - Vive en /voces/cuenta, no /voces/admin/cuenta: esto es para cualquier
//    usuario logueado, no solo admins, así que no tiene sentido colgarlo de
//    /admin (BDS lo pone ahí por historia, no porque sea admin-only — su
//    propio guard usa getSession, no getAdmin).
//  - /api/auth/me -> useAuth() (este repo no tiene el endpoint legacy
//    /api/auth/me; el estado de sesión ya viene de AuthContext).

import { useState } from "react";
import { useAuth } from "@/app/voces/components/AuthContext";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "@/lib/voces-password";

export default function CuentaPage() {
  const { client, isAdmin, loading } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    if (next !== repeat) {
      setError("La contraseña nueva y su repetición no coinciden.");
      return;
    }
    // Misma función que usa el server: el usuario ve el error sin esperar el round-trip.
    const check = validateNewPassword(current, next);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/voces/client/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "No se pudo cambiar la contraseña");
      setOkMsg("Contraseña actualizada.");
      setCurrent(""); setNext(""); setRepeat("");
    } catch (err: any) {
      setError(err?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="p-6 text-[13px]" style={{ color: "var(--color-text-muted)" }}>Cargando…</main>;
  }
  if (!client) {
    return <main className="p-6 text-[13px]" style={{ color: "var(--color-text-muted)" }}>Iniciá sesión para ver tu cuenta.</main>;
  }

  return (
    <main className="p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-[20px] font-[600]" style={{ color: "var(--color-text-primary)" }}>Mi cuenta</h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {client.name || client.email}
          {isAdmin && (
            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}>admin</span>
          )}
        </p>
      </header>

      <section className="ds-card p-5 max-w-[420px] flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-[500]" style={{ color: "var(--color-text-primary)" }}>Cambiar contraseña</h2>
          <p className="text-[12px] mt-1" style={{ color: "var(--color-text-muted)" }}>
            Mínimo {MIN_PASSWORD_LENGTH} caracteres. Si te la asignaron, cambiala ahora.
          </p>
        </div>

        {error && (
          <p className="text-[12px] px-3 py-2 rounded-lg"
            style={{ color: "var(--color-accent)", background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)" }}>
            {error}
          </p>
        )}
        {okMsg && (
          <p className="text-[12px] px-3 py-2 rounded-lg"
            style={{ color: "#4ce8c8", background: "rgba(76,232,200,0.08)", border: "0.5px solid rgba(76,232,200,0.25)" }}>
            {okMsg}
          </p>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Contraseña actual
            </span>
            <input type="password" autoComplete="current-password" value={current}
              onChange={(e) => setCurrent(e.target.value)} className="ds-input" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Contraseña nueva
            </span>
            <input type="password" autoComplete="new-password" value={next}
              onChange={(e) => setNext(e.target.value)} className="ds-input" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-[600] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Repetir contraseña nueva
            </span>
            <input type="password" autoComplete="new-password" value={repeat}
              onChange={(e) => setRepeat(e.target.value)} className="ds-input" />
          </label>

          <button type="submit" disabled={saving} className="ds-btn-primary text-[13px] px-4 py-2 mt-1 disabled:opacity-50">
            {saving ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </form>

        <p className="text-[11px] pt-3" style={{ color: "var(--color-text-muted)", borderTop: "0.5px solid var(--color-border-default)" }}>
          Cambiar la contraseña no cierra las sesiones ya abiertas en otros dispositivos.
        </p>
      </section>
    </main>
  );
}
