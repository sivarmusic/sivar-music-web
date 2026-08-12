"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// Ported from voces-bds's app/c/[id]/gracias/page.tsx: post-submit
// confirmation page for the locutor casting apply flow. No auth.
//  - /api/casting?id= -> /api/voces/casting?id=.
//  - Links: /c/{id} -> /voces/c/{id}, /registro -> /voces/registro,
//    /actualizar-reel -> /voces/actualizar-reel.
//  - "BDS" -> "Sivar Music" in the copy.

export default function CastingGraciasPage() {
  const { id } = useParams();
  const [casting, setCasting] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/voces/casting?id=${id}`);
        const j = await r.json();
        if (r.ok && j?.ok) setCasting(j.casting);
      } catch {}
    })();
  }, [id]);

  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="px-4 py-10 flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto text-center">
        <div className="rounded-[16px] p-10 flex flex-col items-center gap-6"
          style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>

          {/* Checkmark */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(74,222,128,0.10)", border: "0.5px solid rgba(74,222,128,0.30)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none"
              stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Título */}
          <div>
            <div className="text-[11px] font-[600] uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
              Postulación enviada
            </div>
            <h1 className="text-[28px] leading-tight tracking-[-0.02em] mb-2"
              style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
              ¡Gracias por postularte!
            </h1>
            {casting?.title ? (
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                Recibimos tu postulación para{" "}
                <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{casting.title}</span>.
              </p>
            ) : null}
          </div>

          {/* Mensaje */}
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            El equipo de Sivar Music revisará tu propuesta y se pondrá en contacto si tu perfil es el indicado para el proyecto.
          </p>

          {/* Volver */}
          <a
            href={`/voces/c/${id}`}
            className="inline-flex items-center gap-2 text-[13px] transition-colors"
            style={{ color: "var(--color-accent)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver al casting
          </a>
        </div>

        {/* Base de datos Sivar Music */}
        <div className="mt-5 rounded-[16px] p-7 text-left"
          style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: "var(--color-accent)" }}>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[17px] leading-tight mb-1.5"
                style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
                No te pierdas ningún casting
              </h2>
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--color-text-muted)" }}>
                Enviamos nuestros castings por mail. Sumate a Sivar Voces o mantené tus datos actualizados para que te tengamos en cuenta y recibas todas las oportunidades.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <a href="/voces/registro" className="ds-btn-primary text-[12px] py-2 px-4 inline-flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Sumarme a la base
                </a>
                <a href="/voces/actualizar-reel" className="ds-btn-secondary text-[12px] py-2 px-4 inline-flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                  </svg>
                  Actualizar mi información
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
