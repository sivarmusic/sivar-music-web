"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DemoPlayer from "@/app/voces/components/DemoPlayer";
import { makeLocutorSlug } from "@/lib/voces-slug";
import { getFirstName } from "@/lib/voces-names";
import { countryToFlag } from "@/lib/voces-country";
import { useAuth } from "@/app/voces/components/AuthContext";

const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

type Profile = {
  id: string;
  nombre: string;
  pais?: string;
  idioma: string[];
  estilo: string[];
  notas?: string;
  demo?: string;
  email?: string;
  phone?: string;
  slug: string;
};

export default function CantanteProfilePage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<"demos" | "about">("demos");
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/voces/cantantes", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!data?.ok) { setMsg("Error cargando cantantes"); return; }

        const withSlugs = (data.cantantes || []).map((c: any) => ({
          ...c,
          nombre: c.nombre ?? "",
          idioma: Array.isArray(c.idioma) ? c.idioma : [],
          estilo: Array.isArray(c.estilo) ? c.estilo : [],
          slug: makeLocutorSlug(c.nombre ?? "", c.id ?? ""),
        })) as Profile[];

        const found = withSlugs.find((c) => c.slug === slug)
          ?? withSlugs.find((c) => c.slug.startsWith(String(slug).split("-").slice(0, -1).join("-")));

        if (found) setProfile(found);
        else setMsg("Cantante no encontrado");
      } catch (e: any) {
        setMsg(e?.message || "Error cargando perfil");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
        <div className="flex items-center gap-3 px-6 py-20" style={{ color: "var(--color-text-muted)" }}>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-[13px]">Cargando…</span>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
        <p className="px-6 py-20 text-[13px]" style={{ color: "var(--color-accent)" }}>{msg || "Cantante no encontrado"}</p>
      </main>
    );
  }

  const displayName = getFirstName(profile.nombre) || profile.nombre;
  const fullName = profile.nombre || displayName;
  const flag = countryToFlag(profile.pais);
  const badge = (text: string, accent = false) => (
    <span key={text} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-[500]"
      style={accent
        ? { background: "rgba(100,76,200,0.10)", border: "0.5px solid rgba(100,76,200,0.25)", color: "#644cc8" }
        : { background: "rgba(255,255,255,0.05)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
      {text}
    </span>
  );

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top left, rgba(100,76,200,0.06) 0%, transparent 60%)" }} />
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden shrink-0" style={{ border: "0.5px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)" }}>
              <img src={AVATAR_PLACEHOLDER} alt={displayName} className="w-full h-full object-cover" />
            </div>
            {/* Nombre + meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[28px] md:text-[36px] leading-none tracking-[-0.02em] flex items-center gap-3"
                style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
                {flag && <span className="text-[28px]">{flag}</span>}
                {fullName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                {profile.pais && (
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 4.418 6 10 6 10s6-5.582 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                    </svg>
                    {profile.pais}
                  </span>
                )}
              </div>
              {/* Badges */}
              {(profile.estilo.length > 0 || profile.idioma.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.estilo.map((e) => badge(e, true))}
                  {profile.idioma.map((l) => badge(l))}
                </div>
              )}
            </div>
            {/* Acciones */}
            {(isAdmin || profile.email || profile.phone) && (
              <div className="flex items-center gap-2 shrink-0">
                {(profile.email || profile.phone) && (
                  <button onClick={() => setContactOpen((s) => !s)} className="ds-btn-secondary text-[12px] py-1.5 px-3">
                    Contacto
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Info de contacto */}
          {contactOpen && (profile.email || profile.phone) && (
            <div className="mt-5 rounded-[12px] p-4 text-[13px]" style={{ background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-subtle)" }}>
              <div className="font-[500] mb-3" style={{ color: "var(--color-text-primary)" }}>Información de contacto</div>
              <div className="flex flex-col gap-2.5">
                {profile.email && (
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--color-text-muted)" }}>Email:</span>
                    <a href={`mailto:${profile.email}`} className="underline break-all" style={{ color: "#644cc8" }}>{profile.email}</a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--color-text-muted)" }}>Teléfono:</span>
                    <span style={{ color: "var(--color-text-secondary)" }}>{profile.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
          {(["demos", "about"] as const).map((t_) => (
            <button key={t_} onClick={() => setTab(t_)} className="px-4 pb-3 text-[13px] font-[500] transition-colors duration-150 -mb-px"
              style={{ color: tab === t_ ? "var(--color-text-primary)" : "var(--color-text-muted)", borderBottom: tab === t_ ? "1.5px solid #644cc8" : "1.5px solid transparent" }}>
              {t_ === "demos" ? "Demos" : "Acerca del artista"}
            </button>
          ))}
        </div>

        {tab === "demos" ? (
          <section>
            {profile.demo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <article className="ds-card card-enter p-4">
                  <div className="text-[13px] font-[500] mb-3" style={{ color: "var(--color-text-primary)" }}>
                    {displayName} – Demo
                  </div>
                  <DemoPlayer src={profile.demo} ariaLabel={`Demo de ${displayName}`} />
                  {profile.estilo[0] && (
                    <div className="mt-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px]" style={{ background: "rgba(100,76,200,0.10)", border: "0.5px solid rgba(100,76,200,0.25)", color: "#644cc8" }}>
                        {profile.estilo[0]}
                      </span>
                    </div>
                  )}
                </article>
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Sin demos disponibles aún.</p>
            )}
          </section>
        ) : (
          <section>
            <h3 className="text-[16px] font-[500] mb-2" style={{ color: "var(--color-text-primary)" }}>Acerca de {displayName}</h3>
            {profile.notas ? (
              <p className="text-[13px] leading-relaxed mb-6" style={{ color: "var(--color-text-secondary)" }}>{profile.notas}</p>
            ) : (
              <p className="text-[13px] leading-relaxed mb-6" style={{ color: "var(--color-text-muted)" }}>Sin biografía disponible.</p>
            )}
            <h4 className="text-[11px] font-[600] uppercase tracking-widest mb-4" style={{ color: "var(--color-text-muted)" }}>Características musicales</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Idiomas", items: profile.idioma },
                { label: "Géneros / Estilos", items: profile.estilo },
                { label: "País", items: profile.pais ? [profile.pais] : [] },
              ].map(({ label, items }) => (
                <div key={label}>
                  <div className="text-[12px] font-[500] mb-2" style={{ color: "var(--color-text-secondary)" }}>{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {(items.filter(Boolean).length ? items.filter(Boolean) : ["No disponible"]).map((x, i) => (
                      <span key={i} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px]"
                        style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
