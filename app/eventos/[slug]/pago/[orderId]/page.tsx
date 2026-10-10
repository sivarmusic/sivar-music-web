'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n'
import { formatMoney, formatMoneyFull, orderTotal } from '@/lib/format'

interface Order {
  id: string; order_code: string; nombre: string; cantidad: number; status: string
  events: { slug: string; nombre: string; precio: number; venue: string; fecha: string } | null
}

const STORAGE_KEY = 'sm_pending'

function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${t('pago.copyLabel')} ${label}`}
      className="ml-2 min-h-[44px] min-w-[44px] px-3 text-xs font-semibold text-[#F472B6] hover:text-white rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] transition"
    >
      <span aria-live="polite">{copied ? t('pago.copied') : t('pago.copy')}</span>
    </button>
  )
}

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
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false)

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
      if (res.status === 409) { setAlreadyConfirmed(true); return }
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

  const precio = order.events?.precio
  const total = precio != null ? orderTotal(order.cantidad, precio) : null

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <div className="px-5 py-8 max-w-sm mx-auto space-y-4">
        <a href={`/eventos/${slug}`} className="inline-flex items-center min-h-[44px] text-white/60 hover:text-white text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] rounded-lg">{t('pago.back')}</a>

        <div className="text-center mb-2">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-1">Sivar Music</p>
          <p className="text-white/70 text-sm">{order.events?.nombre}</p>
        </div>

        {/* Código de orden */}
        <div className="rounded-2xl border border-[#F472B6]/40 bg-[#F472B6]/10 p-5 text-center">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase mb-2">{t('pago.yourCode')}</p>
          <p className="text-white text-4xl font-bold tracking-wider mb-2">{order.order_code}</p>
          <p className="text-white/70 text-xs">{t('pago.codeNote')} <strong>{t('pago.codeNoteBold')}</strong> {t('pago.codeNoteEnd')}</p>
          <div className="mt-1 flex justify-center"><CopyButton value={order.order_code} label={t('pago.yourCode')} /></div>
        </div>

        <p className="text-white/60 text-xs text-center">{t('pago.steps')}</p>

        {/* Total */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs uppercase">{t('pago.totalToTransfer')}</p>
            <p className="text-white/60 text-xs mt-0.5">{order.cantidad} {order.cantidad > 1 ? t('detail.tickets') : t('detail.ticket')}{precio != null && <> × {formatMoney(precio)}</>}</p>
          </div>
          <p className="text-white text-3xl font-bold">{total != null ? formatMoney(total) : '—'}</p>
        </div>

        {/* Datos bancarios */}
        <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/8">
          {[
            { label: t('pago.bank'), value: 'Banco Agrícola' },
            { label: t('pago.holder'), value: 'Andrea Vanessa Garcia Garcia' },
            { label: t('pago.accountType'), value: t('pago.accountTypeValue') },
            { label: t('pago.account'), value: '3110950846', mono: true, copy: '3110950846' },
            { label: t('pago.email'), value: 'admin@sivarmusic.com' },
            { label: t('pago.reference'), value: order.order_code, pink: true, copy: order.order_code },
            ...(total != null ? [{ label: t('pago.amount'), value: formatMoneyFull(total), bold: true, copy: total.toFixed(2) }] : []),
          ].map(({ label, value, mono, pink, bold, copy }: { label: string; value: string; mono?: boolean; pink?: boolean; bold?: boolean; copy?: string }) => (
            <div key={label} className="flex items-center justify-between gap-2 pl-4 pr-1 py-1.5 min-h-[48px]">
              <span className="text-white/60 text-sm shrink-0">{label}</span>
              <span className="flex items-center min-w-0">
                <span className={`text-sm text-right break-words min-w-0 ${mono ? 'font-mono' : ''} ${pink ? 'text-[#F472B6] font-bold' : ''} ${bold ? 'font-bold text-white' : 'text-white'}`}>{value}</span>
                {copy ? <CopyButton value={copy} label={label} /> : <span className="w-3" />}
              </span>
            </div>
          ))}
        </div>

        {/* Separador QR */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/60 text-xs">{t('pago.orQr')}</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* QR banco */}
        <div className="rounded-2xl bg-white p-5 flex flex-col items-center gap-3">
          <p className="text-[#BE185D] text-[10px] font-bold tracking-[0.22em] uppercase text-center">{t('pago.scanQr')}</p>
          <Image src="/eventos/qr-banco.png" alt="QR Banco Agrícola" width={190} height={190} className="rounded-xl" />
          <div className="text-center">
            <p className="text-gray-800 text-sm font-bold">Andrea Vanessa Garcia Garcia</p>
            <p className="text-gray-500 text-xs">{t('pago.bankSavings')}</p>
            <p className="text-gray-700 font-mono text-sm font-semibold mt-1">3110950846</p>
          </div>
        </div>

        {/* Upload */}
        <div className="space-y-3 pt-2">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.18em]">{t('pago.uploadTitle')}</p>
          <label
            htmlFor="file-input"
            className="rounded-2xl border-2 border-dashed border-white/20 hover:border-[#F472B6]/60 bg-white/3 hover:bg-[#F472B6]/5 p-6 flex flex-col items-center gap-3 cursor-pointer transition-all focus-within:border-[#F472B6] focus-within:ring-2 focus-within:ring-[#F472B6]/40"
          >
            {preview
              ? <img src={preview} alt="Vista previa" className="w-28 h-28 object-cover rounded-xl shadow-lg" />
              : <div className="w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center text-2xl" aria-hidden="true">📎</div>
            }
            <div className="text-center">
              <p className="text-white/80 text-sm break-all">{file ? file.name : t('pago.uploadCta')}</p>
              <p className="text-white/50 text-xs mt-1">{t('pago.uploadTypes')}</p>
              <p className="text-[#F472B6] text-xs font-semibold mt-2">{file ? t('pago.changeFile') : t('pago.chooseFile')}</p>
            </div>
            <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} className="sr-only" />
          </label>

          <div role="alert" aria-live="assertive">
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}
          </div>
          {alreadyConfirmed && (
            <div role="status" className="text-sm bg-green-400/10 border border-green-400/25 rounded-2xl px-4 py-3 space-y-3 text-center">
              <p className="text-green-300">{t('pago.alreadyConfirmed')}</p>
              <a href={`/eventos/${slug}/gracias/${orderId}`} className="block min-h-[44px] leading-[44px] bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] transition">{t('pago.seeOrder')}</a>
            </div>
          )}

          {file && !done && !alreadyConfirmed && (
            <button type="button" onClick={handleUpload} disabled={uploading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all">
              {uploading ? t('pago.uploading') : t('pago.sendReceipt')}
            </button>
          )}
          {done && <p role="status" className="text-green-400 font-semibold text-sm text-center py-2">{t('pago.receiptReceived')}</p>}
        </div>
      </div>
    </div>
  )
}
