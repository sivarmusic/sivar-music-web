"use client";

// Selector Locutores/Cantantes para la sección Castings del admin — los dos
// flujos son espejo uno del otro, así que en vez de duplicar la entrada de
// sidebar, un solo selector arriba de cada página cambia de modo.
//
// `mode` es el modo de la página actual (para resaltar el activo); los links
// van siempre a la raíz de cada modo (.../castings/locutores o
// .../castings/cantantes), no a la sub-vista actual (resultados/candidatos),
// porque cambiar de modo desde adentro de un detalle no tiene un equivalente
// 1:1 del otro lado.

export default function CastingsModeSwitch({ mode }: { mode: "locutores" | "cantantes" }) {
  return (
    <div className="inline-flex gap-1.5 mb-5">
      <a href="/voces/admin/castings/locutores" className={`ds-pill ${mode === "locutores" ? "active" : ""}`} style={{ textDecoration: "none" }}>
        Locutores
      </a>
      <a href="/voces/admin/castings/cantantes" className={`ds-pill ${mode === "cantantes" ? "active" : ""}`} style={{ textDecoration: "none" }}>
        Cantantes
      </a>
    </div>
  );
}
