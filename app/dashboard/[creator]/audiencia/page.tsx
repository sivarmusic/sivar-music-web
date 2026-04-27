import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCreatorBySlug } from "@/lib/creators";

export default async function AudienciaPage({
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

  return (
    <div className="pt-14 lg:pt-0">
      <div className="mb-8">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
          Análisis de IA
        </p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
          Mi audiencia
        </h1>
        <p className="mt-2 text-[0.75rem] text-white/35">
          Basado en el análisis de comentarios de tus últimos posts
        </p>
      </div>

      {/* Topics */}
      <div className="mb-5 rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/40">
          Temas que dominan en tu audiencia
        </p>
        <div className="flex flex-col gap-2">
          {creator.audienceTopics.map((topic, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-white/4 px-4 py-3"
            >
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <p className="text-[0.82rem] font-semibold text-white/80">
                {topic}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Words */}
      <div className="mb-5 rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/40">
          Palabras que más repiten
        </p>
        <div className="flex flex-wrap gap-2">
          {creator.audienceWords.map((word) => (
            <span
              key={word}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[0.75rem] font-semibold text-white/70"
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Content categories */}
      <div className="mb-5 rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/40">
          Categorías de contenido de tu cuenta
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {creator.contentCategories.map((cat, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-3"
            >
              <span className="text-[0.65rem] font-black text-white/25">
                0{i + 1}
              </span>
              <p className="text-[0.8rem] font-semibold text-white/75">{cat}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-5 py-3 text-[0.72rem] font-semibold text-white/60 transition hover:bg-white/7 hover:text-white/80">
          ↻ Regenerar análisis IA
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-5 py-3 text-[0.72rem] font-semibold text-white/60 transition hover:bg-white/7 hover:text-white/80">
          ↓ Descargar comentarios nuevos
        </button>
      </div>
    </div>
  );
}
