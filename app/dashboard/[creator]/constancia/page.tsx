import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCreatorBySlug } from "@/lib/creators";

export default async function ConstanciaPage({
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

  // Simulate last 28 days of posting activity
  const weeks = Array.from({ length: 4 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const rand = Math.random();
      return rand > 0.45 ? (rand > 0.8 ? 2 : 1) : 0;
    })
  );

  return (
    <div className="pt-14 lg:pt-0">
      <div className="mb-8">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
          Hábito de publicación
        </p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
          Constancia
        </h1>
      </div>

      <div className="mb-5 rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/40">
            Actividad últimas 4 semanas
          </p>
          <p className="text-[0.7rem] font-semibold text-white/35">
            {creator.instagram.postingFrequency}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {["Sem 1", "Sem 2", "Sem 3", "Sem 4"].map((label, wi) => (
            <div key={wi} className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-[0.6rem] text-white/25">
                {label}
              </span>
              <div className="flex gap-1.5">
                {weeks[wi].map((val, di) => (
                  <div
                    key={di}
                    className={`h-7 w-7 rounded-lg ${
                      val === 2
                        ? "bg-emerald-400"
                        : val === 1
                        ? "bg-emerald-400/40"
                        : "bg-white/6"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-[0.62rem] text-white/30">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-emerald-400" /> Múltiple
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-emerald-400/40" /> 1 post
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-white/6" /> Sin post
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/40">
          Estadísticas de consistencia
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-white">14</p>
            <p className="text-[0.62rem] text-white/30">posts este mes</p>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-400">5</p>
            <p className="text-[0.62rem] text-white/30">días de racha</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">86%</p>
            <p className="text-[0.62rem] text-white/30">consistencia</p>
          </div>
        </div>
      </div>
    </div>
  );
}
