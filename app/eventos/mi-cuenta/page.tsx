'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { copyFor, type CopyKey } from '../copy'
import { Icon } from '../components/icons'
import SiteHeader from '../components/site/SiteHeader'
import SiteFooter from '../components/site/SiteFooter'
import OrderStatusChip from '../components/ui/OrderStatusChip'
import { fmtDate, fmtTime } from '../components/ui/format'

// El valor del QR (qr_token) llega tal cual desde la API; acá solo se dibuja.
const QRCode = dynamic(() => import('qrcode').then(mod => {
  function QrImage({ value, size, alt }: { value: string; size: number; alt: string }) {
    const [url, setUrl] = useState('')
    useEffect(() => {
      mod.toDataURL(value, { width: size, margin: 1 }).then(setUrl)
    }, [value, size])
    // eslint-disable-next-line @next/next/no-img-element
    return url ? <img src={url} alt={alt} width={size} height={size} /> : null
  }
  return { default: QrImage }
}), { ssr: false })

interface Ticket {
  id: string; qr_token: string; ticket_number: number; check_in_at: string | null
}
interface Order {
  id: string; order_code: string; cantidad: number; status: string; created_at: string
  order_type: string; cortesia_categoria: string | null
  events: { nombre: string; fecha: string; venue: string; slug: string; imagen_url?: string | null } | null
  event_tickets: Ticket[]
}
interface FullscreenQR {
  token: string; orderCode: string; label: string
}

const STATUS_RANK: Record<string, number> = { confirmado: 0, en_revision: 1, pendiente_comprobante: 2, rechazado: 3 }

