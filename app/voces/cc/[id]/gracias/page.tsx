"use client";
import { useParams } from "next/navigation";

// Ported from voces-bds's app/cc/[id]/gracias/page.tsx: post-submit
// confirmation page for the cantante casting apply flow. No auth.
//  - Links: /cc/{id} -> /voces/cc/{id}.
//  - "BDS Music" -> "Sivar Music" in the copy.

export default function CantanteCastingGraciasPage() {
  const { id } = useParams();
  return (
    <main style={{ background: "var(--color-bg-base)", minHeight: "100vh" }} className="flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="rounded-[16px] p-10 flex flex-col items-center gap-6" style={{ background: "var(--color-bg-card)", border: "0.5px solid var(--color-border-default)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(100,76,200,0.10)", border: "0.5px solid rgba(100,76,200,0.25)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#644cc8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-[28px] tracking-[-0.02em] mb-2" style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}>
              ¡Postulación enviada!
            </h1>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Recibimos tu postulación para este casting. El equipo de Sivar Music estará en contacto si tu perfil encaja con el proyecto.
            </p>
          </div>
          <a href={`/voces/cc/${id}`} className="text-[13px] transition-colors" style={{ color: "#644cc8" }}>
            Volver al casting
          </a>
        </div>
      </div>
    </main>
  );
}
