/** Punto de estado 8px + texto mono. Abierto pulsa; cerrado es gris. */
export default function StatusDot({ open, label }: { open: boolean; label: string }) {
  return (
    <span className="cs-status">
      <span aria-hidden="true" className={`cs-dot ${open ? "cs-dot--open" : "cs-dot--closed"}`} />
      <span className="cs-mono">{label}</span>
    </span>
  );
}
