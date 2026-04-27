"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { type CreatorStats } from "@/lib/stats";

const EMPTY: CreatorStats = {
  updatedAt: "",
  score: 0,
  instagram: {
    followers: 0,
    weeklyGrowth: 0,
    er: 0,
    reach: 0,
    impressions: 0,
    bestTime: "",
    postingFrequency: "",
  },
  tiktok: { followers: 0, er: 0, weeklyViews: 0 },
  spotify: { monthlyListeners: 0, followers: 0, streamsThisMonth: 0 },
  youtube: { subscribers: 0, viewsThisMonth: 0, watchTimeHours: 0 },
  latestPost: { views: 0, percentAboveAverage: 0, platform: "instagram" },
};

function Field({
  label,
  hint,
  value,
  onChange,
  type = "number",
  placeholder = "0",
}: {
  label: string;
  hint?: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
        {label}
      </label>
      {hint && (
        <p className="text-[0.62rem] text-white/22 leading-relaxed">{hint}</p>
      )}
      <input
        type={type}
        value={value === 0 && type === "number" ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-[0.85rem] font-semibold text-white placeholder-white/18 outline-none transition focus:border-white/22 focus:bg-white/6"
      />
    </div>
  );
}

function Section({
  emoji,
  title,
  hint,
  children,
}: {
  emoji: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span>{emoji}</span>
          <p className="text-[0.78rem] font-black uppercase tracking-[0.2em] text-white/60">
            {title}
          </p>
        </div>
        {hint && (
          <p className="mt-1 text-[0.65rem] text-white/28">{hint}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function ActualizarPage() {
  const params = useParams();
  const slug = params.creator as string;

  const [stats, setStats] = useState<CreatorStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadStats = useCallback(async () => {
    const res = await fetch(`/api/stats/${slug}`);
    const data = await res.json();
    if (data && data.updatedAt) {
      setStats(data);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function set(path: string, value: string) {
    setStats((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      const last = keys[keys.length - 1];
      obj[last] = isNaN(Number(value)) || value === "" ? value : Number(value);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/stats/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-14 lg:pt-0">
        <p className="text-[0.75rem] text-white/30">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="pt-14 pb-12 lg:pt-0">
      {/* Header */}
      <div className="mb-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
          Actualización manual
        </p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
          Actualizar stats
        </h1>
      </div>
      <p className="mb-8 text-[0.75rem] leading-relaxed text-white/35">
        Abre cada app, copia los números que ves y pégalos acá. Hazlo una vez
        por semana para mantener tu dashboard al día.
      </p>

      {stats.updatedAt && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <p className="text-[0.68rem] text-emerald-400">
            Última actualización:{" "}
            {new Date(stats.updatedAt).toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Instagram */}
        <Section
          emoji="📷"
          title="Instagram"
          hint="Abre Instagram → tu perfil → Ver estadísticas profesionales"
        >
          <Field
            label="Seguidores totales"
            value={stats.instagram.followers}
            onChange={(v) => set("instagram.followers", v)}
            placeholder="85000"
          />
          <Field
            label="Nuevos seguidores esta semana"
            value={stats.instagram.weeklyGrowth}
            onChange={(v) => set("instagram.weeklyGrowth", v)}
            placeholder="320"
          />
          <Field
            label="Tasa de engagement (%)"
            hint="Likes + comentarios + guardados ÷ seguidores × 100"
            value={stats.instagram.er}
            onChange={(v) => set("instagram.er", v)}
            placeholder="6.2"
          />
          <Field
            label="Alcance (últimos 30 días)"
            hint="En Estadísticas → Cuentas alcanzadas"
            value={stats.instagram.reach}
            onChange={(v) => set("instagram.reach", v)}
            placeholder="120000"
          />
          <Field
            label="Impresiones (últimos 30 días)"
            value={stats.instagram.impressions}
            onChange={(v) => set("instagram.impressions", v)}
            placeholder="280000"
          />
          <Field
            label="Mejor hora para publicar"
            hint="En Estadísticas → Tu audiencia → Horarios más activos"
            value={stats.instagram.bestTime}
            onChange={(v) => set("instagram.bestTime", v)}
            type="text"
            placeholder="18:00 - 21:00"
          />
          <Field
            label="Frecuencia de publicación"
            value={stats.instagram.postingFrequency}
            onChange={(v) => set("instagram.postingFrequency", v)}
            type="text"
            placeholder="cada ~3 días"
          />
        </Section>

        {/* TikTok */}
        <Section
          emoji="🎵"
          title="TikTok"
          hint="Abre TikTok → tu perfil → Analytics (ícono de gráfica arriba)"
        >
          <Field
            label="Seguidores totales"
            value={stats.tiktok.followers}
            onChange={(v) => set("tiktok.followers", v)}
            placeholder="112000"
          />
          <Field
            label="Vistas esta semana"
            hint="En Analytics → Resumen → Vistas de videos (7 días)"
            value={stats.tiktok.weeklyViews}
            onChange={(v) => set("tiktok.weeklyViews", v)}
            placeholder="45000"
          />
          <Field
            label="Tasa de engagement (%)"
            value={stats.tiktok.er}
            onChange={(v) => set("tiktok.er", v)}
            placeholder="9.4"
          />
        </Section>

        {/* Spotify */}
        <Section
          emoji="🎧"
          title="Spotify for Artists"
          hint="Abre la app Spotify for Artists → Inicio → Oyentes mensuales"
        >
          <Field
            label="Oyentes mensuales"
            value={stats.spotify.monthlyListeners}
            onChange={(v) => set("spotify.monthlyListeners", v)}
            placeholder="24000"
          />
          <Field
            label="Seguidores en Spotify"
            value={stats.spotify.followers}
            onChange={(v) => set("spotify.followers", v)}
            placeholder="8500"
          />
          <Field
            label="Streams este mes"
            value={stats.spotify.streamsThisMonth}
            onChange={(v) => set("spotify.streamsThisMonth", v)}
            placeholder="65000"
          />
        </Section>

        {/* YouTube */}
        <Section
          emoji="▶️"
          title="YouTube Studio"
          hint="Abre YouTube Studio → Análisis → últimos 28 días"
        >
          <Field
            label="Suscriptores totales"
            value={stats.youtube.subscribers}
            onChange={(v) => set("youtube.subscribers", v)}
            placeholder="12000"
          />
          <Field
            label="Vistas este mes"
            value={stats.youtube.viewsThisMonth}
            onChange={(v) => set("youtube.viewsThisMonth", v)}
            placeholder="38000"
          />
          <Field
            label="Horas de visualización este mes"
            value={stats.youtube.watchTimeHours}
            onChange={(v) => set("youtube.watchTimeHours", v)}
            placeholder="1200"
          />
        </Section>

        {/* Último post */}
        <Section
          emoji="🔥"
          title="Último post destacado"
          hint="El post más reciente que vale la pena destacar en el inicio"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
              Plataforma
            </label>
            <div className="flex gap-2">
              {(["instagram", "tiktok"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("latestPost.platform", p)}
                  className={`flex-1 rounded-xl border py-2.5 text-[0.72rem] font-bold capitalize transition ${
                    stats.latestPost.platform === p
                      ? "border-white/30 bg-white/12 text-white"
                      : "border-white/8 text-white/35 hover:text-white/60"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Field
            label="Vistas"
            value={stats.latestPost.views}
            onChange={(v) => set("latestPost.views", v)}
            placeholder="420000"
          />
          <Field
            label="% sobre tu promedio"
            hint="Ej: si normalmente tienes 100K y este tuvo 200K → 100%"
            value={stats.latestPost.percentAboveAverage}
            onChange={(v) => set("latestPost.percentAboveAverage", v)}
            placeholder="87"
          />
        </Section>

        {/* Score */}
        <Section
          emoji="⭐"
          title="Score general"
          hint="Tu evaluación personal del mes. 0-100 basado en consistencia, crecimiento y calidad"
        >
          <div className="sm:col-span-2">
            <Field
              label="Score (0-100)"
              value={stats.score}
              onChange={(v) => set("score", v)}
              placeholder="63"
            />
            <div className="mt-3 flex gap-1">
              {[0, 20, 40, 60, 80, 100].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("score", String(n))}
                  className="flex-1 rounded-lg border border-white/8 py-1.5 text-[0.62rem] font-semibold text-white/30 hover:text-white/60 transition"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Save button — fixed bottom */}
      <div className="fixed bottom-0 inset-x-0 lg:left-64 bg-[#080808]/90 backdrop-blur-md border-t border-white/8 px-5 py-4 flex items-center justify-between gap-4">
        {saved ? (
          <p className="text-[0.72rem] font-semibold text-emerald-400">
            ✓ Stats guardadas correctamente
          </p>
        ) : (
          <p className="text-[0.68rem] text-white/25">
            Los cambios se verán reflejados en el inicio
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-white px-6 py-2.5 text-[0.75rem] font-black uppercase tracking-[0.18em] text-black transition hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar stats"}
        </button>
      </div>
    </div>
  );
}
