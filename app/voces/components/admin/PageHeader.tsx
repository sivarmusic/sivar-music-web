// Header de página consistente para /voces/admin/**: título, subtítulo con
// el conteo, acciones a la derecha. Reemplaza los distintos h1/h2 sueltos
// que cada página traía con su propio tamaño/peso/fuente.
//
// Etapa 5: serif SOLO para el título de página (acá), sans para todo lo
// demás en la UI — incluidos los títulos de modal (Modal.tsx), que no son
// título de página. Antes "Crear cliente" estaba en serif por accidente
// (era un form heading, no un h1 de página); ahora que ese texto vive en el
// <h2> del modal, en sans, el criterio queda aplicado sin tocar nada ahí.

export default function PageHeader({
  title,
  count,
  countLabel,
  actions,
}: {
  title: string;
  count?: number;
  countLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1
          className="text-[24px] leading-none"
          style={{ fontFamily: "var(--font-dm-serif, serif)", fontWeight: 400, color: "var(--color-text-primary)" }}
        >
          {title}
        </h1>
        {typeof count === "number" && (
          <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {count} {countLabel || ""}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
