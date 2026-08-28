// Header de página consistente para /voces/admin/**: título, subtítulo con
// el conteo, acciones a la derecha. Reemplaza los distintos h1/h2 sueltos
// que cada página traía con su propio tamaño/peso/fuente.
//
// La fuente del título queda en sans por ahora a propósito — la decisión de
// serif-solo-para-títulos es de la etapa 5 (tipografía), no de esta.

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
        <h1 className="text-[22px] font-[500]" style={{ color: "var(--color-text-primary)" }}>
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
