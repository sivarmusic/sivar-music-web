"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

type Idea = {
  title: string;
  hook: string;
  format: "reel" | "carrusel" | "story" | "tiktok";
  pillar: string;
  angle: string;
  keyIdeas: string[];
  script: string;
};

const FORMAT_COLORS: Record<string, string> = {
  reel: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  carrusel: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  story: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  tiktok: "bg-rose-500/15 text-rose-300 border-rose-500/20",
};

const FORMAT_LABELS: Record<string, string> = {
  reel: "REEL",
  carrusel: "CARRUSEL",
  story: "STORY",
  tiktok: "TIKTOK",
};

const PLATFORM_OPTIONS = [
  { value: "todo", label: "Todas" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
];

const COUNT_OPTIONS = [3, 5, 8, 10];

function IdeaCard({ idea, index }: { idea: Idea; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = FORMAT_COLORS[idea.format] ?? FORMAT_COLORS.reel;
  const formatLabel = FORMAT_LABELS[idea.format] ?? idea.format.toUpperCase();

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-5 transition hover:border-white/12 hover:bg-white/4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[0.62rem] font-black text-white/20">#{index + 1}</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.18em] ${colorClass}`}
          >
            {formatLabel}
          </span>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[0.6rem] font-semibold text-white/30">
          {idea.pillar}
        </span>
      </div>

      <h3 className="mb-2 text-[0.9rem] font-bold leading-snug text-white">
        {idea.title}
      </h3>

      {/* Hook */}
      <div className="mb-3 rounded-xl border border-white/6 bg-white/3 px-3 py-2.5">
        <p className="mb-1 text-[0.58rem] font-black uppercase tracking-[0.2em] text-white/25">
          Hook
        </p>
        <p className="text-[0.78rem] leading-relaxed text-white/70 italic">
          &ldquo;{idea.hook}&rdquo;
        </p>
      </div>

      {/* Angle */}
      <p className="mb-3 text-[0.72rem] leading-relaxed text-white/40">
        {idea.angle}
      </p>

      {/* Key ideas (always visible) */}
      {idea.keyIdeas?.length > 0 && (
        <div className="mb-3 rounded-xl border border-white/6 bg-white/2 px-3 py-3">
          <p className="mb-1.5 text-[0.58rem] font-black uppercase tracking-[0.2em] text-white/25">
            Ideas clave
          </p>
          <ul className="space-y-1">
            {idea.keyIdeas.map((k, i) => (
              <li
                key={i}
                className="flex gap-2 text-[0.72rem] leading-relaxed text-white/55"
              >
                <span className="text-white/25">•</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Script toggle */}
      {idea.script && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center gap-1.5 text-[0.65rem] font-semibold text-white/30 transition hover:text-white/55"
          >
            <span className="text-[0.6rem]">{expanded ? "▲" : "▼"}</span>
            {expanded ? "Ocultar guion" : "Ver guion completo"}
          </button>

          {expanded && (
            <div className="mt-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-emerald-300/60">
                  Guion para grabar
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(idea.script)}
                  className="text-[0.58rem] font-semibold text-emerald-300/50 transition hover:text-emerald-300/80"
                >
                  Copiar
                </button>
              </div>
              <p className="whitespace-pre-line text-[0.74rem] leading-relaxed text-white/75">
                {idea.script}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function IdeasPage() {
  const params = useParams();
  const slug = params.creator as string;

  const [platform, setPlatform] = useState("todo");
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, count, topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setIdeas(data.ideas ?? []);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar ideas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-14 pb-12 lg:pt-0">
      {/* Header */}
      <div className="mb-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
          Generador IA
        </p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
          Ideas de contenido
        </h1>
      </div>
      <p className="mb-8 text-[0.75rem] leading-relaxed text-white/35">
        Generado con tu biblia de marca. Cada idea está pensada para tu voz y tu audiencia.
      </p>

      {/* Controls */}
      <div className="mb-6 rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex flex-col gap-4">
          {/* Platform */}
          <div>
            <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/35">
              Plataforma
            </p>
            <div className="flex gap-2">
              {PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlatform(opt.value)}
                  className={`rounded-xl px-4 py-2 text-[0.72rem] font-semibold transition ${
                    platform === opt.value
                      ? "bg-white/12 text-white"
                      : "border border-white/8 text-white/35 hover:text-white/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div>
            <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/35">
              Cantidad de ideas
            </p>
            <div className="flex gap-2">
              {COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`rounded-xl px-4 py-2 text-[0.72rem] font-semibold transition ${
                    count === n
                      ? "bg-white/12 text-white"
                      : "border border-white/8 text-white/35 hover:text-white/60"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/35">
              Tema o enfoque (opcional)
            </p>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
              placeholder="Ej: proceso creativo, contratos, desamor, madrugada..."
              className="w-full rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-[0.82rem] text-white placeholder-white/18 outline-none transition focus:border-white/22 focus:bg-white/6"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-[0.75rem] font-black uppercase tracking-[0.18em] text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                Generando...
              </>
            ) : (
              <>
                <span>✦</span>
                {generated ? "Generar más ideas" : "Generar ideas"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
          <p className="text-[0.72rem] text-red-400">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-white/5 bg-white/2 p-5"
            >
              <div className="mb-3 flex gap-2">
                <div className="h-5 w-16 rounded-full bg-white/6" />
                <div className="h-5 w-24 rounded-full bg-white/4" />
              </div>
              <div className="mb-2 h-4 w-3/4 rounded bg-white/6" />
              <div className="mb-4 h-3 w-1/2 rounded bg-white/4" />
              <div className="h-14 rounded-xl bg-white/4" />
            </div>
          ))}
        </div>
      )}

      {/* Ideas grid */}
      {!loading && ideas.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-[0.68rem] font-semibold text-white/35">
              {ideas.length} ideas generadas con tu biblia de marca
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {ideas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} index={i} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !generated && ideas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl opacity-20">✦</div>
          <p className="text-[0.8rem] font-semibold text-white/25">
            Configura las opciones y genera tus primeras ideas
          </p>
          <p className="mt-1 text-[0.68rem] text-white/15">
            Cada idea será personalizada con tu biblia de marca
          </p>
        </div>
      )}
    </div>
  );
}
