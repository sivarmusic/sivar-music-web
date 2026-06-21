'use client'
import { useEffect, useState } from 'react'

interface Ticket {
  id: string
  ticket_number: number
  qr_token: string
  check_in_at: string | null
}

interface Props {
  order: { id: string; order_code: string; nombre: string; cantidad: number; pinkfest_tickets: Ticket[] }
  onClose: () => void
  onRefresh: () => void
}

function QRImage({ token, label }: { token: string; label: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    async function generate() {
      const QRCode = (await import('qrcode')).default
      const url = `${window.location.origin}/pinkfest/verificar/${token}`
      const data = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#160010', light: '#ffffff' },
      })
      setDataUrl(data)
    }
    generate()
  }, [token])

  if (!dataUrl) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 text-sm">
        Generando...
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <div className="bg-white p-3 rounded-2xl shadow-lg">
        <img src={dataUrl} alt={label} className="w-52 h-52" />
      </div>
      <a
        href={dataUrl}
        download={`${label.replace(/\s/g, '-')}.png`}
        className="text-[#F472B6] text-xs hover:underline"
      >
        Descargar este QR
      </a>
    </div>
  )
}

export default function QRModal({ order, onClose, onRefresh }: Props) {
  const [generating, setGenerating] = useState(false)
  const tickets = order.pinkfest_tickets ?? []
  const total = order.cantidad

  async function generateTickets() {
    setGenerating(true)
    try {
      await fetch(`/api/pinkfest/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmado' }),
      })
      await onRefresh()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-[#160010] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-none">
          <div>
            <p className="text-[#F472B6] text-xs font-bold">{order.order_code}</p>
            <p className="text-white text-sm font-semibold">{order.nombre}</p>
            <p className="text-white/40 text-xs">{total} entrada{total > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/14 text-white/60 hover:text-white text-lg transition"
          >
            ×
          </button>
        </div>

        {/* QRs scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-8">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-white/40 text-sm text-center">
                No hay tickets generados para esta orden.
              </p>
              <button
                onClick={generateTickets}
                disabled={generating}
                className="bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white text-sm font-bold rounded-2xl px-6 py-3 transition"
              >
                {generating ? 'Generando...' : 'Generar tickets ahora'}
              </button>
            </div>
          ) : (
            tickets
              .sort((a, b) => a.ticket_number - b.ticket_number)
              .map(ticket => (
                <div key={ticket.id} className="space-y-2">
                  <QRImage
                    token={ticket.qr_token}
                    label={`${order.order_code} — Entrada ${ticket.ticket_number} de ${total}`}
                  />
                  {ticket.check_in_at && (
                    <p className="text-green-400/70 text-xs text-center">
                      ✓ Ingresó a las {new Date(ticket.check_in_at).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ))
          )}
        </div>

        {/* Footer: compartir enlace */}
        {tickets.length > 0 && (
          <div className="border-t border-white/10 px-5 py-4 flex-none">
            <button
              onClick={() => {
                const links = tickets
                  .sort((a, b) => a.ticket_number - b.ticket_number)
                  .map(t => `Entrada ${t.ticket_number}/${total}: ${window.location.origin}/pinkfest/verificar/${t.qr_token}`)
                  .join('\n')
                navigator.share?.({
                  title: `Entradas Pink Fest ${order.order_code}`,
                  text: `Tus entradas para Pink Fest:\n${links}`,
                }).catch(() => {
                  navigator.clipboard?.writeText(links)
                })
              }}
              className="w-full border border-white/15 text-white/60 hover:text-white text-sm rounded-2xl py-3 transition"
            >
              Compartir enlaces de entradas
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