export default function MiCuentaPage() {
  const { lang, t } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [fullscreenQR, setFullscreenQR] = useState<FullscreenQR | null>(null)

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.push('/eventos/mi-cuenta/login'); return }

      const { data: profile, error: profileErr } = await supabaseBrowser
        .from('attendee_profiles')
        .select('onboarding_completed_at, nombre')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profileErr && !profile?.onboarding_completed_at) {
        router.replace('/eventos/mi-cuenta/onboarding')
        return
      }

      const meta = session.user.user_metadata ?? {}
      setName(profile?.nombre || meta.full_name || meta.name || session.user.email?.split('@')[0] || '')
      setEmail(session.user.email ?? '')
      const res = await fetch('/api/eventos/user/tickets', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const d = await res.json()
      setOrders(d.orders ?? [])
      setLoading(false)
    })
  }, [router])

  // Cerrar el diálogo del QR con Escape
  useEffect(() => {
    if (!fullscreenQR) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreenQR(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullscreenQR])

  async function handleLogout() {
    await supabaseBrowser.auth.signOut()
    router.push('/eventos')
  }

  const shell = (main: React.ReactNode) => (
    <div className="ev-surface">
      <SiteHeader />
      {main}
      <SiteFooter />
    </div>
  )

  if (loading) {
    return shell(
      <main id="main" className="ev-state-screen" aria-busy="true">
        <p className="ev-muted" role="status">{t('account.loading')}</p>
      </main>
    )
  }

  const now = new Date()
  const isPast = (o: Order) => !!o.events && new Date(o.events.fecha) < now
  // Mismo orden del diseño: confirmadas, en revisión, falta comprobante, rechazadas. Pasados al final.
  const sorted = [...orders].sort((a, b) =>
    Number(isPast(a)) - Number(isPast(b))
    || (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)
    || new Date(a.events?.fecha ?? 0).getTime() - new Date(b.events?.fecha ?? 0).getTime()
  )
  const firstName = name.split(' ')[0]

  return shell(
    <main id="main">
      {fullscreenQR && (
        <div className="ev-modal-backdrop" onClick={() => setFullscreenQR(null)}>
          <div
            className="ev-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ev-qr-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="ev-modal__head">
              <h2 className="ev-modal__title" id="ev-qr-title">{fullscreenQR.label}</h2>
              <button type="button" className="ev-icon-btn ev-icon-btn--boxed" aria-label={t('account.close')} onClick={() => setFullscreenQR(null)} autoFocus>
                <Icon name="x" />
              </button>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, justifySelf: 'center' }}>
              <QRCode value={fullscreenQR.token} size={260} alt={`QR ${fullscreenQR.orderCode}`} />
            </div>
            <p className="ev-display ev-display--sm" style={{ textAlign: 'center' }}>{fullscreenQR.orderCode}</p>
            <p className="ev-subtle" style={{ textAlign: 'center' }}>{t('account.showAtEntrance')}</p>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <section className="ev-container ev-container--narrow ev-page">
          <header className="ev-stack ev-stack--sm" style={{ marginBottom: 'var(--ev-space-8)' }}>
            <p className="ev-eyebrow">{t('account.title')}</p>
            <h1 className="ev-display ev-display--md">{t('account.greeting', { name: firstName })}</h1>
            <p className="ev-subtle">{email}</p>
          </header>
          <div className="ev-empty">
            <h2 className="ev-empty__title">{t('account.emptyTitle')}</h2>
            <p className="ev-empty__text">{c('eva.emptyText')}</p>
            <Link className="ev-btn ev-btn--primary" href="/eventos">{c('eva.seeLineup')}</Link>
          </div>
        </section>
      ) : (
        <section className="ev-container ev-page">
          <header className="ev-page-head">
            <div className="ev-stack ev-stack--sm">
              <p className="ev-eyebrow">{t('account.title')}</p>
              <h1 className="ev-display ev-display--md">{t('account.greeting', { name: firstName })}</h1>
              <p className="ev-subtle">{email}</p>
            </div>
            <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={handleLogout}>
              <Icon name="log-out" />{t('menu.logout')}
            </button>
          </header>

          <h2 className="ev-display ev-display--sm" style={{ marginBottom: 'var(--ev-space-5)' }}>{c('eva.myTickets')}</h2>
          <ul className="ev-my-tickets" role="list">
            {sorted.map(order => (
              <OrderTickets key={order.id} order={order} past={isPast(order)} onOpenQR={setFullscreenQR} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

/** Una orden → uno o varios boletos de papel (un QR por entrada confirmada). */
function OrderTickets({ order, past, onOpenQR }: {
  order: Order; past: boolean; onOpenQR: (qr: FullscreenQR) => void
}) {
  const { lang, t, dateLocale } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  const ev = order.events
  const fecha = ev ? new Date(ev.fecha) : null
  const title = ev?.nombre ?? t('account.title')
  const meta = fecha
    ? `${fmtDate(fecha, dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtTime(fecha, dateLocale)} · ${ev?.venue ?? ''}`
    : ev?.venue ?? ''
  const categoryLabel = order.cortesia_categoria === 'staff' ? t('account.categoryStaff')
    : order.cortesia_categoria === 'organizacion' ? t('account.categoryOrganizacion')
    : order.cortesia_categoria === 'vip' ? t('account.categoryVip')
    : order.cortesia_categoria === 'musicos' ? t('account.categoryMusicos')
    : order.cortesia_categoria
  const isCourtesy = order.order_type === 'cortesia'
  const ticketsLabel = `${order.cantidad} ${order.cantidad > 1 ? t('account.tickets') : t('account.ticket')}`
  const payHref = ev ? `/eventos/${ev.slug}/pago/${order.id}` : '/eventos'
  const style = past || order.status === 'rechazado' ? { opacity: 0.85 } : undefined

  const head = (id: string) => (
    <div className="ev-ticket__section ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-2)' }}>
      <div className="ev-my-ticket__head">
        <h3 className="ev-my-ticket__title" id={id}>{title}</h3>
        <OrderStatusChip status={order.status} variant="short" />
      </div>
      <p className="ev-ticket__muted">{meta}</p>
      {isCourtesy && (
        <span className="ev-chip ev-chip--courtesy">
          <Icon name="gift" />{t('account.courtesy')}{categoryLabel ? ` — ${categoryLabel}` : ''}
        </span>
      )}
      {past && <p className="ev-ticket__muted">{t('home.pastEvent')}</p>}
    </div>
  )

  function checkIn(ticket: Ticket) {
    return ticket.check_in_at
      ? t('account.checkedInAt', { time: fmtTime(ticket.check_in_at, dateLocale) })
      : t('account.notCheckedIn')
  }

  // Confirmada con QR: un boleto por entrada
  if (order.status === 'confirmado' && order.event_tickets.length > 0) {
    return (
      <>
        {order.event_tickets.map(ticket => {
          const id = `ev-t-${ticket.id}`
          const ticketLabel = t('account.ticketOf', { n: ticket.ticket_number, total: order.cantidad })
          return (
            <li key={ticket.id}>
              <article className="ev-ticket ev-my-ticket" aria-labelledby={id} style={style}>
                {head(id)}
                <div className="ev-ticket__perf" aria-hidden="true" />
                <div className="ev-ticket__section ev-my-ticket__qr">
                  <button
                    type="button"
                    onClick={() => onOpenQR({
                      token: ticket.qr_token,
                      orderCode: order.order_code,
                      label: `${title} · ${t('account.ticketShort', { n: ticket.ticket_number })}`,
                    })}
                    title={t('account.tapToEnlarge')}
                    aria-label={`${t('account.tapToEnlarge')}: ${ticketLabel} · ${order.order_code}`}
                    style={{ background: 'transparent', border: 0, padding: 0, justifySelf: 'start' }}
                  >
                    <QRCode value={ticket.qr_token} size={264} alt={`QR · ${ticketLabel} · ${order.order_code}`} />
                  </button>
                  <div className="ev-stack ev-stack--sm">
                    <p className="ev-ticket__label">{ticketLabel}</p>
                    <p className="ev-display" style={{ fontSize: '1.75rem' }}>{order.order_code}</p>
                    <p className="ev-ticket__muted">{c('eva.showAtDoor')}</p>
                    <p className="ev-ticket__muted">{checkIn(ticket)}</p>
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </>
    )
  }

  const id = `ev-t-${order.id}`

  // En revisión (o confirmada sin QR todavía): QR pendiente
  if (order.status === 'en_revision' || order.status === 'confirmado') {
    return (
      <li>
        <article className="ev-ticket ev-my-ticket" aria-labelledby={id} style={style}>
          {head(id)}
          <div className="ev-ticket__perf" aria-hidden="true" />
          <div className="ev-ticket__section ev-my-ticket__qr">
            <div className="ev-my-ticket__qr--placeholder"><Icon name="hourglass" size="lg" /></div>
            <div className="ev-stack ev-stack--sm">
              <p className="ev-ticket__label">{c('eva.orderLine', { code: order.order_code, tickets: ticketsLabel })}</p>
              <p className="ev-ticket__muted">
                {order.status === 'confirmado' ? t('account.ticketsArriving') : c('eva.qrAfterReview')}
              </p>
              {order.status === 'en_revision' && <Link href={payHref}>{c('eva.seePayment')}</Link>}
            </div>
          </div>
        </article>
      </li>
    )
  }

  // Falta comprobante
  if (order.status === 'pendiente_comprobante') {
    return (
      <li>
        <article className="ev-ticket ev-my-ticket" aria-labelledby={id} style={style}>
          {head(id)}
          <div className="ev-ticket__perf" aria-hidden="true" />
          <div className="ev-ticket__section ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-3)' }}>
            <p className="ev-ticket__muted">{c('eva.orderLine', { code: order.order_code, tickets: ticketsLabel })}</p>
            <Link className="ev-btn ev-btn--paper ev-btn--block" href={payHref}>
              <Icon name="upload" size="lg" />{c('eva.uploadProof')}
            </Link>
          </div>
        </article>
      </li>
    )
  }

  // Rechazada
  return (
    <li>
      <article className="ev-ticket ev-my-ticket" aria-labelledby={id} style={style}>
        {head(id)}
        <div className="ev-ticket__perf" aria-hidden="true" />
        <div className="ev-ticket__section ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-2)' }}>
          <p className="ev-ticket__muted">{c('eva.rejectedLine', { code: order.order_code })}</p>
          <Link href={payHref}>{c('eva.seeWhatHappened')}</Link>
        </div>
      </article>
    </li>
  )
}
