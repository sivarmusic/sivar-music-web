"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ThanksView from "@/app/voces/components/casting/ThanksView";

// Ported from voces-bds's app/c/[id]/gracias/page.tsx: post-submit
// confirmation page for the locutor casting apply flow. No auth.
//  - /api/casting?id= -> /api/voces/casting?id=.
//  - Links: /c/{id} -> /voces/c/{id}, /registro -> /voces/registro,
//    /actualizar-reel -> /voces/actualizar-reel.
//  - "BDS" -> "Sivar Music" in the copy.
// Presentación: rediseño visual (tema casting); textos y destinos no cambiaron.

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
    <main>
      <ThanksView
        heading="¡Gracias por postularte!"
        lead={
          casting?.title ? (
            <>
              Recibimos tu postulación para{" "}
              <span className="font-[600] text-cs-ink">{casting.title}</span>.
            </>
          ) : undefined
        }
        project={casting?.title || undefined}
        next="El equipo de Sivar Music revisará tu propuesta y se pondrá en contacto si tu perfil es el indicado para el proyecto."
        backHref={`/voces/c/${id}`}
        band={{
          title: "No te pierdas ningún casting",
          text: "Enviamos nuestros castings por mail. Sumate a Sivar Voces o mantené tus datos actualizados para que te tengamos en cuenta y recibas todas las oportunidades.",
          primary: { href: "/voces/registro", label: "Sumarme a la base" },
          secondary: { href: "/voces/actualizar-reel", label: "Actualizar mi información" },
        }}
      />
    </main>
  );
}
