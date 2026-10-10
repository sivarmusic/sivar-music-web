'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'

export default function NuevaContrasenaPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else router.push('/eventos/mi-cuenta/login')
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
      router.push('/eventos/mi-cuenta')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetPw.errorUnexpected'))
    } finally { setLoading(false) }
  }

  const shell = (main: React.ReactNode) => (
    <div className="ev-surface">
      <SiteHeader />
      {main}
      <SiteFooter />
    </div>
  )

  if (!ready) return shell(
    <main id="main" className="ev-state-screen" aria-busy="true">
      <p className="ev-muted" role="status">{t('resetPw.verifying')}</p>
    </main>
  )

  return shell(
    <main id="main" className="ev-container ev-container--narrow ev-page">
      <div className="ev-auth__inner" style={{ paddingBlock: 'var(--ev-space-8)' }}>
        <div className="ev-stack ev-stack--sm">
          <p className="ev-eyebrow">Sivar Eventos</p>
          <h1 className="ev-display ev-display--md">{t('resetPw.title')}</h1>
        </div>
        <form onSubmit={handleSubmit} className="ev-stack" style={{ ['--stack-gap' as string]: 'var(--ev-space-5)' }}>
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="np-pw">{t('resetPw.newPassword')}</label>
            <div className="ev-field__control">
              <Icon name="lock" />
              <input className="ev-input" id="np-pw" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder={t('login.passwordMinPh')} />
            </div>
          </div>
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="np-pw2">{t('resetPw.confirmPassword')}</label>
            <div className="ev-field__control">
              <Icon name="lock" />
              <input className="ev-input" id="np-pw2" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder={t('resetPw.confirmPasswordPh')} />
            </div>
          </div>
          {error && (
            <div className="ev-banner ev-banner--error" role="alert">
              <Icon name="alert-triangle" />
              <div><p className="ev-banner__title">{error}</p></div>
            </div>
          )}
          <button type="submit" disabled={loading} className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`}>
            {loading ? t('resetPw.saving') : t('resetPw.save')}
          </button>
        </form>
      </div>
    </main>
  )
}
