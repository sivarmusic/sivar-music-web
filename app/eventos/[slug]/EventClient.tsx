'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import EventMap from '../components/EventMap'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { formatMoneyFull, orderTotal } from '@/lib/format'
import { copyFor, type CopyKey } from '../copy'
import { Icon } from '../components/icons'
import SiteHeader from '../components/site/SiteHeader'
import SiteFooter from '../components/site/SiteFooter'
import QtyStepper from '../components/ui/QtyStepper'
import { fmtDate, fmtTime } from '../components/ui/format'

interface Event {
  id: string; slug: string; nombre: string; descripcion: string
  fecha: string; venue: string; direccion: string; lat: number | null; lng: number | null
  imagen_url: string | null; precio: number; artistas: string[]
  /** Aditivos de la API pública: remaining solo viene cuando quedan <= 20. */
  soldOut?: boolean; remaining?: number | null
}

/** Tope por orden en el selector (el servidor admite hasta 20). */
const MAX_QTY = 10
const INSTAGRAM = 'http://instagram.com/sivar.music'

function upperFirst(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export default function EventClient() {
  const { lang, t, dateLocale } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [cantidad, setCantidad] = useState(1)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/eventos/events/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.event) setEvent(d.event); else setNotFound(true) })
      .catch(() => setNotFound(true))
  }, [slug])

  async function handleComprar() {
    if (!event) return
    setBusy(true)
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const checkoutUrl = `/eventos/${slug}/checkout?cantidad=${qty}`
    if (session) {
      router.push(checkoutUrl)
    } else {
      router.push(`/eventos/mi-cuenta/login?next=${encodeURIComponent(checkoutUrl)}`)
    }
  }

  if (notFound) {
    return (
      <div className="ev-surface">
        <SiteHeader />
        <main id="main" className="ev-state-screen">
          <div className="ev-stack">
            <p className="ev-lead">{t('detail.notFound')}</p>
            <Link href="/eventos" className="ev-link-arrow">{t('detail.backToAll')}</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="ev-surface">
        <SiteHeader />
        <main id="main" className="ev-state-screen" aria-busy="true">
          <p className="ev-muted" role="status">{t('detail.loading')}</p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const fecha = new Date(event.fecha)
  const soldOut = event.soldOut === true
  const left = typeof event.remaining === 'number' ? event.remaining : null
  const few = !soldOut && left !== null
  // Si quedan menos que el tope, el "+" se frena en ese número (DESIGN §10.8).
  const maxQty = left !== null ? Math.max(1, Math.min(MAX_QTY, left)) : MAX_QTY
  const qty = Math.min(cantidad, maxQty)
  const total = orderTotal(qty, event.precio)
  const price = formatMoneyFull(event.precio)
  const hasMap = !!(event.lat && event.lng)
  const paragraphs = (event.descripcion ?? '').split(/\n+/).map(p => p.trim()).filter(Boolean)
  const cappedByStock = left !== null && left < MAX_QTY && qty >= maxQty

  const buyLabel = `${t('detail.buy')} ${qty}`
  const chip = few ? (
    <span className="ev-chip ev-chip--pending"><Icon name="alert-circle" />{c('evd.fewLeft', { n: left! })}</span>
  ) : (
    <span className="ev-chip ev-chip--confirmed"><Icon name="check" />{c('evd.available')}</span>
  )

  const stepper = (paper: boolean) => (
    <QtyStepper
      value={qty}
      max={maxQty}
      onChange={setCantidad}
      paper={paper}
      iconSize={paper ? 'lg' : undefined}
      decLabel={c('evd.qtyDec')}
      incLabel={c('evd.qtyInc')}
      inputLabel={c('evd.qtyInput')}
      groupLabel={c('evd.qty')}
    />
  )

  return (
    <div className="ev-surface">
      <SiteHeader />

      <main id="main" className="ev-container">
        <Link className="ev-back-link" href="/eventos" style={{ marginTop: 'var(--ev-space-2)' }}>
          <Icon name="arrow-left" size="sm" />{c('ev.title')}
        </Link>

        <div className="ev-event-layout">
          <article>
            <header className="ev-event-hero">
              <figure className="ev-event-hero__media">
                {event.imagen_url ? (
                  <Image
                    src={event.imagen_url}
                    alt={c('ev.poster', { name: event.nombre })}
                    fill
                    sizes="(min-width: 960px) 300px, 100vw"
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className="ev-poster-fallback" role="img" aria-label={c('ev.posterNone', { name: event.nombre })}>
                    <span className="ev-poster-fallback__name">{event.nombre}</span>
                    <span className="ev-poster-fallback__tag">{c('ev.posterTag')}</span>
                  </div>
                )}
              </figure>
              <div className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-3)' }}>
                <p className="ev-eyebrow" style={{ position: 'relative', zIndex: 1 }}>{c('evd.presents')}</p>
                <h1 className="ev-event-hero__title" style={{ marginTop: 'var(--ev-space-2)' }}>{event.nombre}</h1>
              </div>
            </header>

            <dl className="ev-event-facts" style={{ marginTop: 'var(--ev-space-6)' }}>
              <div className="ev-event-facts__item">
                <Icon name="calendar" />
                <div>
                  <dt className="ev-visually-hidden">{c('evd.factDate')}</dt>
                  <dd className="ev-event-facts__main">
                    {upperFirst(fmtDate(fecha, dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}
                  </dd>
                  <dd className="ev-event-facts__sub">{c('evd.showAt', { time: fmtTime(fecha, dateLocale) })}</dd>
                </div>
              </div>
              <div className="ev-event-facts__item">
                <Icon name="map-pin" />
                <div>
                  <dt className="ev-visually-hidden">{c('evd.factPlace')}</dt>
                  <dd className="ev-event-facts__main">{event.venue}</dd>
                  {(event.direccion || hasMap) && (
                    <dd className="ev-event-facts__sub">
                      {event.direccion}
                      {event.direccion && hasMap && ' · '}
                      {hasMap && <a href="#ev-mapa">{c('evd.seeMap')}</a>}
                    </dd>
                  )}
                </div>
              </div>
              <div className="ev-event-facts__item">
                <Icon name="ticket" />
                <div>
                  <dt className="ev-visually-hidden">{c('evd.factPrice')}</dt>
                  <dd className="ev-event-facts__main">{price} {t('detail.perTicket')}</dd>
                  <dd className="ev-event-facts__sub">{t('detail.bankTransfer')}</dd>
                </div>
              </div>
              {event.artistas?.length > 0 && (
                <div className="ev-event-facts__item">
                  <Icon name="mic" />
                  <div>
                    <dt className="ev-visually-hidden">{c('evd.factArtists')}</dt>
                    <dd className="ev-event-facts__main">{event.artistas.join(', ')}</dd>
                  </div>
                </div>
              )}
            </dl>

            {paragraphs.length > 0 && (
              <section className="ev-stack" style={{ marginTop: 'var(--ev-space-10)' }} aria-labelledby="ev-h-sobre">
                <h2 className="ev-display ev-display--sm" id="ev-h-sobre">{c('evd.about')}</h2>
                <div className="ev-prose">
                  {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </section>
            )}

            {hasMap && (
              <section id="ev-mapa" className="ev-stack" style={{ marginTop: 'var(--ev-space-10)', scrollMarginTop: 'calc(var(--ev-header-h) + var(--ev-space-4))' }} aria-labelledby="ev-h-mapa">
                <h2 className="ev-display ev-display--sm" id="ev-h-mapa">{t('detail.location')}</h2>
                <EventMap lat={event.lat!} lng={event.lng!} venue={event.venue} direccion={event.direccion} />
              </section>
            )}

            <section className="ev-stack" style={{ marginTop: 'var(--ev-space-10)' }} aria-labelledby="ev-h-como">
              <h2 className="ev-display ev-display--sm" id="ev-h-como">{c('ev.howto')}</h2>
              <ol className="ev-timeline">
                {([1, 2, 3, 4] as const).map(n => (
                  <li key={n} className="ev-timeline__item">
                    <div>
                      <p className="ev-timeline__title">{c(`evd.how${n}.title` as CopyKey)}</p>
                      <p className="ev-timeline__text">{c(`evd.how${n}.text` as CopyKey)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </article>

          {/* Panel de compra (desktop) y barra pegajosa (mobile) */}
          {soldOut ? (
            <>
              <aside className="ev-purchase" aria-label={c('evd.tickets')}>
                <div className="ev-ticket">
                  <div className="ev-ticket__section ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-4)', position: 'relative' }}>
                    <span className="ev-ticket__label">{c('evd.tickets')}</span>
                    <p className="ev-ticket__total ev-ticket__total--struck">{price}</p>
                    <span className="ev-stamp ev-stamp--paper" style={{ fontSize: '2.5rem' }}>{c('evd.soldOut')}</span>
                  </div>
                  <div className="ev-ticket__perf" aria-hidden="true" />
                  <div className="ev-ticket__section">
                    <p className="ev-ticket__muted">{c('evd.soldOutText')}</p>
                    <a className="ev-btn ev-btn--paper ev-btn--block" href={INSTAGRAM} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'var(--ev-space-4)' }}>
                      <Icon name="instagram" />{c('evd.followIg')}
                    </a>
                  </div>
                </div>
              </aside>
              <div className="ev-buy-bar" role="region" aria-label={c('evd.tickets')} style={{ gridTemplateColumns: '1fr' }}>
                <button type="button" className="ev-btn ev-btn--block" disabled>
                  <Icon name="x" />{c('evd.soldOut')}
                </button>
              </div>
            </>
          ) : (
            <>
              <aside className="ev-purchase" aria-labelledby="ev-h-buy">
                <div className="ev-ticket">
                  <div className="ev-ticket__section ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-4)' }}>
                    <div className="ev-ticket__row">
                      <h2 className="ev-ticket__label" id="ev-h-buy">{c('evd.tickets')}</h2>
                      {chip}
                    </div>
                    <p className="ev-ticket__total">
                      {price}{' '}
                      <span className="ev-ticket__muted" style={{ fontFamily: 'var(--ev-font-sans)', fontSize: 'var(--ev-text-sm)', fontWeight: 500 }}>{c('evd.each')}</span>
                    </p>
                    <div>
                      <p className="ev-ticket__label" style={{ marginBottom: 'var(--ev-space-2)' }}>{c('evd.qty')}</p>
                      {stepper(true)}
                      {cappedByStock && <p className="ev-qty__note" style={{ color: '#4a3f00' }}>{c('evd.onlyLeft', { n: maxQty })}</p>}
                    </div>
                  </div>
                  <div className="ev-ticket__perf" aria-hidden="true" />
                  <div className="ev-ticket__section ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-4)' }}>
                    <div className="ev-ticket__row">
                      <span className="ev-ticket__label">{t('checkout.total')}</span>
                      <span className="ev-ticket__total">{formatMoneyFull(total)}</span>
                    </div>
                    <button
                      type="button"
                      className={`ev-btn ev-btn--paper ev-btn--lg ev-btn--block${busy ? ' is-loading' : ''}`}
                      onClick={handleComprar}
                      disabled={busy}
                      aria-busy={busy}
                    >
                      {buyLabel} <Icon name="arrow-right" size="lg" />
                    </button>
                    <p className="ev-ticket__muted">{c('evd.noCard')}</p>
                  </div>
                </div>
              </aside>

              <div className="ev-buy-bar" role="region" aria-label={c('evd.buyRegion')}>
                {stepper(false)}
                <button
                  type="button"
                  className={`ev-btn ev-btn--primary ev-btn--block ev-btn--split${busy ? ' is-loading' : ''}`}
                  style={{ minHeight: 56 }}
                  onClick={handleComprar}
                  disabled={busy}
                  aria-busy={busy}
                >
                  {t('detail.buy')} <span className="ev-btn__meta">{formatMoneyFull(total)}</span>
                </button>
                {few && (
                  <p className="ev-subtle" style={{ gridColumn: '1 / -1', display: 'flex', gap: 6, alignItems: 'center', color: 'var(--ev-color-warning)' }}>
                    <Icon name="alert-circle" size="sm" />{c('evd.fewLeftLong', { n: left! })}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
