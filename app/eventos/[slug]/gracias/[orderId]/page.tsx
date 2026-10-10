'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import { formatMoneyFull, orderTotal } from '@/lib/format'
import { copyFor, type CopyKey } from '../../../copy'
import { Icon } from '../../../components/icons'
import SiteHeader from '../../../components/site/SiteHeader'
import SiteFooter from '../../../components/site/SiteFooter'
import OrderSteps from '../../../components/ui/OrderSteps'
import OrderStatusChip from '../../../components/ui/OrderStatusChip'
import { fmtDate, fmtTime } from '../../../components/ui/format'

interface Order {
  id: string; order_code: string; cantidad: number; status: string
  events: { slug: string; nombre: string; precio?: number; fecha: string; venue: string } | null
}

const SUPPORT_EMAIL = 'admin@sivarmusic.com'

export default function EventoGraciasPage() {
  const { lang, t, dateLocale } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    try { localStorage.removeItem('sm_pending') } catch {}
    fetch(`/api/eventos/order/${orderId}`)
      .then(r => r.json())
      .then(d => { if (d.order) setOrder(d.order); else setNotFound(true) })
      .catch(() => setNotFound(true))
  }, [orderId])

  const shell = (main: React.ReactNode) => (
    <div className="ev-surface">
      <SiteHeader />
      {main}
      <SiteFooter />
    </div>
  )

  if (notFound) return shell(
    <main id="main" className="ev-state-screen">
      <div className="ev-stack">
        <p className="ev-lead">{t('pago.notFound')}</p>
        <Link href={`/eventos/${slug}`} className="ev-link-arrow">{t('pago.backToEvent')}</Link>
      </div>
    </main>
  )

  if (!order) return shell(
    <main id="main" className="ev-state-screen" aria-busy="true">
      <p className="ev-muted" role="status">{t('gracias.loading')}</p>
    </main>
  )

  const isConfirmed = order.status === 'confirmado'
  const isRejected = order.status === 'rechazado'
  const fecha = order.events ? new Date(order.events.fecha) : null
  const total = order.events?.precio != null ? orderTotal(order.cantidad, order.events.precio) : null
  const eventName = order.events?.nombre ?? '—'
  const when = fecha
    ? `${fmtDate(fecha, dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtTime(fecha, dateLocale)}${order.events?.venue ? ` · ${order.events.venue}` : ''}`
    : order.events?.venue ?? ''

  return shell(
    <main id="main" className="ev-container ev-container--mid ev-page">
      <OrderSteps current={isRejected ? 1 : 2} />

      <section className="ev-stack ev-stack--lg" style={{ marginTop: 'var(--ev-space-8)' }}>
        {/* ── Encabezado por estado ─────────────────────────── */}
        <header className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-4)' }}>
          {isRejected ? (
            <OrderStatusChip status="rechazado" />
          ) : isConfirmed ? (
            <OrderStatusChip status="confirmado" />
          ) : (
            <span className="ev-stamp ev-stamp--accent ev-stamp--anim" style={{ fontSize: '2.25rem', alignSelf: 'start', marginLeft: 'var(--ev-space-2)' }}>
              <Icon name="check" size="xl" />{c('evg.stamp')}
            </span>
          )}
          <h1 className="ev-display ev-display--lg" style={{ marginTop: 'var(--ev-space-6)' }}>
            {isRejected
              ? c('evp.rejectedTitle')
              : isConfirmed
                ? t('gracias.confirmedTitle')
                : <>{c('evg.titleA')}<br />{c('evg.titleB')}</>}
          </h1>
          <p className="ev-lead">
            {isRejected
              ? t('gracias.descRechazado')
              : isConfirmed
                ? t('gracias.descConfirmado')
                : t('gracias.descEnRevision')}
          </p>
        </header>

        {/* ── Boleto de la orden ─────────────────────────────── */}
        <div className="ev-ticket">
          <div className="ev-ticket__section ev-order-code" style={{ position: 'relative' }}>
            <span className="ev-ticket__label">{t('gracias.orderCode')}</span>
            <p className="ev-order-code__value ev-mono" style={{ fontSize: 'clamp(2.5rem, 12vw, 4.5rem)' }}>{order.order_code}</p>
            <p className="ev-display" style={{ fontSize: '1.75rem' }}>{eventName}</p>
            {when && <p className="ev-ticket__muted">{when}</p>}
            {isConfirmed && (
              <span
                className="ev-stamp ev-stamp--paper ev-stamp--anim"
                style={{ position: 'absolute', right: 'var(--ev-space-4)', top: 'var(--ev-space-4)', ['--stamp-c' as string]: '#11733d', fontSize: '1.5rem' }}
              >
                {c('evg.paid')}
              </span>
            )}
          </div>
          <div className="ev-ticket__perf" aria-hidden="true" />
          <div className="ev-ticket__section">
            <div className="ev-ticket__row">
              <span className="ev-ticket__label">{t('gracias.tickets')}</span>
              <span style={{ fontWeight: 600 }}>{order.cantidad}</span>
            </div>
            {total != null && (
              <div className="ev-ticket__row">
                <span className="ev-ticket__label">{isConfirmed ? c('evg.totalPaid') : c('evg.totalTransferred')}</span>
                <span className="ev-ticket__total" style={{ fontSize: '2rem' }}>{formatMoneyFull(total)}</span>
              </div>
            )}
            <div className="ev-ticket__row" style={{ alignItems: 'center' }}>
              <span className="ev-ticket__label">{c('evg.status')}</span>
              <OrderStatusChip status={order.status} />
            </div>
          </div>
        </div>

        {/* ── Qué pasa ahora (solo en revisión) ──────────────── */}
        {!isConfirmed && !isRejected && (
          <section className="ev-stack" aria-labelledby="ev-h-next">
            <h2 className="ev-display ev-display--sm" id="ev-h-next">{c('evg.nextTitle')}</h2>
            <ol className="ev-timeline">
              <li className="ev-timeline__item is-current" aria-current="step">
                <div><p className="ev-timeline__title">{c('evg.next1')}</p></div>
              </li>
              <li className="ev-timeline__item">
                <div><p className="ev-timeline__title">{c('evg.next2')}</p></div>
              </li>
              <li className="ev-timeline__item">
                <div>
                  <p className="ev-timeline__title">{c('evg.next3')}</p>
                  <p className="ev-timeline__text">{c('evg.next3Text')}</p>
                </div>
              </li>
            </ol>
          </section>
        )}

        {isConfirmed && (
          <div className="ev-banner ev-banner--info">
            <Icon name="mail" />
            <div>
              <p className="ev-banner__title">{c('evg.noMailTitle')}</p>
              <p className="ev-banner__text">{c('evg.noMailText')}</p>
            </div>
          </div>
        )}

        {/* ── Ayuda ──────────────────────────────────────────── */}
        <section className="ev-stack" aria-labelledby="ev-h-help" style={{ ['--stack-gap' as string]: 'var(--ev-space-3)' }}>
          <h2 className="ev-title ev-title--sm" id="ev-h-help">{c('evg.helpTitle')}</h2>
          <p className="ev-muted">
            {c('evg.helpText')} <span className="ev-mono" style={{ color: 'var(--ev-color-text)' }}>{order.order_code}</span>
          </p>
          <div className="ev-cluster">
            <a className="ev-btn ev-btn--ghost ev-btn--sm" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(order.order_code)}`}>
              <Icon name="mail" />{SUPPORT_EMAIL}
            </a>
          </div>
        </section>

        <div className="ev-cluster">
          {isRejected ? (
            <Link className="ev-btn ev-btn--primary" href={`/eventos/${slug}/pago/${orderId}`}>
              <Icon name="upload" size="lg" />{c('evp.reupload')}
            </Link>
          ) : (
            <Link className={`ev-btn ${isConfirmed ? 'ev-btn--primary' : 'ev-btn--secondary'}`} href="/eventos/mi-cuenta">
              <Icon name="ticket" size="lg" />{isConfirmed ? t('gracias.seeMyTickets') : t('gracias.seeMyAccount')}
            </Link>
          )}
          <Link className="ev-link-arrow" href="/eventos">
            {c('evg.backToLineup')} <Icon name="arrow-right" />
          </Link>
        </div>
      </section>
    </main>
  )
}
