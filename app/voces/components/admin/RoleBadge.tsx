// Badge de rol para tablas de clientes/usuarios. Antes: un pill "Sí"/"No" en
// TODAS las filas — con 9 clientes casi todos admin, esa columna no
// distinguía nada. Ahora: solo se marca lo que es distinto (admin), el resto
// no lleva badge — la ausencia de marca ES la información.

export default function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) {
    return <span style={{ color: "var(--color-text-muted)" }}>—</span>;
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-[500]"
      style={{ background: "var(--color-accent-bg)", border: "0.5px solid var(--color-accent-border)", color: "var(--color-accent)" }}
    >
      Admin
    </span>
  );
}
