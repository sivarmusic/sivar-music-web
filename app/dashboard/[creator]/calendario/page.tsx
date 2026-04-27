import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCreatorBySlug } from "@/lib/creators";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const typeColors: Record<string, string> = {
  brand: "bg-purple-500/30 text-purple-300",
  shoot: "bg-blue-500/30 text-blue-300",
  event: "bg-amber-500/30 text-amber-300",
  personal: "bg-emerald-500/30 text-emerald-300",
};

const typeLabels: Record<string, string> = {
  brand: "Marca",
  shoot: "Shooting",
  event: "Evento",
  personal: "Personal",
};

export default async function CalendarioPage({
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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map agenda dates to day numbers
  const agendaByDay: Record<number, typeof creator.agenda> = {};
  for (const item of creator.agenda) {
    const d = new Date(item.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!agendaByDay[day]) agendaByDay[day] = [];
      agendaByDay[day].push(item);
    }
  }

  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="pt-14 lg:pt-0">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
            Planificación
          </p>
          <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
            Mi calendario
          </h1>
        </div>
        <button className="mt-1 rounded-xl bg-white px-4 py-2.5 text-[0.72rem] font-black uppercase tracking-[0.16em] text-black transition hover:bg-white/90">
          + Nuevo evento
        </button>
      </div>

      {/* Month nav */}
      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
        <button className="text-white/40 hover:text-white">‹</button>
        <p className="flex-1 text-center text-[0.9rem] font-bold text-white">
          {MONTHS[month]} {year}
        </p>
        <button className="text-white/40 hover:text-white">›</button>
        <button className="rounded-lg border border-white/12 px-3 py-1.5 text-[0.65rem] font-semibold text-white/50 hover:text-white/80">
          Hoy
        </button>
      </div>

      {/* Calendar grid */}
      <div className="mb-6 rounded-2xl border border-white/8 bg-white/3 p-4 overflow-hidden">
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/25"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calCells.map((day, i) => {
            const isToday = day === now.getDate();
            const hasEvent = day !== null && agendaByDay[day];
            return (
              <div
                key={i}
                className={`relative min-h-[52px] rounded-xl p-1.5 text-[0.75rem] font-bold transition ${
                  day === null
                    ? ""
                    : isToday
                    ? "bg-white text-black"
                    : "hover:bg-white/5 text-white/55 hover:text-white"
                }`}
              >
                {day !== null && <span>{day}</span>}
                {hasEvent && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {agendaByDay[day].map((evt, j) => (
                      <div
                        key={j}
                        className={`truncate rounded px-1 py-0.5 text-[0.55rem] font-semibold ${
                          typeColors[evt.type]
                        }`}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events list */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/40">
          Próximos eventos
        </p>
        <div className="flex flex-col gap-3">
          {creator.agenda.map((item, i) => {
            const d = new Date(item.date);
            return (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-white/6 bg-white/3 p-4"
              >
                <div className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-white/8 py-1.5 text-center">
                  <span className="text-[0.55rem] font-bold uppercase text-white/35">
                    {MONTHS[d.getMonth()].slice(0, 3)}
                  </span>
                  <span className="text-lg font-black text-white leading-none">
                    {d.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-[0.85rem] font-bold text-white">
                      {item.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.58rem] font-bold ${
                        typeColors[item.type]
                      }`}
                    >
                      {typeLabels[item.type]}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-[0.7rem] text-white/40">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
