'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Icon } from '../../../components/icons'
import DoorResult from '../../components/DoorResult'
import { formatEventDateTime } from '@/lib/eventDate'
import { EVENT_TZ } from '@/lib/eventDate'

interface TicketInfo {
  order_code: string
  nombre: string
  cantidad: number
  evento: string
  evento_fecha?: string | null
  ticket_number: number
  check_in_at: string | null
  order_type: string
  cortesia_categoria: string | null
}

const CATEGORIA_LABELS: Record<string, string> = {
  staff: 'Staff', organizacion: 'Organización', vip: 'VIP', musicos: 'Músicos (banda)',
}

type PageState = 'loading' | 'valid' | 'already_used' | 'invalid' | 'not_confirmed' | 'error'

export default function VerificarTokenPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [ticket, setTicket] = useState<TicketInfo | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [checkingIn, setCheckingIn] = useState(false)
  const [justCheckedIn, setJustCheckedIn] = useState(false)
  const [checkInError, setCheckInError] = useState('')

  useEffect(() => {
    fetch(`/api/eventos/verify/${token}`)
      .then(async r => {
        const data = await r.json()
        if (r.ok) {
          setTicket(data.ticket)
          setPageState(data.ticket.check_in_at ? 'already_used' : 'valid')
        } else if (r.status === 401) {
          router.push(`/eventos/admin/login?redirect=/eventos/admin/verificar/${token}`)
        } else if (r.status === 400) {
          setPageState('not_confirmed')
        } else if (r.status === 404) {
          setPageState('invalid')
        } else {
          setPageState('error')
        }
      })
      .catch(() => setPageState('error'))
  }, [token, router])

  async function handleCheckIn() {
    setCheckingIn(true)
    setCheckInError('')
    try {
      const res = await fetch(`/api/eventos/verify/${token}`, { method: 'PATCH' })
      if (res.ok) {
        if (navigator.vibrate) navigator.vibrate([60, 40, 60])
        setJustCheckedIn(true)
        setPageState('already_used')
      } else if (res.status === 401) {
        router.push(`/eventos/admin/login?redirect=/eventos/admin/verificar/${token}`)
      } else {
        const data = await res.json().catch(() => ({} as { error?: string; alreadyUsed?: boolean; check_in_at?: string | null }))
        if (data.alreadyUsed) {
          setTicket(t => (t ? { ...t, check_in_at: data.check_in_at ?? t.check_in_at } : t))
          setPageState('already_used')
        } else {
          // 400 (no confirmada), 404, 500...: el portero debe ver qué pasó y poder reintentar.
          setCheckInError(data.error || 'No se pudo registrar el ingreso. Intentá de nuevo.')
        }
      }
    } catch {
      setCheckInError('Sin conexión. Revisá tu internet e intentá de nuevo.')
    } finally {
      setCheckingIn(false)
    }
  }

  const tipoLabel = ticket
    ? ticket.order_type === 'cortesia'
      ? `Cortesía — ${CATEGORIA_LABELS[ticket.cortesia_categoria ?? ''] ?? ticket.cortesia_categoria}`
      : 'Comprada'
    : ''

  const eventDateLabel = ticket?.evento_fecha ? formatEventDateTime(ticket.evento_fecha) : ''
  // Aviso (no bloqueo): evento que terminó hace más de 24 h.
  const pastWarning = !!ticket?.evento_fecha
    && new Date(ticket.evento_fecha).getTime() < Date.now() - 24 * 60 * 60 * 1000

  const scanNext = () => router.push('/eventos/admin/verificar')
  const nextButton = (
    <button type="button" className="ev-door-btn" onClick={scanNext}>
      <Icon name="scan" />Escanear siguiente
    </button>
  )

  if (pageState === 'loading') {
    return (
      <main id="main" className="ev-door">
        <header className="ev-door__top">
          <h1 className="ev-door__event">Verificar<br />entrada</h1>
        </header>
        <div className="ev-door__stage">
          <p className="ev-door__status" role="status" aria-busy="true">Verificando…</p>
        </div>
        <div className="ev-door__actions" />
      </main>
    )
  }

  if (pageState === 'invalid') {
    return (
      <main id="main">
        <DoorResult kind="invalid" icon="x" word="Inválida" detail="Esta entrada no existe en el sistema." band="No dejar pasar">
          {nextButton}
        </DoorResult>
      </main>
    )
  }

  if (pageState === 'not_confirmed') {
    return (
      <main id="main">
        <DoorResult kind="used" icon="alert-triangle" word={<>No<br />confirmada</>} detail="Esta entrada aún no fue confirmada por el admin." band="No dejar pasar">
          {nextButton}
        </DoorResult>
      </main>
    )
  }

  if (pageState === 'error') {
    return (
      <main id="main">
        <DoorResult kind="invalid" icon="alert-circle" word="Error" detail="No se pudo verificar la entrada.">
          {nextButton}
        </DoorResult>
      </main>
    )
  }

  const warning = pastWarning ? (
    <>
      <strong>Evento ya pasado.</strong>{' '}
      Esta entrada es de &quot;{ticket?.evento}&quot;, que fue el {eventDateLabel}. Confirmá que sea la entrada correcta.
    </>
  ) : undefined

  const who = ticket ? (
    <>{ticket.nombre}<br />Entrada {ticket.ticket_number} de {ticket.cantidad}</>
  ) : undefined
  const meta = ticket
    ? [`${ticket.order_code} · ${ticket.evento}`, tipoLabel, ...(eventDateLabel ? [eventDateLabel] : [])]
    : undefined

  if (pageState === 'already_used') {
    if (justCheckedIn) {
      return (
        <main id="main">
          <DoorResult
            kind="valid" icon="check" word="Ingresó" detail={who}
            meta={['Entrada registrada correctamente', ...(meta ?? [])]} band="Puede pasar" warning={warning}
          >
            {nextButton}
          </DoorResult>
        </main>
      )
    }
    const time = new Date(ticket?.check_in_at ?? '').toLocaleTimeString('es-SV', { timeZone: EVENT_TZ, hour: '2-digit', minute: '2-digit' })
    return (
      <main id="main">
        <DoorResult
          kind="used" icon="alert-triangle" word={<>Ya<br />ingresó</>}
          detail={<>Ingresó a las {time}<br />{ticket?.nombre}</>}
          meta={meta ? [`${meta[0]} · Entrada ${ticket?.ticket_number} de ${ticket?.cantidad}`, ...meta.slice(1)] : undefined}
          band="No dejar pasar" warning={warning}
        >
          {nextButton}
        </DoorResult>
      </main>
    )
  }

  return (
    <main id="main">
      <DoorResult
        kind="valid" icon="check" word="Válida" detail={who} meta={meta}
        band="Falta confirmar el ingreso" warning={warning} error={checkInError || undefined}
      >
        <button type="button" className="ev-door-btn" onClick={handleCheckIn} disabled={checkingIn}>
          <Icon name={checkInError ? 'refresh' : 'check'} />
          {checkingIn ? 'Registrando…' : checkInError ? 'Reintentar ingreso' : 'Confirmar ingreso'}
        </button>
        <button type="button" className="ev-door__link" onClick={scanNext}>
          <Icon name="arrow-left" />Verificar otra entrada
        </button>
      </DoorResult>
    </main>
  )
}
