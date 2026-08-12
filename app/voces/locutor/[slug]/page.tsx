"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/app/voces/components/I18n";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import { extractSlugBase, makeLocutorSlug, slugifyName } from "@/lib/voces-slug";
import { getFirstName } from "@/lib/voces-names";
import { countryToFlag } from "@/lib/voces-country";
import { toArray } from "@/lib/voces-arrays";
import { useAuth } from "@/app/voces/components/AuthContext";

const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

type Profile = {
  id?: string;
  nombre: string;
  idioma: string;
  genero: string;
  estilo: string;
  edad: string;
  foto: string;
  demo: string;
  demos?: string[];
  slug?: string;
  pais?: string;
  projects?: { title: string; desc?: string }[];
  code?: number;
  email?: string;
  phone?: string;
};

export default function ProfilePage() {
  const { slug } = useParams();
  const { t } = useI18n();
  const { isAdmin, client, loading: authLoading } = useAuth();
  const isClient = !!client;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"portfolio" | "about">("portfolio");
  const [contactOpen, setContactOpen] = useState(false);

  const [nombre, setNombre] = useState("");
  const [idioma, setIdioma] = useState("");
  const [genero, setGenero] = useState("");
  const [estilo, setEstilo] = useState("");
  const [edad, setEdad] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [demoPreview, setDemoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) setEditing(false);
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      setLoading(true);
      try {
        // /api/voces/admin/locutores is built by the admin batch — until then
        // this falls back to the public endpoint for admins too.
        const endpoint = isAdmin ? "/api/voces/admin/locutores" : "/api/voces/locutores";
        const res = await fetch(endpoint, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!data || !Array.isArray(data.locutores)) {
          setMsg(t("errorLoadingVoices"));
          return;
        }

        const withSlugs = data.locutores.map((l: any, i: number) => {
          const id = typeof l.id === "string" && l.id ? l.id : `tmp-${i}`;
          const idPart = typeof l.code === "number" ? String(l.code) : id;
          return { ...l, id, slug: makeLocutorSlug(l.nombre ?? "", idPart) };
        });

        let found = withSlugs.find((l: any) => l.slug === slug);
        if (!found && slug) {
          const base = extractSlugBase(String(slug));
          if (base) found = withSlugs.find((l: any) => slugifyName(l.nombre ?? "") === base);
          if (!found) {
            const s = String(slug);
            const parts = s.split("-");
            const last = parts[parts.length - 1];
            if (/^\d+$/.test(last)) {
              found = withSlugs.find((l: any) => typeof l.code === "number" && String(l.code) === last);
            }
          }
        }
        if (found) {
          setProfile(found);
          setNombre(found.nombre || "");
          setIdioma(found.idioma || "");
          setGenero(found.genero || "");
          setEstilo(found.estilo || "");
          setEdad(found.edad || "");
          setFotoPreview(found.foto || null);
          setDemoPreview(found.demo || null);
        } else {
          setMsg(t("profileNotFound"));
        }
      } catch (e: any) {
        setMsg(e?.message || t("errorLoadingProfile"));
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug, isAdmin, authLoading]);

  useEffect(() => {
    if (fotoFile) {
      const url = URL.createObjectURL(fotoFile);
      setFotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fotoFile]);

  useEffect(() => {
    if (demoFile) {
      const url = URL.createObjectURL(demoFile);
      setDemoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [demoFile]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData();
    fd.append("slug", Array.isArray(slug) ? slug[0] : (slug ?? ""));
    fd.append("nombre", nombre);
    fd.append("idioma", idioma);
    fd.append("genero", genero);
    fd.append("estilo", estilo);
    fd.append("edad", edad);
    if (fotoFile) fd.append("foto", fotoFile);
    if (demoFile) fd.append("demo", demoFile);

    const res = await fetch("/api/voces/locutor/save", { method: "POST", body: fd });
    const json = await res.json();
    if (json?.ok) {
      setMsg(t("savedNotPersisted"));
      setProfile((prev) =>
        prev ? { ...prev, nombre, idioma, genero, estilo, edad, foto: fotoPreview || prev.foto, demo: demoPreview || prev.demo } : prev
      );
      setEditing(false);
    } else {
      setMsg(json?.error || t("errorSaving"));
    }
  };

  if (loading) {
    return (
      <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
        <div className="flex items-center gap-3 px-6 py-20" style={{ color: "var(--color-text-muted)" }}>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-[13px]">{t("loading")}</span>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
        <p className="px-6 py-20 text-[13px]" style={{ color: "var(--color-accent)" }}>{msg || t("profileNotFound")}</p>
      </main>
    );
  }

  const displayName = getFirstName(profile.nombre) || profile.nombre;
  const flag = countryToFlag(profile.pais);
  const flagLabel = profile.pais ? t("flagOf").replace("{country}", profile.pais) : t("flag");

  const splitCSV = (s?: string) => (s ? toArray(s).map((x) => x.trim()).filter(Boolean) : []);
  const parsePairs = (value?: string) => {
    const res: { lang: string; accent?: string }[] = [];
    if (!value) return res;
    const chunks = toArray(value).map((s) => s.trim()).filter(Boolean);
    for (const c of chunks) {
      const m = c.split(/[-–—]/);
      const lang = (m[0] || "").trim();
      const accent = m.length > 1 ? m.slice(1).join("-").trim() : "";
      if (lang) res.push({ lang, accent: accent || undefined });
    }
    return res;
  };

  const langPairs = parsePairs(profile.idioma);
  const languages = Array.from(new Set(langPairs.map((p) => p.lang))).filter(Boolean);
  const accents = Array.from(new Set(langPairs.map((p) => (p.accent || "").trim()).filter(Boolean)));
  const categories = splitCSV(profile.estilo);
  const ages = splitCSV(profile.edad);

  const badge = (text: string, accent = false) => (
    <span
      key={text}
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-[500]"
      style={accent
        ? { background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)", color: "var(--color-accent)" }
        : { background: "rgba(255,255,255,0.05)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }
      }
    >
      {text}
    </span>
  );

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }}>
      {/* Hero strip */}
      <div className="relative overflow-hidden" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top left, rgba(232,76,43,0.06) 0%, transparent 60%)" }} />
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full overflow-hidden shrink-0"
              style={{ border: "0.5px solid var(--color-border-subtle)", background: "var(--color-bg-subtle)" }}
            >
              <img
                src={AVATAR_PLACEHOLDER}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[28px] md:text-[36px] leading-none tracking-[-0.02em] flex items-center gap-3"
                style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
                {flag ? (
                  <a href={profile.pais ? `/voces/location/${slugifyName(profile.pais)}` : "#"} className="text-[28px]" role="img" aria-label={flagLabel} title={profile.pais || undefined}>
                    {flag}
                  </a>
                ) : null}
                {displayName}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                {typeof profile.code === "number" && (
                  <span># {profile.code}</span>
                )}
                {profile.pais && (
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 4.418 6 10 6 10s6-5.582 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                    </svg>
                    {profile.pais}
                  </span>
                )}
                {profile.genero && <span>{profile.genero}</span>}
              </div>

              {/* Badges */}
              {categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {categories.map((c) => badge(c, true))}
                  {ages.map((a) => badge(a))}
                  {languages.map((l) => badge(l))}
                </div>
              )}
            </div>

            {/* Admin / client actions */}
            {(isAdmin || isClient) && (
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <button
                    onClick={() => setEditing((s) => !s)}
                    className="ds-btn-secondary text-[12px] py-1.5 px-3"
                  >
                    {editing ? t("cancel") : t("edit")}
                  </button>
                )}
                {(profile.email || profile.phone) && (
                  <button
                    onClick={() => setContactOpen((s) => !s)}
                    className="ds-btn-secondary text-[12px] py-1.5 px-3"
                  >
                    {t("contactInfo")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact info (logged-in users) */}
          {(isAdmin || isClient) && contactOpen && (profile.email || profile.phone) && (
            <div className="mt-5 rounded-[12px] p-4 text-[13px]"
              style={{ background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-subtle)" }}>
              <div className="font-[500] mb-3" style={{ color: "var(--color-text-primary)" }}>{t("contactInfoAdminOnly")}</div>
              <div className="flex flex-col gap-2.5">
                {profile.email && (
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--color-text-muted)" }}>{t("email")}:</span>
                    <a href={`mailto:${profile.email}`} className="underline break-all" style={{ color: "var(--color-accent)" }}>{profile.email}</a>
                    <button
                      onClick={async () => { try { await navigator.clipboard.writeText(profile.email!); setMsg(t("emailCopied")); setTimeout(() => setMsg(null), 1500); } catch {} }}
                      className="ds-btn-secondary text-[11px] py-0.5 px-2"
                    >{t("copy")}</button>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <span style={{ color: "var(--color-text-muted)" }}>{t("phone")}:</span>
                    <span className="break-all" style={{ color: "var(--color-text-secondary)" }}>{profile.phone}</span>
                    <button
                      onClick={async () => { try { await navigator.clipboard.writeText(profile.phone!); setMsg(t("phoneCopied")); setTimeout(() => setMsg(null), 1500); } catch {} }}
                      className="ds-btn-secondary text-[11px] py-0.5 px-2"
                    >{t("copy")}</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit form */}
          {editing && isAdmin && (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t("name")} className="ds-input [color-scheme:dark]" />
                <input value={idioma} onChange={(e) => setIdioma(e.target.value)} placeholder={t("language")} className="ds-input [color-scheme:dark]" />
                <input value={genero} onChange={(e) => setGenero(e.target.value)} placeholder={t("gender")} className="ds-input [color-scheme:dark]" />
                <input value={estilo} onChange={(e) => setEstilo(e.target.value)} placeholder={t("style")} className="ds-input [color-scheme:dark]" />
                <input value={edad} onChange={(e) => setEdad(e.target.value)} placeholder={t("ageRange")} className="ds-input [color-scheme:dark]" />
              </div>
              <div className="flex gap-4 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                <label>{t("photo")}<input type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)} /></label>
                <label>{t("demoAudio")}<input type="file" accept="audio/*" onChange={(e) => setDemoFile(e.target.files?.[0] ?? null)} /></label>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="ds-btn-primary text-[12px] py-1.5 px-4" style={{ background: "rgba(74,222,128,0.08)", borderColor: "rgba(74,222,128,0.20)", color: "#4ade80" }}>{t("save")}</button>
                <button type="button" onClick={() => setEditing(false)} className="ds-btn-secondary text-[12px] py-1.5 px-4">{t("cancel")}</button>
              </div>
              {msg && <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{msg}</p>}
            </form>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {msg && !editing && (
          <p className="text-[13px] mb-5 px-4 py-3 rounded-[10px]" style={{ color: "#4ade80", background: "rgba(74,222,128,0.06)", border: "0.5px solid rgba(74,222,128,0.20)" }}>
            {msg}
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: "0.5px solid var(--color-border-default)" }}>
          {(["portfolio", "about"] as const).map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              className="px-4 pb-3 text-[13px] font-[500] transition-colors duration-150 -mb-px"
              style={{
                color: tab === t_ ? "var(--color-text-primary)" : "var(--color-text-muted)",
                borderBottom: tab === t_ ? "1.5px solid var(--color-accent)" : "1.5px solid transparent",
              }}
            >
              {t_ === "portfolio" ? t("portfolio") : t("aboutTalent")}
            </button>
          ))}
        </div>

        {tab === "portfolio" ? (
          <section>
            {profile.demo || (profile.demos && profile.demos.length) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(profile.demos && profile.demos.length ? profile.demos : [profile.demo]).map((src, idx) => (
                  <article key={idx} className="ds-card card-enter p-4" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="text-[13px] font-[500] mb-3" style={{ color: "var(--color-text-primary)" }}>
                      {profile.nombre ? `${getFirstName(profile.nombre)} – Demo ${idx + 1}` : `Demo ${idx + 1}`}
                    </div>
                    <AudioPlayer src={idx === 0 ? (demoPreview || src) : src} ariaLabel={t("demoOf").replace("{name}", displayName)} />
                    <div className="mt-3 flex items-center justify-between">
                      {categories[0] && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px]"
                          style={{ background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)", color: "var(--color-accent)" }}>
                          {categories[0]}
                        </span>
                      )}
                      {typeof profile.code === "number" && (
                        <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>#{profile.code}</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{t("noDemos")}</p>
            )}
          </section>
        ) : (
          <section>
            <h3 className="text-[16px] font-[500] mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t("aboutName")} {displayName}
            </h3>
            <p className="text-[13px] leading-relaxed mb-8" style={{ color: "var(--color-text-secondary)" }}>
              {(profile as any).about || t("noBio")}
            </p>
            <h4 className="text-[11px] font-[600] uppercase tracking-widest mb-4" style={{ color: "var(--color-text-muted)" }}>
              {t("vocalCharacteristics")}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: t("language"), items: languages },
                { label: t("nativeLanguage"), items: [languages[0]] },
                { label: t("voiceAges"), items: ages },
                { label: t("accentsLabel"), items: accents },

                { label: t("categoriesLabel"), items: categories },
              ].map(({ label, items }) => (
                <div key={label}>
                  <div className="text-[12px] font-[500] mb-2" style={{ color: "var(--color-text-secondary)" }}>{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {(items.filter(Boolean).length ? items.filter(Boolean) : [t("notAvailable")]).map((x, i) => (
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
