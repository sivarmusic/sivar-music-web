'use client'
import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { formatMoney, formatMoneyFull, orderTotal } from '@/lib/format'
import { copyFor, type CopyKey } from '../../copy'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'
import OrderSteps from '../../components/ui/OrderSteps'
import QtyStepper from '../../components/ui/QtyStepper'
import { fmtDate, fmtTime, splitOn } from '../../components/ui/format'

interface Event {
  id: string; slug: string; nombre: string; fecha: string
  venue: string; precio: number; imagen_url?: string | null
}

type FieldErrors = { nombre?: string; telefono?: string }

/** Tope del selector (igual que en el detalle). El servidor admite hasta 20. */
const MAX_QTY = 10

function Loading({ label }: { label: string }) {
  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main" className="ev-state-screen" aria-busy="true">
        <p className="ev-muted" role="status">{label}</p>
      </main>
      <SiteFooter />
    </div>
  )
}

function CheckoutForm() {
  const { lang, t, dateLocale } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
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
  const [requested, setRequested] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [invalidCount, setInvalidCount] = useState(0)
  const [phoneActive, setPhoneActive] = useState(false)

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
    if (!event || !token || loading) return
    const errs: FieldErrors = {}
    if (nombre.trim().length < 2) errs.nombre = t('checkout.errName')
    if (telefono.replace(/\D/g, '').length < 8) errs.telefono = t('checkout.errPhone')
    setFieldErrors(errs)
    setPhoneActive(false)
    setInvalidCount(Object.keys(errs).length)
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
      if (res.status === 409 && data.code === 'phone_active') {
        setFieldErrors({ telefono: c('evc.phoneActive') })
        setPhoneActive(true)
        setLoading(false)
        document.getElementById('co-telefono')?.focus()
        return
      }
      if (res.status === 409 && typeof data.remaining === 'number') {
        setRemaining(data.remaining)
        setRequested(cantidad)
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

  function changeQty(n: number) {
    setCantidad(n)
    setRemaining(null)
  }

  if (!event) return <Loading label={t('checkout.loading')} />

  const fecha = new Date(event.fecha)
  const total = orderTotal(cantidad, event.precio)
  const maxQty = Math.max(MAX_QTY, cantidad)
  const left = splitOn(c('evc.stockText'), 'left')
  const emailHint = splitOn(c('evc.emailHint'), 'account')

  return (
    <div className="ev-surface">
      <SiteHeader />

      <main id="main" className="ev-container ev-page">
        <Link className="ev-back-link" href={`/eventos/${slug}`}>
          <Icon name="arrow-left" size="sm" />{event.nombre}
        </Link>

        <OrderSteps current={0} style={{ marginTop: 'var(--ev-space-4)' }} />

        <h1 className="ev-display ev-display--md" style={{ marginTop: 'var(--ev-space-6)' }}>{c('evc.title')}</h1>
        <p className="ev-lead" style={{ marginTop: 'var(--ev-space-2)' }}>{c('evc.lead')}</p>

        <div className="ev-split-2" style={{ marginTop: 'var(--ev-space-8)' }}>
          {/* Resumen (arriba en mobile, a la derecha en desktop) */}
          <aside aria-labelledby="ev-h-resumen" className="ev-split-2__aside">
            <div className="ev-ticket">
              <div className="ev-ticket__section" style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 'var(--ev-space-4)', alignItems: 'center' }}>
                <div className="ev-event-card__media" style={{ width: 72, borderRadius: 4 }}>
                  {event.imagen_url ? (
                    <Image src={event.imagen_url} alt="" width={72} height={90} className="object-cover" />
                  ) : (
                    <div className="ev-poster-fallback" aria-hidden="true">
                      <span className="ev-poster-fallback__name">{event.nombre}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="ev-ticket__label" id="ev-h-resumen">{c('evc.summary')}</h2>
                  <p className="ev-display" style={{ fontSize: '1.75rem', marginTop: 4 }}>{event.nombre}</p>
                  <p className="ev-ticket__muted">
                    {fmtDate(fecha, dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(fecha, dateLocale)} · {event.venue}
                  </p>
                </div>
              </div>
              <div className="ev-ticket__perf" aria-hidden="true" />
              <div className="ev-ticket__section ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-4)' }}>
                <div className="ev-ticket__row" style={{ alignItems: 'center' }}>
                  <span className="ev-ticket__label" id="ev-qty-co">{c('evc.qty')}</span>
                  <QtyStepper
                    paper
                    value={cantidad}
                    max={maxQty}
                    onChange={changeQty}
                    labelledBy="ev-qty-co"
                    decLabel={c('evd.qtyDec')}
                    incLabel={c('evd.qtyInc')}
                    inputLabel={c('evd.qtyInput')}
                    style={{ gridTemplateColumns: '48px 52px 48px' }}
                    inputStyle={{ fontSize: '1.5rem' }}
                  />
                </div>
                <div className="ev-ticket__row">
                  <span className="ev-ticket__muted">
                    {cantidad} {cantidad > 1 ? t('detail.tickets') : t('detail.ticket')} × {formatMoneyFull(event.precio)}
                  </span>
                  <span className="ev-ticket__total">{formatMoneyFull(total)}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="ev-split-2__main">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="ev-stack ev-stack--lg"
              aria-busy={loading}
            >
              {invalidCount > 0 && (
                <div className="ev-banner ev-banner--error" role="alert">
                  <Icon name="alert-triangle" />
                  <div>
                    <p className="ev-banner__title">
                      {invalidCount === 1 ? c('evc.reviewOne') : c('evc.reviewMany', { n: invalidCount })}
                    </p>
                    <p className="ev-banner__text">{c('evc.reviewText')}</p>
                  </div>
                </div>
              )}

              {remaining !== null && (
                <div className="ev-banner ev-banner--warning" role="alert">
                  <Icon name="alert-triangle" />
                  <div>
                    <p className="ev-banner__title">
                      {remaining === 0 ? t('checkout.soldOut') : c('evc.stockTitle', { n: requested })}
                    </p>
                    {remaining > 0 && (
                      <p className="ev-banner__text">
                        {left
                          ? <>{left[0]}<strong>{remaining}</strong>{left[1]}</>
                          : c('evc.stockText', { left: remaining })}
                      </p>
                    )}
                  </div>
                  <div className="ev-banner__actions">
                    {remaining > 0 ? (
                      <button
                        type="button"
                        className="ev-btn ev-btn--primary ev-btn--sm"
                        onClick={() => { setCantidad(remaining); setRemaining(null) }}
                      >
                        {c('evc.buyN', { n: remaining })} · {formatMoney(orderTotal(remaining, event.precio))}
                      </button>
                    ) : (
                      <Link className="ev-btn ev-btn--secondary ev-btn--sm" href={`/eventos/${slug}`}>{t('checkout.backToEvent')}</Link>
                    )}
                    <Link className="ev-btn ev-btn--ghost ev-btn--sm" href="/eventos">{c('evc.otherEvents')}</Link>
                  </div>
                </div>
              )}

              {error && (
                <div className="ev-banner ev-banner--error" role="alert">
                  <Icon name="alert-triangle" />
                  <div><p className="ev-banner__title">{error}</p></div>
                </div>
              )}

              <div className="ev-form-grid">
                <div className={`ev-field${fieldErrors.nombre ? ' ev-field--error' : ''}`}>
                  <label className="ev-field__label" htmlFor="co-nombre">{t('checkout.fullName')}</label>
                  <input
                    className="ev-input"
                    id="co-nombre"
                    type="text"
                    autoComplete="name"
                    placeholder={t('checkout.fullNamePh')}
                    aria-invalid={!!fieldErrors.nombre}
                    aria-describedby={fieldErrors.nombre ? 'co-nombre-err' : undefined}
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    disabled={loading}
                    required
                  />
                  {fieldErrors.nombre && (
                    <p className="ev-field__error" id="co-nombre-err"><Icon name="alert-circle" size="sm" />{fieldErrors.nombre}</p>
                  )}
                </div>

                <div className={`ev-field${fieldErrors.telefono ? ' ev-field--error' : ''}`}>
                  <label className="ev-field__label" htmlFor="co-telefono">{t('checkout.phone')}</label>
                  <div className="ev-field__control">
                    <Icon name="phone" />
                    <input
                      className="ev-input"
                      id="co-telefono"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="7123 4567"
                      aria-invalid={!!fieldErrors.telefono}
                      aria-describedby={fieldErrors.telefono ? 'co-telefono-err' : 'co-telefono-hint'}
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  {fieldErrors.telefono
                    ? <p className="ev-field__error" id="co-telefono-err"><Icon name="alert-circle" size="sm" />{fieldErrors.telefono}</p>
                    : <p className="ev-field__hint" id="co-telefono-hint">{c('evc.phoneHint')}</p>}
                </div>

                <div className="ev-field">
                  <label className="ev-field__label" htmlFor="co-email">
                    {t('checkout.email')}
                    <span className="ev-field__lock"><Icon name="lock" size="sm" />{c('evc.fromAccount')}</span>
                  </label>
                  <div className="ev-field__control">
                    <Icon name="mail" />
                    <input
                      className="ev-input"
                      id="co-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      readOnly
                      aria-describedby="co-email-note"
                    />
                  </div>
                  <p className="ev-field__hint" id="co-email-note">
                    {emailHint
                      ? <>{emailHint[0]}<Link href="/eventos/mi-cuenta">{c('evc.myAccount')}</Link>{emailHint[1]}</>
                      : t('checkout.emailNote')}
                  </p>
                </div>
              </div>

              {phoneActive && (
                <div className="ev-banner ev-banner--info">
                  <Icon name="info" />
                  <div>
                    <p className="ev-banner__title">{c('evc.activeTitle')}</p>
                    <p className="ev-banner__text">{c('evc.activeText')}</p>
                  </div>
                </div>
              )}

              <div className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-3)' }}>
                <button
                  type="submit"
                  className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`}
                  disabled={!token || remaining !== null}
                  aria-disabled={loading || undefined}
                >
                  {loading ? c('evc.generating') : <>{c('evc.continue')} <Icon name="arrow-right" size="lg" /></>}
                </button>
                {loading && <p className="ev-visually-hidden" role="status">{c('evc.generatingStatus')}</p>}
                <p className="ev-subtle" style={{ textAlign: 'center' }}>{t('checkout.footerNote')}</p>
              </div>
            </form>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="ev-surface" aria-busy="true" />}>
      <CheckoutForm />
    </Suspense>
  )
}
