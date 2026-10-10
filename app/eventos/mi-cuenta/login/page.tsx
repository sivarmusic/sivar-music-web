'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { safeInternalPath } from '@/lib/safe-redirect'
import { copyFor, type CopyKey } from '../../copy'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'
import arteEntradas from '../../assets/arte-entradas.svg'

type Tab = 'login' | 'register' | 'forgot'

const ART = typeof arteEntradas === 'string' ? arteEntradas : (arteEntradas as { src: string }).src
const MIN_PASSWORD = 8

function LoginForm() {
  const { lang, t } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeInternalPath(searchParams.get('next'), '/eventos/mi-cuenta')

  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [success, setSuccess] = useState('')
  const [reveal, setReveal] = useState(false)

  const supabase = supabaseBrowser

  function switchTab(next: Tab) { setTab(next); setError(''); setPasswordError(''); setSuccess('') }

  async function handleGoogleLogin() {
    setError(''); setLoading(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${next}` },
    })
    if (err) { setError(err.message); setLoading(false) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        if (err.message === 'Email not confirmed') {
          router.push(`/eventos/mi-cuenta/verificar?email=${encodeURIComponent(email)}`)
          return
        }
        throw new Error(err.message === 'Invalid login credentials' ? t('login.errorInvalid') : err.message)
      }
      router.push(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errorUnexpected'))
    } finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(''); setPasswordError('')
    // Misma regla de siempre (mínimo 8), ahora con mensaje por campo como en el diseño.
    if (password.length < MIN_PASSWORD) {
      setPasswordError(c('eva.pwShort', { n: password.length, min: MIN_PASSWORD }))
      document.getElementById('su-p')?.focus()
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/eventos/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nombre }),
      })
      if (res.ok) {
        // Server route auto-confirmed the user; sign them in immediately.
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) {
          setError(t('login.errorUnexpected'))
        } else {
          router.push(next)
        }
      } else if (res.status === 409) {
        setError(t('login.errorAlreadyExists'))
      } else {
        setError(t('login.errorUnexpected'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errorUnexpected'))
    } finally { setLoading(false) }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await fetch('/api/eventos/user/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSuccess(t('login.forgotSuccess'))
    } catch {
      setSuccess(t('login.forgotSuccess'))
    } finally { setLoading(false) }
  }

  const errorBanner = error && (
    <div className="ev-banner ev-banner--error" role="alert">
      <Icon name="alert-triangle" />
      <div>
        <p className="ev-banner__title">{error}</p>
        {error === t('login.errorInvalid') && <p className="ev-banner__text">{c('eva.invalidHint')}</p>}
      </div>
    </div>
  )

  const pwToggle = (
    <button
      type="button"
      className="ev-icon-btn ev-field__suffix"
      aria-pressed={reveal}
      aria-label={reveal ? c('eva.hidePw') : c('eva.showPw')}
      onClick={() => setReveal(r => !r)}
    >
      <Icon name={reveal ? 'eye-off' : 'eye'} />
    </button>
  )

  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main">
        <section className="ev-auth">
          <div className="ev-auth__art" aria-hidden="true">
            <img src={ART} alt="" loading="lazy" />
          </div>
          <div className="ev-auth__panel">
            <div className="ev-auth__inner">
              <div className="ev-stack ev-stack--sm">
                <p className="ev-eyebrow">{c('eva.brand')}</p>
                <h1 className="ev-display ev-display--md">
                  {tab === 'login' ? t('login.tabSignIn') : tab === 'register' ? t('login.tabCreate') : t('login.tabForgot')}
                </h1>
              </div>

              {tab !== 'forgot' && (
                <div className="ev-segmented" role="tablist" aria-label={c('eva.access')}>
                  <button type="button" className="ev-segmented__opt" role="tab" id="tab-in" aria-controls="p-in" aria-selected={tab === 'login'} tabIndex={tab === 'login' ? 0 : -1} onClick={() => switchTab('login')}>
                    {t('login.enter')}
                  </button>
                  <button type="button" className="ev-segmented__opt" role="tab" id="tab-up" aria-controls="p-up" aria-selected={tab === 'register'} tabIndex={tab === 'register' ? 0 : -1} onClick={() => switchTab('register')}>
                    {t('login.createAccount')}
                  </button>
                </div>
              )}

              {errorBanner}
              {success && (
                <div className="ev-banner ev-banner--success" role="status">
                  <Icon name="check-circle" />
                  <div><p className="ev-banner__title">{success}</p></div>
                </div>
              )}

              {tab === 'login' && (
                <form className="ev-stack" id="p-in" role="tabpanel" aria-labelledby="tab-in" style={{ ['--stack-gap' as string]: 'var(--ev-space-5)' }} onSubmit={handleLogin}>
                  <div className="ev-field">
                    <label className="ev-field__label" htmlFor="li-e">{t('login.email')}</label>
                    <div className="ev-field__control">
                      <Icon name="mail" />
                      <input className="ev-input" id="li-e" type="email" autoComplete="email" required placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="ev-field">
                    <label className="ev-field__label" htmlFor="li-p">{t('login.password')}</label>
                    <div className="ev-field__control">
                      <Icon name="lock" />
                      <input className="ev-input" id="li-p" type={reveal ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                      {pwToggle}
                    </div>
                  </div>
                  <button className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`} type="submit" disabled={loading}>
                    {loading ? t('login.entering') : t('login.enter')}
                  </button>
                  <p style={{ textAlign: 'center' }}>
                    <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => switchTab('forgot')}>{t('login.forgotPassword')}</button>
                  </p>
                </form>
              )}

              {tab === 'register' && (
                <form className="ev-stack" id="p-up" role="tabpanel" aria-labelledby="tab-up" style={{ ['--stack-gap' as string]: 'var(--ev-space-5)' }} onSubmit={handleRegister}>
                  <div className="ev-field">
                    <label className="ev-field__label" htmlFor="su-n">{t('login.fullName')}</label>
                    <input className="ev-input" id="su-n" type="text" autoComplete="name" required placeholder={t('login.fullNamePh')} value={nombre} onChange={e => setNombre(e.target.value)} />
                  </div>
                  <div className="ev-field">
                    <label className="ev-field__label" htmlFor="su-e">{t('login.email')}</label>
                    <div className="ev-field__control">
                      <Icon name="mail" />
                      <input className="ev-input" id="su-e" type="email" autoComplete="email" required placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className={`ev-field${passwordError ? ' ev-field--error' : ''}`}>
                    <label className="ev-field__label" htmlFor="su-p">{t('login.password')}</label>
                    <div className="ev-field__control">
                      <Icon name="lock" />
                      <input
                        className="ev-input"
                        id="su-p"
                        type={reveal ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        aria-invalid={!!passwordError}
                        aria-describedby={passwordError ? 'su-p-e' : 'su-p-h'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      {pwToggle}
                    </div>
                    {passwordError
                      ? <p className="ev-field__error" id="su-p-e"><Icon name="alert-circle" size="sm" />{passwordError}</p>
                      : <p className="ev-field__hint" id="su-p-h">{t('login.passwordMinPh')}.</p>}
                  </div>
                  <button className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`} type="submit" disabled={loading}>
                    {loading ? t('login.creatingAccount') : t('login.createAccount')}
                  </button>
                  <p className="ev-subtle" style={{ textAlign: 'center' }}>{t('login.createAccountNote')}</p>
                </form>
              )}

              {tab === 'forgot' && (
                <form className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-5)' }} onSubmit={handleForgot}>
                  <div className="ev-field">
                    <label className="ev-field__label" htmlFor="fg-e">{t('login.yourEmail')}</label>
                    <div className="ev-field__control">
                      <Icon name="mail" />
                      <input className="ev-input" id="fg-e" type="email" autoComplete="email" required placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                  {!success && (
                    <button className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`} type="submit" disabled={loading}>
                      {loading ? t('login.sending') : t('login.sendLink')}
                    </button>
                  )}
                  <button type="button" className="ev-back-link" style={{ background: 'transparent', border: 0, justifySelf: 'center' }} onClick={() => switchTab('login')}>
                    {t('login.backToSignIn')}
                  </button>
                </form>
              )}

              {tab !== 'forgot' && (
                <>
                  <p className="ev-or-sep">{t('login.orContinueWith')}</p>
                  <button type="button" className="ev-btn ev-btn--google ev-btn--block" onClick={handleGoogleLogin} disabled={loading}>
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.28-2.1 3.56-5.2 3.56-8.84z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.9l-3.89-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.11C3.26 21.3 7.3 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11z"/>
                      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.59 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z"/>
                    </svg>
                    {t('login.continueGoogle')}
                  </button>
                </>
              )}

              <Link href="/eventos" className="ev-back-link" style={{ justifySelf: 'center' }}>
                <Icon name="arrow-left" size="sm" />{c('ev.title')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="ev-surface" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  )
}
