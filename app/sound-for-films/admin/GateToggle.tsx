"use client";

import { useState } from "react";

type GateToggleProps = {
  initialEnabled: boolean;
  initialHasPassword: boolean;
};

export default function GateToggle({
  initialEnabled,
  initialHasPassword,
}: GateToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/sound-for-films/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({ kind: "error", text: data.error ?? "No se pudo guardar" });
        return null;
      }

      setEnabled(data.gate_enabled);
      setHasPassword(data.has_password);
      return data;
    } catch {
      setStatus({ kind: "error", text: "No se pudo guardar" });
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle() {
    const next = !enabled;
    const data = await patch({ gate_enabled: next });
    if (data) {
      setStatus({
        kind: "ok",
        text: next
          ? "Portfolio protegido con contraseña"
          : "Portfolio abierto — cualquiera con el link entra",
      });
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    const data = await patch({ password: newPassword });
    if (data) {
      setNewPassword("");
      setStatus({ kind: "ok", text: "Contraseña actualizada" });
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div className="flex items-center justify-between gap-6 rounded-2xl border border-white/12 bg-white/5 px-6 py-5">
        <div className="flex flex-col gap-1 text-left">
          <span className="text-sm font-semibold text-white">
            Contraseña {enabled ? "activada" : "desactivada"}
          </span>
          <span className="text-xs text-white/45">
            {enabled
              ? "Se pide contraseña para entrar"
              : "Cualquiera con el link puede ver el portfolio"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={isSaving}
          role="switch"
          aria-checked={enabled}
          aria-label="Proteger portfolio con contraseña"
          className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${
            enabled ? "bg-emerald-500/80" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
              enabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <form
        onSubmit={handlePasswordSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-white/12 bg-white/5 px-6 py-5"
      >
        <label
          htmlFor="sff-new-password"
          className="text-left text-sm font-semibold text-white"
        >
          {hasPassword ? "Cambiar contraseña" : "Definir contraseña"}
        </label>

        <input
          id="sff-new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          className="rounded-full border border-white/14 bg-black/40 px-5 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-white/35"
        />

        <button
          type="submit"
          disabled={isSaving || newPassword.length < 8}
          className="rounded-full border border-white/14 bg-black/35 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/32 disabled:opacity-40"
        >
          Guardar
        </button>
      </form>

      {status ? (
        <p
          role="status"
          className={`text-xs font-semibold ${
            status.kind === "ok" ? "text-emerald-400/90" : "text-red-400/90"
          }`}
        >
          {status.text}
        </p>
      ) : null}

      <p className="text-left text-[0.7rem] leading-relaxed text-white/35">
        El cambio puede tardar hasta 30 segundos en aplicarse en todos los
        servidores. Las sesiones ya abiertas siguen activas hasta 8 horas.
      </p>
    </div>
  );
}
