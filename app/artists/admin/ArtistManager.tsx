"use client";

import { useState } from "react";

type AdminArtist = {
  id: string;
  slug: string;
  name: string;
  genre: string;
  summary: string;
  profile_paragraphs: string[];
  profile_highlights: string[];
  visible: boolean;
  sort_order: number;
};

type ArtistManagerProps = {
  initialArtists: AdminArtist[];
};

type RowState = {
  name: string;
  genre: string;
  summary: string;
  profileParagraphsText: string;
  profileHighlightsText: string;
  visible: boolean;
  isSaving: boolean;
  status: { kind: "ok" | "error"; text: string } | null;
};

// Los textareas de párrafos/claves editan un item por línea; se reconstruyen
// como array al guardar y se muestran con join('\n') al cargar.
function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function toRowState(artist: AdminArtist): RowState {
  return {
    name: artist.name,
    genre: artist.genre,
    summary: artist.summary,
    profileParagraphsText: artist.profile_paragraphs.join("\n"),
    profileHighlightsText: artist.profile_highlights.join("\n"),
    visible: artist.visible,
    isSaving: false,
    status: null,
  };
}

export default function ArtistManager({ initialArtists }: ArtistManagerProps) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(initialArtists.map((artist) => [artist.id, toRowState(artist)]))
  );

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function patchArtist(id: string, body: Record<string, unknown>) {
    updateRow(id, { isSaving: true, status: null });

    try {
      const response = await fetch("/api/artists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        updateRow(id, { status: { kind: "error", text: data.error ?? "No se pudo guardar" } });
        return null;
      }

      return data.artist as AdminArtist;
    } catch {
      updateRow(id, { status: { kind: "error", text: "No se pudo guardar" } });
      return null;
    } finally {
      updateRow(id, { isSaving: false });
    }
  }

  async function handleToggle(id: string) {
    const next = !rows[id].visible;
    const artist = await patchArtist(id, { visible: next });
    if (artist) {
      updateRow(id, {
        visible: artist.visible,
        status: {
          kind: "ok",
          text: artist.visible ? "Artista visible en el sitio" : "Artista oculto",
        },
      });
    }
  }

  async function handleSave(id: string) {
    const row = rows[id];
    const artist = await patchArtist(id, {
      name: row.name,
      genre: row.genre,
      summary: row.summary,
      profile_paragraphs: linesToArray(row.profileParagraphsText),
      profile_highlights: linesToArray(row.profileHighlightsText),
    });
    if (artist) {
      updateRow(id, { status: { kind: "ok", text: "Guardado" } });
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1 text-left">
        <span className="text-sm font-semibold text-white">Perfiles del roster</span>
        <span className="text-xs text-white/45">
          Editá nombre, género, bio, párrafos del perfil y claves. Un párrafo o
          clave por línea. Los cambios de texto requieren tocar
          &quot;Guardar&quot;; mostrar/ocultar se guarda al instante.
        </span>
      </div>

      <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-white/12 bg-white/5 p-4">
        {initialArtists.map((artist) => {
          const row = rows[artist.id];
          if (!row) return null;

          return (
            <div
              key={artist.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-left"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  {artist.slug}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggle(artist.id)}
                  disabled={row.isSaving}
                  role="switch"
                  aria-checked={row.visible}
                  aria-label={`Mostrar u ocultar ${artist.name}`}
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
                Nombre
                <input
                  type="text"
                  value={row.name}
                  onChange={(event) => updateRow(artist.id, { name: event.target.value })}
                  className="rounded-lg border border-white/14 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-white/35"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-white/70">
                Género
                <input
                  type="text"
                  value={row.genre}
                  onChange={(event) => updateRow(artist.id, { genre: event.target.value })}
                  className="rounded-lg border border-white/14 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-white/35"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-white/70">
                Resumen
                <textarea
                  value={row.summary}
                  onChange={(event) => updateRow(artist.id, { summary: event.target.value })}
                  rows={2}
                  className="resize-none rounded-lg border border-white/14 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-white/35"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-white/70">
                Párrafos del perfil (uno por línea)
                <textarea
                  value={row.profileParagraphsText}
                  onChange={(event) =>
                    updateRow(artist.id, { profileParagraphsText: event.target.value })
                  }
                  rows={4}
                  className="resize-none rounded-lg border border-white/14 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-white/35"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-white/70">
                Claves (una por línea)
                <textarea
                  value={row.profileHighlightsText}
                  onChange={(event) =>
                    updateRow(artist.id, { profileHighlightsText: event.target.value })
                  }
                  rows={3}
                  className="resize-none rounded-lg border border-white/14 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-white/35"
                />
              </label>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handleSave(artist.id)}
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
