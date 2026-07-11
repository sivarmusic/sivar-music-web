'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'
import UserMenu from '../components/UserMenu'

const QRCode = dynamic(() => import('qrcode').then(mod => ({
  default: ({ value, size }: { value: string; size: number }) => {
    const [url, setUrl] = useState('')
    useEffect(() => {
      mod.toDataURL(value, { width: size, margin: 1 }).then(setUrl)
    }, [value, size])
    return url ? <img src={url} alt="QR" className="rounded-lg" width={size} height={size} /> : null
  }
})), { ssr: false })

interface Ticket {
  id: string; qr_token: string; ticket_number: number; check_in_at: string | null
}
interface Order {
  id: string; order_code: string; cantidad: number; status: string; created_at: string
  events: { nombre: string; fecha: string; venue: string; slug: string; imagen_url?: string | null } | null
  event_tickets: Ticket[]
}
interface FullscreenQR {
  token: string; orderCode: string; label: string
}

function statusInfo(status: string, t: ReturnType<typeof useLanguage>['t']) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pendiente_comprobante: { label: t('account.statusPendingProof'), color: 'text-white/50', bg: 'bg-white/8' },
    en_revision: { label: t('account.statusEnRevision'), color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    confirmado: { label: t('account.statusConfirmado'), color: 'text-green-400', bg: 'bg-green-400/10' },
    rechazado: { label: t('account.statusRechazado'), color: 'text-red-400', bg: 'bg-red-400/10' },
  }
  return map[status] ?? { label: status, color: 'text-white/50', bg: 'bg-white/8' }
}

