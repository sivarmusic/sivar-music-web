import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCreatorBySlug } from "@/lib/creators";

export default async function TendenciasPage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator: slug } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get("creator_session")?.value;
  if (!session || slug !== session) redirect(`/dashboard/${session ?? ""}`);
  const creator = getCreatorBySlug(session);
  if (!creator) redirect("/members");

  const trends = [
    { topic: "Transiciones con música latina", platform: "TikTok", growth: "+820%", hot: true },
    { topic: "\"Day in my life\" sin editar", platform: "Instagram", growth: "+340%", hot: true },
    { topic: "Reacciones a comentarios de audiencia", platform: "Ambas", growth: "+210%", hot: false },
    { topic: "Tips en formato rápido (<15 seg)", platform: "TikTok", growth: "+180%", hot: false },
    { topic: "Antes y después sin filtros", platform: "Instagram", growth: "+155%", hot: false },
    { topic: "Colaboraciones inesperadas", platform: "Ambas", growth: "+132%", hot: false },
  ];

  return (
    <div className="pt-14 lg:pt-0">
      <div className="mb-8">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
          Lo que está subiendo
        </p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
          Tendencias ↗
        </h1>
        <p className="mt-2 text-[0.75rem] text-white/35">
          Formatos y temas en crecimiento esta semana en tu nicho
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {trends.map((trend, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/3 p-4"
          >
            <span className="w-6 shrink-0 text-[0.72rem] font-black text-white/20">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[0.85rem] font-bold text-white">
                  {trend.topic}
                </p>
                {trend.hot && (
                  <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[0.58rem] font-bold text-red-400">
                    🔥 HOT
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[0.68rem] text-white/35">
                {trend.platform}
              </p>
            </div>
            <span className="shrink-0 text-[0.82rem] font-black text-emerald-400">
              {trend.growth}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
