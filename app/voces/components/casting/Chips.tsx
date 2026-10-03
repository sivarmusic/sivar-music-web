/** Fila de etiquetas: label mono a la izquierda + chips con wrap. */
export function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="cs-chiprow">
      <span className="cs-chiprow-label cs-mono">{label}</span>
      <ul className="cs-chips">
        {items.map((s, i) => (
          <li key={`${s}-${i}`} className="cs-chip">{s}</li>
        ))}
      </ul>
    </div>
  );
}
