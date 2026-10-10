'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { resolveTicketVerifyUrl } from '@/app/components/resolveTicketVerifyUrl'
import { Icon } from '../../components/icons'
import DoorScanner from '../components/DoorScanner'

export default function VerificarPage() {
  const router = useRouter()
  const [manualToken, setManualToken] = useState('')

  function handleDecode(decoded: string) {
    router.push(resolveTicketVerifyUrl(decoded, '/eventos/admin/verificar'))
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = manualToken.trim()
    if (!token) return
    router.push(resolveTicketVerifyUrl(token, '/eventos/admin/verificar'))
  }

  return (
    <main id="main" className="ev-door" aria-label="Escáner de entradas">
      <header className="ev-door__top">
        <Link className="ev-icon-btn ev-icon-btn--boxed ev-door__top-btn" href="/eventos/admin" aria-label="Volver al panel">
          <Icon name="arrow-left" size="lg" />
        </Link>
        <h1 className="ev-door__event">Verificar<br />entrada</h1>
      </header>

      <DoorScanner onDecode={handleDecode}>
        {/* Verificación manual — siempre disponible como respaldo si el QR falla o tarda */}
        <form onSubmit={handleManualSubmit} className="ev-door-field" style={{ width: 'min(100%, 420px)' }}>
          <p className="ev-door__sep">o pegá el código de la entrada</p>
          <label className="ev-visually-hidden" htmlFor="manual-token">Código de la entrada</label>
          <input
            id="manual-token" className="ev-input" type="text" value={manualToken}
            onChange={e => setManualToken(e.target.value)} placeholder="Código de la entrada (qr_token)"
          />
          <button type="submit" className="ev-door-btn ev-door-btn--light ev-door-btn--sm" disabled={!manualToken.trim()}>
            Verificar código
          </button>
        </form>
      </DoorScanner>
    </main>
  )
}
