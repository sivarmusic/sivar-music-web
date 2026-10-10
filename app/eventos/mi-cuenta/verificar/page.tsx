/**
 * New email/password signups are auto-confirmed server-side via
 * /api/eventos/user/register (admin.createUser with email_confirm: true)
 * and no longer route here. This page is retained for legacy/edge
 * accounts created before the auto-confirm fix — direct visits still
 * render the resend-verification flow.
 */
'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'

const RESEND_WAIT = 60

function VerificarContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [seconds, setSeconds] = useState(RESEND_WAIT)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  async function handleResend() {
    if (!email || sending) return
    setSending(true); setError(''); setSent(false)
    try {
      const { error: err } = await supabaseBrowser.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/eventos/mi-cuenta/login` },
      })
      if (err) throw new Error(err.message)
      setSent(true)
      setSeconds(RESEND_WAIT)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('verify.errorResend'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main" className="ev-container ev-container--narrow ev-page">
        <div className="ev-stack ev-stack--lg" style={{ paddingBlock: 'var(--ev-space-8)' }}>
          <header className="ev-stack ev-stack--sm">
            <p className="ev-eyebrow">Sivar Eventos</p>
            <h1 className="ev-display ev-display--md">{t('verify.title')}</h1>
            <p className="ev-lead">
              {t('verify.body1')}{' '}
              {email && <strong style={{ color: 'var(--ev-color-text)' }}>{email}</strong>}.{' '}
              {t('verify.body2')}
            </p>
          </header>

          <section className="ev-admin-card ev-stack" style={{ padding: 'var(--ev-space-5)' }} aria-labelledby="ev-h-noreceived">
            <h2 className="ev-title ev-title--sm" id="ev-h-noreceived">{t('verify.notReceived')}</h2>
            <p className="ev-muted">{t('verify.checkSpam')}</p>

            <div role="status">
              {sent && !error && (
                <div className="ev-banner ev-banner--success">
                  <Icon name="check-circle" />
                  <div><p className="ev-banner__title">{t('verify.resent')}</p></div>
                </div>
              )}
            </div>
            <div role="alert">
              {error && (
                <div className="ev-banner ev-banner--error">
                  <Icon name="alert-triangle" />
                  <div><p className="ev-banner__title">{error}</p></div>
                </div>
              )}
            </div>

            {seconds > 0 ? (
              <p className="ev-subtle" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ev-space-3)' }}>
                <Icon name="clock" size="sm" />
                {t('verify.resend')}
                <span className="ev-mono ev-tabular" style={{ color: 'var(--ev-color-text)' }}>{seconds}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={sending}
                className={`ev-btn ev-btn--secondary ev-btn--sm${sending ? ' is-loading' : ''}`}
              >
                {sending ? t('verify.sending') : t('verify.resend')}
              </button>
            )}
          </section>

          <div className="ev-stack ev-stack--sm">
            <Link href="/eventos/mi-cuenta/login" className="ev-btn ev-btn--primary ev-btn--lg ev-btn--block">
              {t('verify.confirmed')}
            </Link>
            <Link href="/eventos" className="ev-back-link" style={{ justifySelf: 'center' }}>
              {t('verify.backToEvents')}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function VerificarPage() {
  return (
    <Suspense fallback={<div className="ev-surface" aria-busy="true" />}>
      <VerificarContent />
    </Suspense>
  )
}
