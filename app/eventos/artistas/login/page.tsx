'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { copyFor, type CopyKey } from '../../copy'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'
import { Field } from '../components/Field'
import { ARTIST_ART } from '../components/artistArt'

export default function ArtistaLoginPage() {
  const { lang, t } = useLanguage()
  const c = (key: CopyKey) => copyFor(lang, key)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [forgot, setForgot] = useState(false)
  const [reveal, setReveal] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { error: err } = await supabaseBrowser.auth.signInWithPassword({ email, password })
      if (err) throw new Error(t('artistas.login.errorInvalid'))
      router.push('/eventos/artistas/panel')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('artistas.login.errorInvalid'))
    } finally { setLoading(false) }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await fetch('/api/eventos/artistas/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    setSuccess(t('login.forgotSuccess'))
    setLoading(false)
  }

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
            <img src={ARTIST_ART} alt="" loading="lazy" />
          </div>
          <div className="ev-auth__panel">
            <div className="ev-auth__inner">
              <div className="ev-stack ev-stack--sm">
                <p className="ev-eyebrow">{c('ev.forArtists')}</p>
                <h1 className="ev-display ev-display--md">{t('artistas.login.title')}</h1>
              </div>

              {error && (
                <div className="ev-banner ev-banner--error" role="alert">
                  <Icon name="alert-triangle" />
                  <div><p className="ev-banner__title">{error}</p></div>
                </div>
              )}
              {success && (
                <div className="ev-banner ev-banner--success" role="status">
                  <Icon name="check-circle" />
                  <div><p className="ev-banner__title">{success}</p></div>
                </div>
              )}

              {!forgot ? (
                <form className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-5)' }} onSubmit={handleLogin} aria-busy={loading}>
                  <Field id="al-e" label={t('login.email')} icon="mail" type="email" autoComplete="email" required placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} />
                  <Field id="al-p" label={t('login.password')} icon="lock" type={reveal ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} suffix={pwToggle} />
                  <button className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`} type="submit" disabled={loading}>
                    {loading ? t('artistas.login.entering') : t('artistas.login.enter')}
                  </button>
                  <p style={{ textAlign: 'center' }}>
                    <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setForgot(true)}>{t('artistas.login.forgot')}</button>
                  </p>
                </form>
              ) : (
                <form className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-5)' }} onSubmit={handleForgot} aria-busy={loading}>
                  <Field id="af-e" label={t('login.yourEmail')} icon="mail" type="email" autoComplete="email" required placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} />
                  {!success && (
                    <button className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`} type="submit" disabled={loading}>
                      {loading ? t('login.sending') : t('login.sendLink')}
                    </button>
                  )}
                  <button type="button" className="ev-back-link" style={{ background: 'transparent', border: 0, justifySelf: 'center' }} onClick={() => { setForgot(false); setSuccess('') }}>
                    {t('login.backToSignIn')}
                  </button>
                </form>
              )}

              <Link href="/eventos/artistas/aplicar" className="ev-back-link" style={{ justifySelf: 'center' }}>
                {t('artistas.login.backToApply')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
