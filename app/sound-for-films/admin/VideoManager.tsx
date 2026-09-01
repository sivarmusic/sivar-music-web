"use client";

import { useState } from "react";

type AdminVideo = {
  id: string;
  slug: string;
  title: string;
  description: string;
  partner_credit: string;
  visible: boolean;
  sort_order: number;
};

type VideoManagerProps = {
  initialVideos: AdminVideo[];
};

type RowState = {
  title: string;
  description: string;
  partner_credit: string;
  visible: boolean;
  isSaving: boolean;
  status: { kind: "ok" | "error"; text: string } | null;
};

function toRowState(video: AdminVideo): RowState {
  return {
    title: video.title,
    description: video.description,
    partner_credit: video.partner_credit,
    visible: video.visible,
    isSaving: false,
    status: null,
  };
}

export default function VideoManager({ initialVideos }: VideoManagerProps) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(initialVideos.map((video) => [video.id, toRowState(video)]))
  );

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function patchVideo(id: string, body: Record<string, unknown>) {
    updateRow(id, { isSaving: true, status: null });

    try {
      const response = await fetch("/api/sound-for-films/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        updateRow(id, { status: { kind: "error", text: data.error ?? "No se pudo guardar" } });
        return null;
      }

      return data.video as AdminVideo;
    } catch {
      updateRow(id, { status: { kind: "error", text: "No se pudo guardar" } });
      return null;
    } finally {
      updateRow(id, { isSaving: false });
    }
  }

  async function handleToggle(id: string) {
    const next = !rows[id].visible;
    const video = await patchVideo(id, { visible: next });
    if (video) {
      updateRow(id, {
        visible: video.visible,
        status: {
          kind: "ok",
          text: video.visible ? "Video visible en el portfolio" : "Video oculto",
        },
      });
    }
  }

  async function handleSave(id: string) {
    const row = rows[id];
    const video = await patchVideo(id, {
      title: row.title,
      description: row.description,
      partner_credit: row.partner_credit,
    });
    if (video) {
      updateRow(id, { status: { kind: "ok", text: "Guardado" } });
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1 text-left">
        <span className="text-sm font-semibold text-white">Videos del portfolio</span>
        <span className="text-xs text-white/45">
          Ocultá videos individuales o editá su título, descripción y crédito de
          partner. Los cambios de título/descripción/crédito requieren tocar
          &quot;Guardar&quot;; mostrar/ocultar se guarda al instante.
        </span>
      </div>

      <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-white/12 bg-white/5 p-4">
        {initialVideos.map((video) => {
          const row = rows[video.id];
          if (!row) return null;

          return (
            <div
              key={video.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-left"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  {video.slug}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggle(video.id)}
                  disabled={row.isSaving}
                  role="switch"
                  aria-checked={row.visible}
                  aria-label={`Mostrar u ocultar ${video.title}`}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                    row.visible ? "bg-emerald-500/80" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                      row.visible ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <label className="flex flex-col gap-1 text-xs font-semibold text-white/70">
                Título
                <input
                  type="text"
                  value={row.title}
                  onChange={(event) => updateRow(video.id, { title: event.target.value })}
                  className="rounded-lg border border-white/14 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-white/35"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-white/70">
                Descripción
                <textarea
                  value={row.description}
                  onChange={(event) =>
                    updateRow(video.id, { description: event.target.value })
                  }
                  rows={2}
                  className="resize-none rounded-lg border border-white/14 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-white/35"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-white/70">
                Crédito de partner
                <input
                  type="text"
                  value={row.partner_credit}
                  onChange={(event) =>
                    updateRow(video.id, { partner_credit: event.target.value })
                  }
                  placeholder="in partnership with…"
                  className="rounded-lg border border-white/14 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/25 outline-none transition focus:border-white/35"
                />
              </label>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handleSave(video.id)}
                  disabled={row.isSaving}
                  className="rounded-full border border-white/14 bg-black/35 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/32 disabled:opacity-40"
                >
                  Guardar
                </button>

                {row.status ? (
                  <p
                    role="status"
                    className={`text-xs font-semibold ${
                      row.status.kind === "ok" ? "text-emerald-400/90" : "text-red-400/90"
                    }`}
                  >
                    {row.status.text}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
