import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCreatorBySlug, formatFollowers } from "@/lib/creators";
import { getCreatorStats } from "@/lib/stats";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function formatDate() {
  return new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator: slug } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get("creator_session")?.value;
  if (!session) redirect("/members");

  const creator = getCreatorBySlug(session);
  if (!creator || slug !== session) redirect(`/dashboard/${session}`);

  // Merge live stats from Blob over base defaults
  const liveStats = await getCreatorStats(session);
  const ig = liveStats?.instagram ?? creator.instagram;
  const tt = liveStats?.tiktok ?? creator.tiktok;
  const latest = liveStats?.latestPost ?? creator.latestPostPerformance;
  const score = liveStats?.score ?? creator.score;

  const today = creator.agenda.find((a) => {
    const d = new Date(a.date);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  return (
    <div className="pt-14 lg:pt-0">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
          {formatDate()}
        </p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
          {getGreeting()}, {creator.displayName} {creator.emoji}
        </h1>
      </div>

      {/* Score + platform tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[0.72rem] font-bold text-white/80">
            Score {score}/100
          </span>
        </div>
        <div className="flex gap-2">
          {["Todo", "Instagram", "TikTok"].map((tab) => (
            <button
              key={tab}
              className={`rounded-full px-3 py-1.5 text-[0.68rem] font-semibold transition ${
                tab === "Todo"
                  ? "bg-white/10 text-white"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Latest post performance */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-white/50">
              Tu último post
            </p>
          </div>
          <p className="text-xl font-black text-white">
            {formatFollowers(latest.views)} vistas
          </p>
          <p className="mt-1 text-[0.72rem] text-white/45">
            en {latest.platform} ·{" "}
            <span className="text-emerald-400 font-semibold">
              +{latest.percentAboveAverage}%
            </span>{" "}
            sobre tu promedio
          </p>
        </div>

        {/* Today task */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-amber-400/70">
              Esto te toca hoy
            </p>
          </div>
          <p className="text-[0.9rem] font-bold leading-snug text-white">
            {creator.todayTask.title}
          </p>
          <p className="mt-2 text-[0.68rem] leading-relaxed text-white/40">
            {creator.todayTask.audienceRequest}
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/60">
              {creator.todayTask.format}
            </span>
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[0.62rem] font-semibold text-white/40">
              {creator.todayTask.category}
            </span>
          </div>
        </div>

        {/* Agenda today */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">📅</span>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-white/50">
              En tu agenda
            </p>
          </div>
          {today ? (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-3 w-1 shrink-0 rounded-full bg-white/30" />
              <div>
                <p className="text-[0.88rem] font-bold text-white">
                  {today.title}
                </p>
                {today.description && (
                  <p className="mt-0.5 text-[0.7rem] text-white/40">
                    {today.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[0.8rem] text-white/30">
              Nada programado para hoy
            </p>
          )}
          <div className="mt-3 border-t border-white/6 pt-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/25">
              Próximos eventos
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {creator.agenda.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[0.72rem]">
                  <span className="text-white/25">
                    {new Date(item.date).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="text-white/55">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Redes stats */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-white/50">
              Mis redes
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="text-sm">📷</span>
                <p className="text-[0.65rem] font-semibold text-white/40">
                  Instagram
                </p>
              </div>
              <p className="text-2xl font-black text-white">
                {formatFollowers(ig.followers)}
              </p>
              <p className="text-[0.68rem] text-emerald-400 font-semibold">
                +{formatFollowers(ig.weeklyGrowth)} esta semana
              </p>
              <p className="text-[0.65rem] text-white/30">
                ER: {ig.er}%
              </p>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="text-sm">🎵</span>
                <p className="text-[0.65rem] font-semibold text-white/40">
                  TikTok
                </p>
              </div>
              <p className="text-2xl font-black text-white">
                {formatFollowers(tt.followers)}
              </p>
              <p className="text-[0.68rem] text-white/25">seguidores</p>
              <p className="text-[0.65rem] text-white/30">
                ER: {tt.er}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Best posting time */}
      <div className="mt-4 rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🕐</span>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-white/50">
              Mejor hora para publicar
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">
              {ig.bestTime || "—"}
            </p>
            <p className="text-[0.62rem] text-white/30">
              Basado en tus últimos posts · {ig.postingFrequency || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
