"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AudioPlayer from "@/app/voces/components/AudioPlayer";
import PdfViewer from "@/app/voces/components/PdfViewer";

// Ported from voces-bds's app/cc/[id]/page.tsx: public cantante casting
// detail page (the /voces/cc/{shareId} link shared with talents). No auth:
// /voces/cc/ is proxy-allowlisted for anonymous visitors.
//  - /api/cantantes/casting?id= -> /api/voces/cantantes/casting?id=.

/** Descarga un archivo forzando el guardado (no lo abre en el navegador). */
async function triggerDownload(url: string, label: string) {
  const raw = url.split("/").pop()?.split("?")[0] || "";
  const ext = raw.includes(".") ? raw.split(".").pop() || "" : "";
  const filename = ext ? `${label}.${ext}` : label || "archivo";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch {
    // Fallback: abre en nueva pestaña si el fetch falla
    window.open(url, "_blank");
  }
}

function useCountdown(deadline: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  const diff = Math.max(0, new Date(deadline).getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, expired: diff === 0 };
}

export default function CantanteCastingPublicPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  async function handleDownload(url: string, label: string, idx: number) {
    setDownloading(idx);
    await triggerDownload(url, label);
    setDownloading(null);
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/voces/cantantes/casting?id=${id}`);
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || "No disponible");
        setItem(j.casting);
      } catch (e: any) {
        setError(e?.message || "Error");
      }
    })();
  }, [id]);

  const pdfSrc = useMemo(() => item?.scriptUrl as string || "", [item?.scriptUrl]);
  const isOpen = !item?.deadline || new Date() < new Date(item.deadline);
  const countdown = useCountdown(item?.deadline);

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10">
      <div className="max-w-4xl mx-auto">
        {!item ? (
          <div className="flex items-center gap-3 py-16" style={{ color: "var(--color-text-muted)" }}>
            {!error ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-[13px]">Cargando…</span>
              </>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--color-accent)" }}>{error}</p>
            )}
          </div>
        ) : (
          <div className="rounded-[16px] p-8" style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
            {/* Badge estado */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
                style={{ background: isOpen ? "rgba(100,76,200,0.08)" : "rgba(255,255,255,0.05)", border: `0.5px solid ${isOpen ? "rgba(100,76,200,0.25)" : "rgba(255,255,255,0.12)"}` }}>
                {isOpen
                  ? <span className="w-1.5 h-1.5 rounded-full dot-pulse" style={{ background: "#644cc8" }} />
                  : <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(150,150,150,0.6)" }} />}
                <span className="text-[11px] font-[600] tracking-widest uppercase" style={{ color: isOpen ? "#644cc8" : "rgba(150,150,150,0.9)" }}>
                  {isOpen ? "Casting Abierto" : "Casting Cerrado"}
                </span>
              </span>
              {item.deadline && (
                <div className="flex flex-col items-center gap-1 mt-1">
                  <span className="text-[10px] font-[600] uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                    {isOpen ? "Fecha límite" : "Cerró el"}
                  </span>
                  <span className="text-[18px] font-[600] tracking-tight" style={{ color: isOpen ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                    {new Date(item.deadline).toLocaleString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="text-[18px] font-[600] tracking-tight" style={{ color: "#644cc8" }}>
                    {new Date(item.deadline).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: true })} hs
                  </span>
                  {countdown && isOpen && (
                    <div className="flex items-end gap-3 mt-2">
                      {[{ v: countdown.days, label: "días" }, { v: countdown.hours, label: "hs" }, { v: countdown.minutes, label: "min" }, { v: countdown.seconds, label: "seg" }].map(({ v, label }) => (
                        <div key={label} className="flex flex-col items-center">
                          <span className="text-[32px] font-[700] leading-none tabular-nums" style={{ color: "var(--color-text-primary)" }}>{String(v).padStart(2, "0")}</span>
                          <span className="text-[10px] font-[600] uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nombre */}
            <div className="text-center mb-8">
              <div className="text-[11px] font-[600] uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>Nombre del proyecto</div>
              <h1 className="text-[28px] md:text-[36px] leading-none tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
                {item.title || "Sin título"}
              </h1>
            </div>

            {/* Descripción */}
            {item.brief && (
              <section className="mb-8 rounded-[12px] p-5" style={{ background: "var(--color-bg-subtle)", border: "0.5px solid var(--color-border-default)" }}>
                <div className="text-[11px] font-[600] uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>Descripción del proyecto</div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{item.brief}</p>
              </section>
            )}

            {/* Criterios vocales */}
            {item.criteria && (item.criteria.styles?.length || item.criteria.country || item.criteria.gender || item.criteria.vocalRange) && (
              <section className="mb-8">
                <div className="text-[11px] font-[600] uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>Perfil buscado</div>
                <div className="flex flex-wrap gap-2">
                  {item.criteria.country && <span className="inline-flex items-center rounded-full px-3 py-1 text-[12px]" style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>{item.criteria.country}</span>}
                  {item.criteria.gender && <span className="inline-flex items-center rounded-full px-3 py-1 text-[12px]" style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>{item.criteria.gender}</span>}
                  {item.criteria.vocalRange && <span className="inline-flex items-center rounded-full px-3 py-1 text-[12px]" style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>{item.criteria.vocalRange}</span>}
                  {(item.criteria.styles || []).map((s: string) => (
                    <span key={s} className="inline-flex items-center rounded-full px-3 py-1 text-[12px]" style={{ background: "rgba(100,76,200,0.10)", border: "0.5px solid rgba(100,76,200,0.25)", color: "#644cc8" }}>{s}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Video */}
            <section className="mb-8">
              <div className="text-[11px] font-[600] uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>Video del casting</div>
              {item.videoUrl ? (
                <video src={item.videoUrl} controls controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} className="w-full rounded-[12px] bg-black" style={{ border: "0.5px solid var(--color-border-default)" }} />
              ) : (
                <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Sin video</p>
              )}
            </section>

            {/* Guion */}
            <section className="mb-8">
              <div className="text-[11px] font-[600] uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>Letra / Guion</div>
              {item.scriptUrl ? (
                <div>
                  <PdfViewer src={pdfSrc} fallbackHref={item.scriptUrl} />
                  <p className="mt-2 text-[12px]" style={{ color: "var(--color-text-muted)" }}>Si no ves el documento, <a href={item.scriptUrl} target="_blank" className="underline" style={{ color: "#644cc8" }}>abrilo aquí</a>.</p>
                </div>
              ) : (
                <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>Sin guion</p>
              )}
            </section>

            {/* Referencia legacy (URL única) */}
            {item.referenceUrl && !(item.attachments?.length) && (
              <section className="mb-8">
                <div className="text-[11px] font-[600] uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>Referencia</div>
                {/\.(mp4|webm|mov)$/i.test(item.referenceUrl) ? (
                  <video src={item.referenceUrl} controls controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} className="w-full rounded-[12px] bg-black" style={{ border: "0.5px solid var(--color-border-default)" }} />
                ) : /\.(mp3|wav|ogg)$/i.test(item.referenceUrl) ? (
                  <AudioPlayer src={item.referenceUrl} ariaLabel="Referencia de audio" />
                ) : (
                  <a href={item.referenceUrl} target="_blank" className="underline break-all text-[13px]" style={{ color: "#644cc8" }}>{item.referenceUrl}</a>
                )}
              </section>
            )}

            {/* Archivos adjuntos descargables */}
            {Array.isArray(item.attachments) && item.attachments.length > 0 && (
              <section className="mb-8">
                <div className="text-[11px] font-[600] uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>Archivos para descargar</div>
                <div className="space-y-2">
                  {(item.attachments as Array<{ label: string; url: string }>).map((att, i) => {
                    const ext = (att.url?.split("?")[0]?.split(".").pop() || "").toLowerCase();
                    const icon = ["mp3","wav","ogg","m4a","aac","flac"].includes(ext) ? "🎵"
                                : ["mp4","webm","mov","avi"].includes(ext) ? "🎬"
                                : ["pdf"].includes(ext) ? "📄"
                                : ["doc","docx","txt","rtf","odt"].includes(ext) ? "📝"
                                : ["jpg","jpeg","png","gif","webp"].includes(ext) ? "🖼️"
                                : "📎";
                    const isLoading = downloading === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleDownload(att.url, att.label || "Archivo", i)}
                        disabled={isLoading}
                        className="flex items-center gap-3 rounded-[12px] px-4 py-3 w-full text-left transition-all"
                        style={{
                          background: isLoading ? "rgba(100,76,200,0.04)" : "rgba(100,76,200,0.07)",
                          border: "0.5px solid rgba(100,76,200,0.22)",
                          cursor: isLoading ? "wait" : "pointer",
                          opacity: isLoading ? 0.7 : 1,
                        }}
                      >
                        <span className="text-[20px] shrink-0">{isLoading ? "⏳" : icon}</span>
                        <span className="flex-1 text-[14px] font-[500]" style={{ color: "var(--color-text-primary)" }}>
                          {att.label || "Archivo"}
                        </span>
                        <span className="text-[11px] font-[600] uppercase tracking-widest shrink-0" style={{ color: "#644cc8" }}>
                          {isLoading ? "Descargando…" : "Descargar"}
                        </span>
                        {!isLoading && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#644cc8" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center gap-2">
              {isOpen ? (
                <a href={`/voces/cc/${id}/apply`} className="inline-flex items-center gap-2 px-8 py-3.5 text-[14px] font-[500] rounded-[10px] transition-colors"
                  style={{ background: "#644cc8", color: "#fff" }}>
                  Aplicar al casting
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[14px] font-[500] cursor-not-allowed opacity-50"
                  style={{ border: "0.5px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                  Casting cerrado
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
