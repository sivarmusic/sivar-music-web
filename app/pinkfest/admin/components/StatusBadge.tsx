type Status = 'pendiente_comprobante' | 'en_revision' | 'confirmado' | 'rechazado'

const MAP: Record<Status, { label: string; cls: string }> = {
  pendiente_comprobante: { label: 'Pendiente',    cls: 'bg-white/10 text-white/55' },
  en_revision:          { label: 'En revisión',   cls: 'bg-yellow-500/20 text-yellow-400' },
  confirmado:           { label: 'Confirmado',    cls: 'bg-green-500/20 text-green-400' },
  rechazado:            { label: 'Rechazado',     cls: 'bg-red-500/20 text-red-400' },
}

export default function StatusBadge({ status }: { status: string }) {
  const { label, cls } = MAP[status as Status] ?? { label: status, cls: 'bg-white/10 text-white/40' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
