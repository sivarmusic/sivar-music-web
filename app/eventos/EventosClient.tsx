'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n'
import { formatMoneyFull } from '@/lib/format'
import { EVENT_TZ } from '@/lib/eventDate'
import { copyFor, type CopyKey } from './copy'
import { Icon } from './components/icons'
import SiteHeader from './components/site/SiteHeader'
import SiteFooter from './components/site/SiteFooter'

interface Event {
  id: string; slug?: string; nombre: string; fecha: string
  venue: string; imagen_url: string | null; precio?: number; artistas: string[]
  kind: 'ticket' | 'info'; artistSlug?: string | null
  /** Aditivos de la API pública; remaining solo viene cuando quedan <= 20. */
  soldOut?: boolean; remaining?: number | null
}

type TimeFilter = '24h' | '7d' | '30d' | null
const TIME_MS: Record<string, number> = { '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 }
const FILTERS = ['24h', '7d', '30d'] as const

export default function EventosClient() {
  const { lang, t, dateLocale } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  const TIME_LABELS: Record<string, string> = { '24h': t('home.time.24h'), '7d': t('home.time.7d'), '30d': t('home.time.30d') }
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    fetch('/api/eventos/events')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(d => { if (!cancelled) { setEvents(d.events ?? []); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [reloadKey])

  const now = new Date()

  function withinWindow(fecha: Date) {
    if (!timeFilter) return true
    return fecha >= now && fecha <= new Date(now.getTime() + TIME_MS[timeFilter])
  }

  const q = search.toLowerCase()

  const filteredEvents = events.filter(ev => {
    if (!withinWindow(new Date(ev.fecha))) return false
    if (!q) return true
    return ev.nombre.toLowerCase().includes(q) ||
      ev.venue.toLowerCase().includes(q) ||
      (ev.artistas?.some(a => a.toLowerCase().includes(q)) ?? false)
  })

  const hasResults = filteredEvents.length > 0

  // Destacado: el primer evento con venta que aún no pasó. El resto va a la grilla.
  const featured = filteredEvents.find(ev => ev.kind === 'ticket' && new Date(ev.fecha) >= now) ?? null
  const gridEvents = featured ? filteredEvents.filter(ev => ev.id !== featured.id) : filteredEvents

  const fmt = (fecha: Date, opts: Intl.DateTimeFormatOptions) =>
    fecha.toLocaleDateString(dateLocale, { timeZone: EVENT_TZ, ...opts }).replace(/\.$/, '')
  const fmtTime = (fecha: Date) =>
    fecha.toLocaleTimeString(dateLocale, { timeZone: EVENT_TZ, hour: '2-digit', minute: '2-digit' })
  const hrefFor = (ev: Event) => ev.kind === 'info' ? `/eventos/artistas/${ev.artistSlug}` : `/eventos/${ev.slug}`

  function resetFilters() { setSearch(''); setTimeFilter(null) }

  // "Quedan N" / "Agotado": solo si la API los informa (icono + palabra + color).
  function renderAvailability(ev: Event) {
    if (ev.kind !== 'ticket') return null
    if (ev.soldOut) {
      return <span className="ev-chip ev-chip--soldout"><Icon name="x" />{c('evd.soldOut')}</span>
    }
    if (typeof ev.remaining === 'number') {
      return <span className="ev-chip ev-chip--few"><Icon name="alert-circle" />{c('evd.fewLeft', { n: ev.remaining })}</span>
    }
    return null
  }

  function renderPoster(ev: Event, sizes: string, priority = false) {
    if (ev.imagen_url) {
      return <Image src={ev.imagen_url} alt={c('ev.poster', { name: ev.nombre })} fill sizes={sizes} priority={priority} className="object-cover" />
    }
    // Sin afiche: fallback tipográfico del sistema
    return (
      <div className="ev-poster-fallback" role="img" aria-label={c('ev.posterNone', { name: ev.nombre })}>
        <span className="ev-poster-fallback__name">{ev.nombre}</span>
        <span className="ev-poster-fallback__tag">{c('ev.posterTag')}</span>
      </div>
    )
  }

  function renderEmpty() {
    // Búsqueda sin resultados
    if (q) {
      return (
        <div className="ev-empty">
          <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="search-x" size="lg" /></span>
          <h2 className="ev-empty__title">{c('ev.noResults', { q: search.trim() })}</h2>
          <p className="ev-empty__text">{c('ev.noResultsText')}</p>
          <button type="button" className="ev-btn ev-btn--secondary ev-btn--sm" onClick={resetFilters}>
            {c('ev.clearSearch')}
          </button>
        </div>
      )
    }
    // Sin eventos en el período elegido
    if (timeFilter) {
      return (
        <div className="ev-empty">
          <h2 className="ev-empty__title">{c(`ev.empty.${timeFilter}` as CopyKey)}</h2>
          <p className="ev-empty__text">{c('ev.empty.text')}</p>
          <div className="ev-cluster">
            {timeFilter !== '30d' && (
              <button type="button" className="ev-btn ev-btn--secondary ev-btn--sm" onClick={() => setTimeFilter('30d')}>
                {c('ev.see30')}
              </button>
            )}
            <button type="button" className="ev-link-arrow" onClick={resetFilters}>
              {c('ev.seeAll')} <Icon name="arrow-right" />
            </button>
          </div>
        </div>
      )
    }
    // No hay ningún evento publicado
    return (
      <div className="ev-empty">
        <h2 className="ev-empty__title">{c('ev.empty.none')}</h2>
        <p className="ev-empty__text">{c('ev.empty.noneText')}</p>
      </div>
    )
  }

  return (
    <div className="ev-surface">
      <SiteHeader search={{ value: search, onChange: setSearch }} />

      <main id="main">
        {/* ── Cabecera + búsqueda + filtros ─────────────────── */}
        <section className="ev-container" style={{ paddingTop: 'var(--ev-space-8)' }}>
          <p className="ev-eyebrow">{c('ev.eyebrow')}</p>
          <h1 className="ev-display ev-display--lg" style={{ marginTop: 'var(--ev-space-2)' }}>{c('ev.title')}</h1>
          <form
            className="ev-stack"
            style={{ ['--stack-gap' as string]: 'var(--ev-space-4)', marginTop: 'var(--ev-space-6)' }}
            role="search"
            onSubmit={e => e.preventDefault()}
          >
            <div className="ev-field">
              <label className="ev-visually-hidden" htmlFor="ev-q">{c('ev.searchLabel')}</label>
              <div className="ev-field__control">
                <Icon name="search" />
                <input
                  className="ev-input"
                  id="ev-q"
                  type="search"
                  placeholder={t('home.search')}
                  autoComplete="off"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="ev-filters" role="group" aria-label={c('ev.filterLabel')}>
              <button type="button" className="ev-filter-chip" aria-pressed={timeFilter === null} onClick={() => setTimeFilter(null)}>
                {c('ev.filterAll')}
              </button>
              {FILTERS.map(f => (
                <button
                  key={f}
                  type="button"
                  className="ev-filter-chip"
                  aria-pressed={timeFilter === f}
                  onClick={() => setTimeFilter(timeFilter === f ? null : f)}
                >
                  {f === '24h' && <Icon name="calendar" size="sm" />}
                  {TIME_LABELS[f]}
                </button>
              ))}
            </div>
          </form>
        </section>

        {/* ── Así se compra (transferencia + comprobante) ────── */}
        <div className="ev-container" style={{ marginTop: 'var(--ev-space-8)' }}>
          <h2 className="ev-visually-hidden">{c('ev.howto')}</h2>
          <ol className="ev-howto">
            <li className="ev-howto__item"><strong>{c('ev.how1.title')}</strong><span>{c('ev.how1.text')}</span></li>
            <li className="ev-howto__item"><strong>{c('ev.how2.title')}</strong><span>{c('ev.how2.text')}</span></li>
            <li className="ev-howto__item"><strong>{c('ev.how3.title')}</strong><span>{c('ev.how3.text')}</span></li>
          </ol>
        </div>

        {/* ── Contenido ──────────────────────────────────────── */}
        <div className="ev-container" style={{ paddingTop: 'var(--ev-space-8)' }}>
          {loading ? (
            <section aria-busy="true" aria-label={c('ev.loading')}>
              <p className="ev-visually-hidden" role="status">{t('home.loading')}</p>
              <ul className="ev-event-grid" role="list" aria-hidden="true">
                {[0, 1, 2].map(i => (
                  <li key={i} className="ev-event-card">
                    <div className="ev-event-card__media ev-skeleton" />
                    <div className="ev-event-card__body ev-stack ev-stack--sm">
                      <div className="ev-skeleton ev-skeleton--title" />
                      <div className="ev-skeleton ev-skeleton--line" style={{ width: '60%' }} />
                      <div className="ev-skeleton ev-skeleton--line" style={{ width: '40%' }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : error ? (
            <div className="ev-banner ev-banner--error" role="alert">
              <Icon name="alert-triangle" />
              <div>
                <p className="ev-banner__title">{c('ev.errorTitle')}</p>
                <p className="ev-banner__text">{c('ev.errorText')}</p>
              </div>
              <div className="ev-banner__actions">
                <button type="button" className="ev-btn ev-btn--secondary ev-btn--sm" onClick={() => setReloadKey(k => k + 1)}>
                  <Icon name="refresh" />{c('ev.retry')}
                </button>
              </div>
            </div>
          ) : !hasResults ? (
            renderEmpty()
          ) : (
            <section aria-labelledby={featured ? 'ev-h-next' : undefined}>
              {featured && (() => {
                const fecha = new Date(featured.fecha)
                return (
                  <>
                    <h2 className="ev-visually-hidden" id="ev-h-next">{c('ev.nextEvent')}</h2>
                    <Link className="ev-event-feature" href={hrefFor(featured)}>
                      <div className="ev-event-feature__media">{renderPoster(featured, '(min-width: 768px) 45vw, 100vw', true)}</div>
                      <div className="ev-event-feature__body">
                        <p className="ev-eyebrow">{c('ev.next')} · {fmt(fecha, { weekday: 'long' })}</p>
                        <h3 className="ev-event-feature__title">{featured.nombre}</h3>
                        <p className="ev-event-feature__when">
                          {fmt(fecha, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(fecha)}
                        </p>
                        <div className="ev-event-card__meta" style={{ fontSize: 'var(--ev-text-base)' }}>
                          <span><Icon name="map-pin" />{featured.venue}</span>
                        </div>
                        {(featured.precio != null || featured.soldOut || typeof featured.remaining === 'number') && (
                          <div className="ev-cluster" style={{ justifyContent: 'space-between' }}>
                            {featured.precio != null && (
                              <p
                                className="ev-event-card__price"
                                style={{
                                  fontSize: '2.5rem',
                                  ...(featured.soldOut ? { color: 'var(--ev-color-text-subtle)', textDecoration: 'line-through', textDecorationThickness: 2 } : null),
                                }}
                              >
                                <span className="ev-visually-hidden">{c('ev.price')}</span>{formatMoneyFull(featured.precio)}
                              </p>
                            )}
                            {renderAvailability(featured)}
                          </div>
                        )}
                        <span className="ev-btn ev-btn--primary ev-btn--lg ev-btn--block" aria-hidden="true">
                          {c('ev.seeTickets')} <Icon name="arrow-right" size="lg" />
                        </span>
                      </div>
                    </Link>
                  </>
                )
              })()}

              {gridEvents.length > 0 && (
                <>
                  {featured && (
                    <h2 className="ev-display ev-display--sm" style={{ margin: 'var(--ev-space-12) 0 var(--ev-space-5)' }}>
                      {c('ev.moreDates')}
                    </h2>
                  )}
                  <ul className="ev-event-grid" role="list">
                    {gridEvents.map(event => {
                      const fecha = new Date(event.fecha)
                      const isPast = fecha < now
                      const soldOut = event.kind === 'ticket' && event.soldOut === true && !isPast
                      return (
                        <li key={event.id}>
                          <Link className={`ev-event-card${isPast ? ' ev-event-card--past' : ''}${soldOut ? ' ev-event-card--soldout' : ''}`} href={hrefFor(event)}>
                            <div className="ev-event-card__media">
                              {renderPoster(event, '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 104px')}
                              <p className="ev-event-card__date">
                                <span>{fmt(fecha, { weekday: 'short' })}</span>
                                <b>{fmt(fecha, { day: 'numeric' })}</b>
                                <span>{fmt(fecha, { month: 'short' })}</span>
                              </p>
                              {isPast && (
                                <div className="ev-event-card__stamp"><span className="ev-stamp">{t('home.pastEvent')}</span></div>
                              )}
                              {soldOut && (
                                <div className="ev-event-card__stamp"><span className="ev-stamp">{c('evd.soldOut')}</span></div>
                              )}
                            </div>
                            <div className="ev-event-card__body">
                              <h3 className="ev-event-card__title">{event.nombre}</h3>
                              <p className="ev-event-card__meta">
                                <span><Icon name="clock" />{fmtTime(fecha)}</span>
                                <span><Icon name="map-pin" />{event.venue}</span>
                              </p>
                              {event.kind === 'ticket' && (event.precio != null || (!isPast && (event.soldOut || typeof event.remaining === 'number'))) && (
                                <div className="ev-event-card__foot">
                                  {event.precio != null && (
                                    <p className="ev-event-card__price">
                                      <span className="ev-visually-hidden">{c('ev.price')}</span>{formatMoneyFull(event.precio)}
                                    </p>
                                  )}
                                  {!isPast && renderAvailability(event)}
                                </div>
                              )}
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
