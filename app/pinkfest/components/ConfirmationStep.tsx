interface Order {
  id: string
  order_code: string
  nombre: string
  cantidad: number
}

export default function ConfirmationStep({ order }: { order: Order }) {
  const firstName = order.nombre.split(' ')[0]

  return (
    <div className="w-full max-w-sm text-center space-y-6 py-4">
      <div className="text-5xl">🎉</div>

      <div>
        <h2 className="text-white text-2xl font-bold mb-2">¡Gracias, {firstName}!</h2>
        <p className="text-white/55 text-sm leading-relaxed max-w-xs mx-auto">
          Recibimos tu comprobante y lo estamos revisando.
          Te confirmaremos por WhatsApp en las próximas horas.
        </p>
      </div>

      <div className="rounded-2xl border border-[#F472B6]/35 bg-[#F472B6]/8 p-5">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase mb-2">Tu código</p>
        <p className="text-white text-3xl font-bold tracking-wider">{order.order_code}</p>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/8 text-sm text-left">
        {[
          { label: 'Entradas', value: `${order.cantidad}` },
          { label: 'Donación total', value: `$${order.cantidad * 10}` },
          { label: 'Evento', value: 'Pink Fest' },
          { label: 'Fecha', value: 'Dom 12 Jul · 4:00 PM' },
          { label: 'Lugar', value: 'Beerhaus' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between px-4 py-3">
            <span className="text-white/45">{label}</span>
            <span className="text-white font-medium">{value}</span>
          </div>
        ))}
      </div>

      <p className="text-white/30 text-xs pb-4">A beneficio de Fundación Hogar Felino 🐱</p>
    </div>
  )
}
