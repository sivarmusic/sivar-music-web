/** Ficha técnica: etiqueta mono a la izquierda + valores en display separados por barras. */
export function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="cs-spec-row">
      <span className="cs-spec-label cs-mono">{label}</span>
      <ul className="cs-spec-vals">
        {items.map((s, i) => (
          <li key={`${s}-${i}`}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
