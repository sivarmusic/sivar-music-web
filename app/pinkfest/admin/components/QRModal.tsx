'use client'
import { useEffect, useState } from 'react'

interface Props {
  order: { order_code: string; nombre: string; cantidad: number; qr_token: string }
  onClose: () => void
}

export default function QRModal({ order, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    async function generate() {
      const QRCode = (await import('qrcode')).default
      const url = `${window.location.origin}/pinkfest/verificar/${order.qr_token}`
      const data = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: '#160010', light: '#ffffff' },
      })
      setDataUrl(data)
    }
    generate()
  }, [order.qr_token])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xs bg-[#160010] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-[#F472B6] text-xs font-bold">{order.order_code}</p>
            <p className="text-white text-sm font-semibold">{order.nombre}</p>
            <p className="text-white/40 text-xs">{order.cantidad} entrada{order.cantidad > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/14 text-white/60 hover:text-white text-lg transition"
          >
            ×
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {dataUrl ? (
            <>
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <img src={dataUrl} alt={`QR entrada ${order.order_code}`} className="w-56 h-56" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-white font-bold text-sm">{order.order_code}</p>
                <p className="text-white/40 text-xs">Mandá este QR al comprador por WhatsApp</p>
              </div>

              <div className="w-full space-y-2">
                <a
                  href={dataUrl}
                  download={`${order.order_code}-entrada.png`}
                  className="block w-full text-center bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-wider rounded-2xl py-3 transition"
                >
                  Descargar QR
                </a>
                <button
                  onClick={() => {
                    navigator.share?.({
                      title: `Entrada Pink Fest ${order.order_code}`,
                      text: `Tu entrada para Pink Fest — código ${order.order_code}`,
                      url: `${window.location.origin}/pinkfest/verificar/${order.qr_token}`,
                    }).catch(() => {})
                  }}
                  className="w-full border border-white/15 text-white/60 hover:text-white text-sm rounded-2xl py-3 transition"
                >
                  Compartir enlace
                </button>
              </div>
            </>
          ) : (
            <p className="text-white/40 text-sm py-10">Generando QR...</p>
          )}
        </div>
      </div>
    </div>
  )
}
