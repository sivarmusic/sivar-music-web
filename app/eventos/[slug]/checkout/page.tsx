'use client'
import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { formatMoney, orderTotal } from '@/lib/format'

interface Event {
  id: string; slug: string; nombre: string; fecha: string
  venue: string; precio: number
}

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-[#F472B6] focus:ring-2 focus:ring-[#F472B6]/40 transition'

function CheckoutForm() {
  const { t, dateLocale } = useLanguage()
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [cantidad, setCantidad] = useState(() => {
    const n = Math.floor(Number(searchParams.get('cantidad') || '1'))
    return Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : 1
  })

  const [event, setEvent] = useState<Event | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ nombre?: string; telefono?: string }>({})

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) {
        const next = `/eventos/${slug}/checkout?${searchParams.toString()}`
        router.replace(`/eventos/mi-cuenta/login?next=${encodeURIComponent(next)}`)
        return
      }

      setToken(session.access_token)
      setEmail(session.user.email ?? '')

      const [evRes, profRes] = await Promise.all([
        fetch(`/api/eventos/events/${slug}`),
        supabaseBrowser
          .from('attendee_profiles')
          .select('nombre, telefono')
          .eq('id', session.user.id)
          .maybeSingle(),
      ])

      const evData = await evRes.json()
      if (!evData.event) { router.push('/eventos'); return }
      setEvent(evData.event)

      if (profRes.data) {
        setNombre(profRes.data.nombre ?? '')
        setTelefono(profRes.data.telefono ?? '')
      } else {
        const meta = session.user.user_metadata ?? {}
        setNombre(meta.nombre || meta.full_name || meta.name || '')
      }
    }
    init()
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!event || !token) return
    const errs: { nombre?: string; telefono?: string } = {}
    if (nombre.trim().length < 2) errs.nombre = t('checkout.errName')
    if (telefono.replace(/\D/g, '').length < 8) errs.telefono = t('checkout.errPhone')
    setFieldErrors(errs)
    if (errs.nombre || errs.telefono) {
      document.getElementById(errs.nombre ? 'co-nombre' : 'co-telefono')?.focus()
      return
    }
    setError(''); setRemaining(null); setLoading(true)
    try {
      const res = await fetch('/api/eventos/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ event_id: event.id, nombre, telefono, email, cantidad }),
      })
      const data = await res.json()
      if (res.status === 409 && typeof data.remaining === 'number') {
        setRemaining(data.remaining)
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error(data.error || t('checkout.errorProcess'))
      router.push(`/eventos/${slug}/pago/${data.order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.errorUnexpected'))
      setLoading(false)
    }
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
        <p className="text-white/30 text-sm">{t('checkout.loading')}</p>
      </div>
    )
  }

  const fecha = new Date(event.fecha)
  const total = orderTotal(cantidad, event.precio)

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-5 py-5 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label={t('checkout.back')} className="text-white/60 hover:text-white text-lg w-11 h-11 -ml-3 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] transition">←</button>
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Sivar Events</p>
          <h1 className="text-white text-lg font-bold">{t('checkout.title')}</h1>
        </div>
      </div>

      <div className="px-5 py-6 max-w-lg mx-auto space-y-5">
        {/* Resumen del evento */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-4">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">{t('checkout.yourOrder')}</p>
          <p className="text-white font-bold text-base">{event.nombre}</p>
          <p className="text-white/60 text-xs mt-1">
            {fecha.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}{event.venue}
          </p>
          <div className="border-t border-white/8 mt-3 pt-3 flex items-center justify-between">
            <span className="text-white/60 text-sm">{cantidad} {cantidad > 1 ? t('detail.tickets') : t('detail.ticket')} × {formatMoney(event.precio)} · {t('detail.general')}</span>
            <span className="text-[#F472B6] font-bold text-base">{formatMoney(total)}</span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{t('checkout.yourData')}</p>

          <div>
            <label htmlFor="co-nombre" className="block text-white/70 text-xs font-bold uppercase tracking-[0.14em] mb-1.5">{t('checkout.fullName')}</label>
            <input
              id="co-nombre"
              type="text"
              autoComplete="name"
              aria-invalid={!!fieldErrors.nombre}
              aria-describedby={fieldErrors.nombre ? 'co-nombre-err' : undefined}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder={t('checkout.fullNamePh')}
              required
              className={INPUT}
            />
            {fieldErrors.nombre && <p id="co-nombre-err" className="text-red-400 text-xs mt-1.5">{fieldErrors.nombre}</p>}
          </div>

          <div>
            <label htmlFor="co-telefono" className="block text-white/70 text-xs font-bold uppercase tracking-[0.14em] mb-1.5">{t('checkout.phone')}</label>
            <input
              id="co-telefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={!!fieldErrors.telefono}
              aria-describedby={fieldErrors.telefono ? 'co-telefono-err' : undefined}
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="+503 7000 0000"
              required
              className={INPUT}
            />
            {fieldErrors.telefono && <p id="co-telefono-err" className="text-red-400 text-xs mt-1.5">{fieldErrors.telefono}</p>}
          </div>

          <div>
            <label htmlFor="co-email" className="block text-white/70 text-xs font-bold uppercase tracking-[0.14em] mb-1.5">{t('checkout.email')}</label>
            <input
              id="co-email"
              type="email"
              autoComplete="email"
              value={email}
              readOnly
              aria-describedby="co-email-note"
              className={INPUT + ' opacity-60 cursor-not-allowed'}
            />
            <p id="co-email-note" className="text-white/50 text-xs mt-1.5">{t('checkout.emailNote')}</p>
          </div>

          <div aria-live="polite" role="status">
            {remaining !== null && (
              <div className="text-sm bg-yellow-400/10 border border-yellow-400/25 rounded-2xl px-4 py-3 space-y-3">
                <p className="text-yellow-200 text-center">
                  {remaining === 0 ? t('checkout.soldOut') : t('checkout.onlyLeft', { n: remaining })}
                </p>
                {remaining > 0 ? (
                  <button
                    type="button"
                    onClick={() => { setCantidad(remaining); setRemaining(null) }}
                    className="w-full min-h-[44px] bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] transition"
                  >
                    {t('checkout.adjustTo')} {remaining} {remaining > 1 ? t('detail.tickets') : t('detail.ticket')} · {formatMoney(orderTotal(remaining, event.precio))}
                  </button>
                ) : (
                  <a href={`/eventos/${slug}`} className="block w-full min-h-[44px] leading-[44px] text-center bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] transition">
                    {t('checkout.backToEvent')}
                  </a>
                )}
              </div>
            )}
          </div>

          <div aria-live="assertive" role="alert">
            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all"
          >
            {loading ? t('checkout.processing') : `${t('checkout.confirm')} → ${formatMoney(total)}`}
          </button>

          <p className="text-center text-white/50 text-xs">
            {t('checkout.footerNote')}
          </p>
        </form>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0008] flex items-center justify-center">
        <p className="text-white/30 text-sm">Cargando...</p>
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  )
}
