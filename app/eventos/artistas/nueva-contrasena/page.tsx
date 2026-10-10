'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n'
import { copyFor, type CopyKey } from '../../copy'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'
import { Field } from '../components/Field'
import { ARTIST_ART } from '../components/artistArt'

export default function NuevaContrasenaArtistaPage() {
  const { lang, t } = useLanguage()
  const c = (key: CopyKey) => copyFor(lang, key)
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [reveal, setReveal] = useState(false)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else router.push('/eventos/artistas/login')
    })
  }, [router, supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (password !== confirm) { setError(t('resetPw.errorMismatch')); return }
    if (password.length < 8) { setError(t('resetPw.errorMinLength')); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw new Error(err.message)
      router.push('/eventos/artistas/panel')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetPw.errorUnexpected'))
    } finally { setLoading(false) }
  }

  if (!ready) {
    return (
      <div className="ev-surface">
        <div className="ev-state-screen"><p className="ev-muted" role="status">{t('resetPw.verifying')}</p></div>
      </div>
    )
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
  const type = reveal ? 'text' : 'password'
  const pwErr = error === t('resetPw.errorMinLength') ? error : undefined
  const confirmErr = error === t('resetPw.errorMismatch') ? error : undefined

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
                <h1 className="ev-display ev-display--md">{t('resetPw.title')}</h1>
              </div>

              {error && !pwErr && !confirmErr && (
                <div className="ev-banner ev-banner--error" role="alert">
                  <Icon name="alert-triangle" />
                  <div><p className="ev-banner__title">{error}</p></div>
                </div>
              )}

              <form className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-5)' }} onSubmit={handleSubmit} aria-busy={loading}>
                <Field
                  id="np-p" label={t('resetPw.newPassword')} icon="lock" type={type} autoComplete="new-password"
                  required minLength={8} placeholder={t('login.passwordMinPh')}
                  value={password} onChange={e => setPassword(e.target.value)} suffix={pwToggle}
                  error={pwErr}
                />
                <Field
                  id="np-c" label={t('resetPw.confirmPassword')} icon="lock" type={type} autoComplete="new-password"
                  required placeholder={t('resetPw.confirmPasswordPh')}
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  error={confirmErr}
                />
                <button className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`} type="submit" disabled={loading}>
                  {loading ? t('resetPw.saving') : t('resetPw.save')}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
