'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { safeInternalPath } from '@/lib/safe-redirect'
import { Icon } from '../../components/icons'

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = safeInternalPath(searchParams.get('redirect'), '/eventos/admin', { prefix: '/eventos/admin' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/staff/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) { router.push(redirect) } else {
        const data = await res.json()
        setError(data.error || 'Error al iniciar sesión')
      }
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }

  return (
    <main
      id="main"
      style={{
        minHeight: '100dvh', display: 'grid', placeItems: 'center',
        padding: 'var(--ev-space-8) var(--ev-gutter)',
        background: 'repeating-linear-gradient(-12deg, transparent 0 22px, rgb(244 114 182 / .05) 22px 24px), var(--ev-color-bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }} className="ev-stack ev-stack--lg">
        <div className="ev-stack ev-stack--sm">
          <span className="ev-wordmark ev-wordmark--lg" aria-hidden="true">Sivar<br />Eventos</span>
          <p className="ev-eyebrow">Panel de eventos</p>
        </div>
        <form onSubmit={handleSubmit} className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-5)' }} aria-busy={loading}>
          <h1 className="ev-display ev-display--md">Ingresar</h1>
          {error && (
            <div className="ev-banner ev-banner--error" role="alert">
              <Icon name="lock" />
              <div><p className="ev-banner__title">{error}</p></div>
            </div>
          )}
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="adm-email">Correo o usuario</label>
            <div className="ev-field__control">
              <Icon name="mail" />
              <input
                className="ev-input" id="adm-email" type="text" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="username" disabled={loading} aria-invalid={error ? true : undefined}
              />
            </div>
          </div>
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="adm-pass">Contraseña</label>
            <div className="ev-field__control">
              <Icon name="lock" />
              <input
                className="ev-input" id="adm-pass" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password" disabled={loading} aria-invalid={error ? true : undefined}
              />
              <button
                type="button" className="ev-icon-btn ev-field__suffix" aria-pressed={showPass}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPass(s => !s)}
              >
                <Icon name={showPass ? 'eye-off' : 'eye'} />
              </button>
            </div>
          </div>
          <button className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`} type="submit" disabled={loading} aria-disabled={loading}>
            {loading ? 'Ingresando' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function EventosAdminLogin() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  )
}
