import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/pinkfest-auth";
import LogoutButton from "./components/LogoutButton";

export const metadata: Metadata = {
  title: "Admin · Sivar Music Group",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type AdminCard = {
  href: string;
  label: string;
  description: string;
  note?: string;
};

const AVAILABLE: AdminCard[] = [
  {
    href: "/eventos/admin",
    label: "Eventos",
    description: "Dashboard multi-evento: órdenes, cortesías, verificación.",
  },
  {
    href: "/pinkfest/admin",
    label: "Pink Fest",
    description: "Panel del evento flagship.",
  },
  {
    href: "/voces/admin/clientes",
    label: "Voces",
    description: "Clientes, castings, locutores, reportes.",
    note: "Requiere sesión de Voces",
  },
  {
    href: "/sound-for-films/admin",
    label: "Sound for Films",
    description: "Control de acceso y videos del portfolio.",
  },
];

const UPCOMING: Omit<AdminCard, "href">[] = [
  { label: "Artistas", description: "Catálogo y perfiles de artistas." },
  { label: "Releases", description: "Lanzamientos y discografía." },
  { label: "Noticias", description: "Novedades y comunicados." },
];

export default async function AdminHubPage() {
  const user = await verifyAdminSession();
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-white/40">
              Sivar Music Group
            </p>
            <h1 className="text-3xl font-black uppercase tracking-[-0.03em]">
              Panel de Administración
            </h1>
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">
              Sesión iniciada como {user.email}
            </p>
          </div>

          <LogoutButton />
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
            Disponible
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AVAILABLE.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="flex flex-col gap-2 rounded-2xl border border-white/12 bg-white/5 px-6 py-5 text-left transition hover:border-white/30 hover:bg-white/8"
              >
                <span className="text-sm font-semibold text-white">
                  {card.label}
                </span>
                <span className="text-xs text-white/45">
                  {card.description}
                </span>
                {card.note ? (
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-300/70">
                    {card.note}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
            Próximamente
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {UPCOMING.map((card) => (
              <div
                key={card.label}
                className="flex cursor-not-allowed flex-col gap-2 rounded-2xl border border-white/12 bg-white/5 px-6 py-5 text-left opacity-40"
              >
                <span className="text-sm font-semibold text-white">
                  {card.label}
                </span>
                <span className="text-xs text-white/45">
                  {card.description}
                </span>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Próximamente
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
