'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'

interface Order {
  id: string
  order_code: string
  nombre: string
  cantidad: number
}

interface Props {
  order: Order
  onSuccess: () => void
  onBack: () => void
}

export default function PaymentStep({ order, onSuccess, onBack }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const total = order.cantidad * 10

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')

    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) {
      setError('Solo JPG, PNG, WebP o PDF.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('El archivo supera los 5MB.')
      return
    }

    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  async function handleUpload() {
    if (!file) return
    setError('')
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('orderId', order.id)
      fd.append('file', file)

      const res = await fetch('/api/pinkfest/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir')

      setDone(true)
      setTimeout(onSuccess, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Intentá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-4 pb-10">

      {/* Botón volver */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition -mt-2 mb-2"
      >
        ← Volver
      </button>

      {/* Código de orden */}
      <div className="rounded-2xl border border-[#F472B6]/40 bg-[#F472B6]/10 p-5 text-center">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase mb-2">
          Tu código de orden
        </p>
        <p className="text-white text-4xl font-bold tracking-wider mb-2">{order.order_code}</p>
        <p className="text-white/55 text-xs leading-relaxed">
          Incluí este código en el <span className="text-white/90 font-semibold">concepto / motivo</span> de tu transferencia
        </p>
      </div>

      {/* Total */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider">Total a transferir</p>
          <p className="text-white text-xs mt-0.5">{order.cantidad} entrada{order.cantidad > 1 ? 's' : ''} × $10</p>
        </div>
        <p className="text-white text-3xl font-bold">${total}</p>
      </div>

      {/* Datos bancarios en texto */}
      <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/8">
        {[
          { label: 'Banco', value: 'Banco Agrícola' },
          { label: 'Titular', value: 'Andrea Vanessa Garcia Garcia' },
          { label: 'Tipo de cuenta', value: 'Ahorros' },
          { label: 'Cuenta', value: '3110950846', mono: true },
          { label: 'Concepto', value: order.order_code, pink: true },
          { label: 'Monto', value: `$${total}.00`, bold: true },
        ].map(({ label, value, mono, pink, bold }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-white/45 text-sm">{label}</span>
            <span className={`text-sm ${mono ? 'font-mono' : ''} ${pink ? 'text-[#F472B6] font-bold' : ''} ${bold ? 'font-bold text-white' : 'text-white'}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/35 text-xs">o si tenés Banco Agrícola, escaneá el QR</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* QR del banco */}
      <div className="rounded-2xl bg-white p-5 flex flex-col items-center gap-3">
        <p className="text-[#BE185D] text-[10px] font-bold tracking-[0.22em] uppercase text-center">Escanea el QR para transferir desde la app del Banco Agrícola</p>
        <Image
          src="/pinkfest/qr-banco.png"
          alt="QR transferencia Banco Agrícola Andrea Garcia"
          width={190}
          height={190}
          className="rounded-xl"
        />
        <div className="text-center">
          <p className="text-gray-800 text-sm font-bold">Andrea Vanessa Garcia Garcia</p>
          <p className="text-gray-500 text-xs">Banco Agrícola</p>
          <p className="text-gray-700 font-mono text-sm font-semibold mt-1">3110950846</p>
        </div>
      </div>

      {/* Upload comprobante */}
      <div className="space-y-3">
        <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.18em]">
          Ya transferiste? Subí el comprobante
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-white/15 hover:border-[#F472B6]/50 active:border-[#F472B6]/70 bg-white/3 hover:bg-[#F472B6]/5 p-6 flex flex-col items-center gap-3 cursor-pointer transition-all"
        >
          {preview ? (
            <img src={preview} alt="Vista previa" className="w-28 h-28 object-cover rounded-xl shadow-lg" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center text-2xl">
              📎
            </div>
          )}
          <div className="text-center">
            <p className="text-white/60 text-sm">
              {file ? file.name : 'Tocá para adjuntar el comprobante'}
            </p>
            <p className="text-white/25 text-xs mt-1">JPG · PNG · WebP · PDF · máx. 5MB</p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">
            {error}
          </p>
        )}

        {file && !done && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all"
          >
            {uploading ? 'Subiendo...' : 'Enviar comprobante'}
          </button>
        )}

        {file && !done && (
          <button
            onClick={() => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = '' }}
            className="w-full text-white/35 hover:text-white/60 text-xs py-2 transition"
          >
            Elegir otro archivo
          </button>
        )}

        {done && (
          <div className="text-center py-2">
            <p className="text-green-400 font-semibold text-sm">Comprobante recibido ✓</p>
          </div>
        )}
      </div>
    </div>
  )
}
