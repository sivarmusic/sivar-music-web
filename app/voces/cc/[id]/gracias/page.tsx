"use client";
import { useParams } from "next/navigation";
import ThanksView from "@/app/voces/components/casting/ThanksView";

// Ported from voces-bds's app/cc/[id]/gracias/page.tsx: post-submit
// confirmation page for the cantante casting apply flow. No auth.
//  - Links: /cc/{id} -> /voces/cc/{id}.
//  - "BDS Music" -> "Sivar Music" in the copy.
// Presentación: rediseño visual (tema casting); textos y destinos no cambiaron.

export default function CantanteCastingGraciasPage() {
  const { id } = useParams();
  return (
    <main>
      <ThanksView
        heading="¡Postulación enviada!"
        next="Recibimos tu postulación para este casting. El equipo de Sivar Music estará en contacto si tu perfil encaja con el proyecto."
        backHref={`/voces/cc/${id}`}
      />
    </main>
  );
}
