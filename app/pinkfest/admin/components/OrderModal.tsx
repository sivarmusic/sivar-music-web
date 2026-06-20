'use client'
import { useEffect, useState } from 'react'

interface Order {
  id: string
  order_code: string
  nombre: string
  comprobante_path: string | null
}

export default function OrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!order.comprobante_path) return
    fetch(`/api/pinkfest/signed-url?path=${encodeURIComponent(order.comprobante_path)}`)
      .then(r => r.json())
      .then(d => { if (d.url) setUrl(d.url); else setError('No se pudo cargar') })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [order.comprobante_path])

  const isPdf = order.comprobante_path?.endsWith('.pdf')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-[#160010] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-[#F472B6] text-xs font-bold">{order.order_code}</p>
            <p className="text-white text-sm font-semibold">{order.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/14 text-white/60 hover:text-white transition text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4 min-h-[180px] justify-center">
          {loading && <p className="text-white/40 text-sm">Cargando comprobante...</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {url && !loading && (
            <>
              {!isPdf && (
                <img
                  src={url}
                  alt="Comprobante de pago"
                  className="rounded-2xl max-h-72 w-full object-contain bg-white/5"
                />
              )}
              {isPdf && (
                <p className="text-white/50 text-sm text-center">
                  El comprobante es un archivo PDF.
                </p>
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center border border-[#F472B6]/35 text-[#F472B6] rounded-2xl py-3 text-sm hover:bg-[#F472B6]/10 transition font-medium"
              >
                {isPdf ? 'Abrir PDF en nueva pestaña →' : 'Ver imagen completa →'}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
