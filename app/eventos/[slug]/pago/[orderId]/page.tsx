'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n'

interface Order {
  id: string; order_code: string; nombre: string; cantidad: number; status: string
  events: { slug: string; nombre: string; precio: number; venue: string; fecha: string } | null
}

const STORAGE_KEY = 'sm_pending'

export default function EventoPagoPage() {
  const { t } = useLanguage()
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/eventos/order/${orderId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.order) { setNotFound(true); return }
        setOrder(d.order)
        if (d.order.status === 'pendiente_comprobante') {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              orderId: d.order.id, orderCode: d.order.order_code,
              nombre: d.order.nombre, slug, expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            }))
          } catch {}
        } else if (['en_revision', 'confirmado'].includes(d.order.status)) {
          try { localStorage.removeItem(STORAGE_KEY) } catch {}
          router.replace(`/eventos/${slug}/gracias/${orderId}`)
        }
      })
      .catch(() => setNotFound(true))
  }, [orderId, slug, router])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; setError('')
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) { setError(t('pago.errorType')); return }
    if (f.size > 5 * 1024 * 1024) { setError(t('pago.errorSize')); return }
    setFile(f)
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f))
  }

  async function handleUpload() {
    if (!file) return; setError(''); setUploading(true)
    try {
      const fd = new FormData(); fd.append('orderId', orderId); fd.append('file', file)
      const res = await fetch('/api/eventos/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('pago.errorUpload'))
      setDone(true)
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      setTimeout(() => router.push(`/eventos/${slug}/gracias/${orderId}`), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pago.errorUnexpected'))
    } finally { setUploading(false) }
  }

  if (notFound) return (
    <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/50 text-sm mb-4">{t('pago.notFound')}</p>
        <a href={`/eventos/${slug}`} className="text-[#F472B6] text-sm">{t('pago.backToEvent')}</a>
      </div>
    </div>
  )

  if (!order) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">{t('pago.loading')}</p></div>

  const total = order.cantidad * (order.events?.precio ?? 10)

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <div className="px-5 py-8 max-w-sm mx-auto space-y-4">
        <a href={`/eventos/${slug}`} className="text-white/35 hover:text-white text-xs transition">{t('pago.back')}</a>

        <div className="text-center mb-2">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-1">Sivar Music</p>
          <p className="text-white/50 text-sm">{order.events?.nombre}</p>
        </div>

        {/* Código de orden */}
        <div className="rounded-2xl border border-[#F472B6]/40 bg-[#F472B6]/10 p-5 text-center">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase mb-2">{t('pago.yourCode')}</p>
          <p className="text-white text-4xl font-bold tracking-wider mb-2">{order.order_code}</p>
          <p className="text-white/55 text-xs">{t('pago.codeNote')} <strong>{t('pago.codeNoteBold')}</strong> {t('pago.codeNoteEnd')}</p>
        </div>

        {/* Total */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs uppercase">{t('pago.totalToTransfer')}</p>
            <p className="text-white/35 text-xs mt-0.5">{order.cantidad} {order.cantidad > 1 ? t('detail.tickets') : t('detail.ticket')} × ${order.events?.precio ?? 10}</p>
          </div>
          <p className="text-white text-3xl font-bold">${total}</p>
        </div>

        {/* Datos bancarios */}
        <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/8">
          {[
            { label: t('pago.bank'), value: 'Banco Agrícola' },
            { label: t('pago.holder'), value: 'Andrea Vanessa Garcia Garcia' },
            { label: t('pago.accountType'), value: t('pago.accountTypeValue') },
            { label: t('pago.account'), value: '3110950846', mono: true },
            { label: t('pago.email'), value: 'admin@sivarmusic.com' },
            { label: t('pago.reference'), value: order.order_code, pink: true },
            { label: t('pago.amount'), value: `$${total}.00`, bold: true },
          ].map(({ label, value, mono, pink, bold }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-white/45 text-sm">{label}</span>
              <span className={`text-sm ${mono ? 'font-mono' : ''} ${pink ? 'text-[#F472B6] font-bold' : ''} ${bold ? 'font-bold text-white' : 'text-white'}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Separador QR */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/35 text-xs">{t('pago.orQr')}</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* QR banco */}
        <div className="rounded-2xl bg-white p-5 flex flex-col items-center gap-3">
          <p className="text-[#BE185D] text-[10px] font-bold tracking-[0.22em] uppercase text-center">{t('pago.scanQr')}</p>
          <Image src="/pinkfest/qr-banco.png" alt="QR Banco Agrícola" width={190} height={190} className="rounded-xl" />
          <div className="text-center">
            <p className="text-gray-800 text-sm font-bold">Andrea Vanessa Garcia Garcia</p>
            <p className="text-gray-500 text-xs">{t('pago.bankSavings')}</p>
            <p className="text-gray-700 font-mono text-sm font-semibold mt-1">3110950846</p>
          </div>
        </div>

        {/* Upload */}
        <div className="space-y-3 pt-2">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.18em]">{t('pago.uploadTitle')}</p>
          <div
            role="button" tabIndex={0}
            onClick={() => document.getElementById('file-input')?.click()}
            className="rounded-2xl border-2 border-dashed border-white/15 hover:border-[#F472B6]/50 bg-white/3 hover:bg-[#F472B6]/5 p-6 flex flex-col items-center gap-3 cursor-pointer transition-all"
          >
            {preview
              ? <img src={preview} alt="Vista previa" className="w-28 h-28 object-cover rounded-xl shadow-lg" />
              : <div className="w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center text-2xl">📎</div>
            }
            <div className="text-center">
              <p className="text-white/60 text-sm">{file ? file.name : t('pago.uploadCta')}</p>
              <p className="text-white/25 text-xs mt-1">{t('pago.uploadTypes')}</p>
            </div>
          </div>
          <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} className="hidden" />

          {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}

          {file && !done && (
            <button onClick={handleUpload} disabled={uploading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {uploading ? t('pago.uploading') : t('pago.sendReceipt')}
            </button>
          )}
          {done && <p className="text-green-400 font-semibold text-sm text-center py-2">{t('pago.receiptReceived')}</p>}
        </div>
      </div>
    </div>
  )
}