export default function MiCuentaPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
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

  if (loading) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">{t('account.loading')}</p></div>

  const upcoming = orders.filter(o => o.events && new Date(o.events.fecha) >= new Date() && o.status === 'confirmado')
  const past = orders.filter(o => o.events && new Date(o.events.fecha) < new Date())
  const pending = orders.filter(o => ['pendiente_comprobante', 'en_revision'].includes(o.status))

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      {/* Modal QR fullscreen */}
      {fullscreenQR && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-6"
          onClick={() => setFullscreenQR(null)}
        >
          <div
            className="flex flex-col items-center gap-5"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">{fullscreenQR.label}</p>
            <div className="bg-white p-5 rounded-3xl shadow-2xl">
              <QRCode value={fullscreenQR.token} size={260} />
            </div>
            <p className="text-[#F472B6] font-bold text-xl tracking-widest">{fullscreenQR.orderCode}</p>
            <p className="text-white/30 text-xs">{t('account.showAtEntrance')}</p>
          </div>
          <button
            onClick={() => setFullscreenQR(null)}
            className="absolute bottom-10 text-white/25 hover:text-white text-xs uppercase tracking-widest transition"
          >
            {t('account.close')}
          </button>
        </div>
      )}

      {/* Header — misma estructura y posiciones que /eventos */}
      <header className="sticky top-0 z-20 bg-[#0a0008]/95 backdrop-blur-md border-b border-white/8">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <Link href="/eventos" className="flex-none mr-1 flex items-center gap-2.5">
            <img src="/favicon.ico" alt="Sivar Music" className="h-9 w-9 rounded-lg" />
            <span className="text-white font-bold text-sm hidden sm:block">Sivar Music</span>
          </Link>
          <div className="flex-1" />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>

      <div className="px-5 py-6 max-w-lg mx-auto space-y-8">
        <div>
          <Link href="/eventos" className="text-white/35 hover:text-white text-xs transition block mb-2">{t('account.backToEvents')}</Link>
          <h1 className="text-white text-lg font-bold">{t('account.greeting', { name: name.split(' ')[0] })}</h1>
          <p className="text-white/35 text-xs mt-0.5">{email}</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/6 flex items-center justify-center mb-5 text-3xl">🎫</div>
            <h2 className="text-white font-bold text-lg">{t('account.emptyTitle')}</h2>
            <p className="text-white/40 text-sm mt-2 max-w-xs">{t('account.emptyBody')}</p>
            <Link href="/eventos"
              className="mt-6 bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl px-8 py-3.5 transition-all">
              {t('account.exploreEvents')}
            </Link>
          </div>
        ) : (
          <>
            {pending.length > 0 && <Section icon="⏳" title={t('account.pending')} orders={pending} expanded={expandedOrder} onExpand={setExpandedOrder} onOpenQR={setFullscreenQR} />}
            {upcoming.length > 0 && <Section icon="🎟️" title={t('account.upcoming')} orders={upcoming} expanded={expandedOrder} onExpand={setExpandedOrder} onOpenQR={setFullscreenQR} showQR />}
            {past.length > 0 && <Section icon="✓" title={t('account.past')} orders={past} expanded={expandedOrder} onExpand={setExpandedOrder} onOpenQR={setFullscreenQR} dim />}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, orders, expanded, onExpand, onOpenQR, showQR, dim }: {
  icon: string; title: string; orders: Order[]; expanded: string | null
  onExpand: (id: string | null) => void
  onOpenQR: (qr: FullscreenQR) => void
  showQR?: boolean; dim?: boolean
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">
        <span className="text-xs">{icon}</span>{title}
      </p>
      <div className="space-y-3">
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            isExpanded={expanded === order.id}
            onExpand={() => onExpand(expanded === order.id ? null : order.id)}
            onOpenQR={onOpenQR}
            showQR={showQR}
            dim={dim}
          />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order, isExpanded, onExpand, onOpenQR, showQR, dim }: {
  order: Order; isExpanded: boolean; onExpand: () => void
  onOpenQR: (qr: FullscreenQR) => void
  showQR?: boolean; dim?: boolean
}) {
  const { t, dateLocale } = useLanguage()
  const status = statusInfo(order.status, t)
  const fecha = order.events ? new Date(order.events.fecha) : null

  return (
    <div className={`rounded-2xl border ${dim ? 'border-white/6 bg-white/2 opacity-70' : 'border-white/10 bg-white/4'}`}>
      <button onClick={onExpand} className="w-full px-4 py-4 text-left flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/6 flex-none flex items-center justify-center">
          {order.events?.imagen_url ? (
            <img src={order.events.imagen_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white/20 text-xl">🎵</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate">{order.events?.nombre ?? 'Evento'}</p>
          {fecha && (
            <p className="text-white/40 text-xs mt-0.5 truncate">
              {fecha.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })}
              {' · '}{order.events?.venue}
            </p>
          )}
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>
        </div>
        <div className="text-right flex-none">
          <p className="text-[#F472B6] font-bold text-sm">{order.order_code}</p>
          <p className="text-white/30 text-xs mt-1">{order.cantidad} {order.cantidad > 1 ? t('account.tickets') : t('account.ticket')}</p>
          <p className="text-white/20 text-xs mt-1">{isExpanded ? '▲' : '▼'}</p>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-white/8 px-4 py-4 space-y-4">
          {order.event_tickets.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-2">
              {order.status === 'confirmado' ? t('account.ticketsArriving') : t('account.pendingConfirmation')}
            </p>
          ) : showQR ? (
            <div className="space-y-4">
              {order.event_tickets.map(ticket => (
                <div key={ticket.id} className="flex flex-col items-center gap-3 bg-white/4 rounded-2xl p-4">
                  <p className="text-white/55 text-xs font-semibold uppercase tracking-wider">
                    {t('account.ticketOf', { n: ticket.ticket_number, total: order.cantidad })}
                  </p>
                  <button
                    onClick={() => onOpenQR({
                      token: ticket.qr_token,
                      orderCode: order.order_code,
                      label: `${order.events?.nombre ?? 'Evento'} · ${t('account.ticketShort', { n: ticket.ticket_number })}`,
                    })}
                    className="bg-white p-3 rounded-xl active:scale-95 transition-transform cursor-pointer"
                    title={t('account.tapToEnlarge')}
                  >
                    <QRCode value={ticket.qr_token} size={160} />
                  </button>
                  <p className="text-white/20 text-[10px] uppercase tracking-wider">{t('account.tapToEnlarge')}</p>
                  {ticket.check_in_at ? (
                    <p className="text-green-400 text-xs font-semibold">{t('account.checkedInAt', { time: new Date(ticket.check_in_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) })}</p>
                  ) : (
                    <p className="text-white/30 text-xs">{t('account.notCheckedIn')}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {order.event_tickets.map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between bg-white/3 rounded-xl px-3 py-2">
                  <span className="text-white/55 text-xs">{t('account.ticketShort', { n: ticket.ticket_number })}</span>
                  {ticket.check_in_at
                    ? <span className="text-green-400 text-xs">{t('account.checkedInAt', { time: new Date(ticket.check_in_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) })}</span>
                    : <span className="text-white/25 text-xs">{t('account.notCheckedIn')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
