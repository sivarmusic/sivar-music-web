'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'

export default function AjustesPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [isGoogleOnly, setIsGoogleOnly] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.push('/eventos/mi-cuenta/login'); return }
      setUserId(session.user.id)
      setEmail(session.user.email ?? '')
      setIsGoogleOnly(session.user.app_metadata?.provider === 'google')

      const { data: profile } = await supabaseBrowser
        .from('attendee_profiles')
        .select('nombre, telefono')
        .eq('id', session.user.id)
        .maybeSingle()

      setNombre(profile?.nombre ?? session.user.user_metadata?.full_name ?? '')
      setTelefono(profile?.telefono ?? '')
      setLoading(false)
    })
  }, [router])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setProfileMsg(''); setSavingProfile(true)
    const { error } = await supabaseBrowser
      .from('attendee_profiles')
      .upsert({ id: userId, nombre: nombre.trim(), telefono: telefono.trim() })
    setProfileMsg(error ? t('settings.errorSave') : t('settings.saved'))
    setSavingProfile(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg('')
    if (password !== confirm) { setPasswordMsg(t('resetPw.errorMismatch')); return }
    if (password.length < 8) { setPasswordMsg(t('resetPw.errorMinLength')); return }
    setSavingPassword(true)
    const { error } = await supabaseBrowser.auth.updateUser({ password })
    setPasswordMsg(error ? error.message : t('settings.saved'))
    if (!error) { setPassword(''); setConfirm('') }
    setSavingPassword(false)
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

  const profileOk = profileMsg === t('settings.saved')
  const passwordOk = passwordMsg === t('settings.saved')

  return shell(
    <main id="main" className="ev-container ev-container--narrow ev-page">
      <Link href="/eventos/mi-cuenta" className="ev-back-link">
        <Icon name="arrow-left" size="sm" />{t('settings.back').replace(/^←\s*/, '')}
      </Link>
      <h1 className="ev-display ev-display--md" style={{ marginTop: 'var(--ev-space-4)' }}>{t('settings.title')}</h1>

      {/* Perfil */}
      <form onSubmit={handleSaveProfile} className="ev-stack ev-stack--lg" style={{ marginTop: 'var(--ev-space-8)' }}>
        <h2 className="ev-display ev-display--sm">{t('settings.profile')}</h2>
        <div className="ev-form-grid">
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="st-nombre">{t('settings.fullName')}</label>
            <input className="ev-input" id="st-nombre" type="text" autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="st-tel">{t('settings.phone')}</label>
            <div className="ev-field__control">
              <Icon name="phone" />
              <input className="ev-input" id="st-tel" type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>
          </div>
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="st-email">{t('settings.email')}</label>
            <div className="ev-field__control">
              <Icon name="mail" />
              <input className="ev-input" id="st-email" type="email" value={email} readOnly />
            </div>
          </div>
        </div>

        {profileMsg && (
          <div className={`ev-banner ev-banner--${profileOk ? 'success' : 'error'}`} role={profileOk ? 'status' : 'alert'}>
            <Icon name={profileOk ? 'check-circle' : 'alert-triangle'} />
            <div><p className="ev-banner__title">{profileMsg}</p></div>
          </div>
        )}

        <button type="submit" disabled={savingProfile} className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${savingProfile ? ' is-loading' : ''}`}>
          {savingProfile ? t('settings.saving') : t('settings.save')}
        </button>
      </form>

      <hr className="ev-divider" style={{ margin: 'var(--ev-space-10) 0' }} />

      {/* Contraseña */}
      <section className="ev-stack ev-stack--lg" aria-labelledby="ev-h-pw">
        <h2 className="ev-display ev-display--sm" id="ev-h-pw">{t('settings.password')}</h2>

        {isGoogleOnly ? (
          <p className="ev-muted">{t('settings.googleNotice')}</p>
        ) : (
          <form onSubmit={handleChangePassword} className="ev-stack ev-stack--lg">
            <div className="ev-form-grid">
              <div className="ev-field">
                <label className="ev-field__label" htmlFor="st-pw">{t('resetPw.newPassword')}</label>
                <div className="ev-field__control">
                  <Icon name="lock" />
                  <input className="ev-input" id="st-pw" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} placeholder={t('login.passwordMinPh')} />
                </div>
              </div>
              <div className="ev-field">
                <label className="ev-field__label" htmlFor="st-pw2">{t('resetPw.confirmPassword')}</label>
                <div className="ev-field__control">
                  <Icon name="lock" />
                  <input className="ev-input" id="st-pw2" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t('resetPw.confirmPasswordPh')} />
                </div>
              </div>
            </div>

            {passwordMsg && (
              <div className={`ev-banner ev-banner--${passwordOk ? 'success' : 'error'}`} role={passwordOk ? 'status' : 'alert'}>
                <Icon name={passwordOk ? 'check-circle' : 'alert-triangle'} />
                <div><p className="ev-banner__title">{passwordMsg}</p></div>
              </div>
            )}

            <button type="submit" disabled={savingPassword} className={`ev-btn ev-btn--secondary ev-btn--lg ev-btn--block${savingPassword ? ' is-loading' : ''}`}>
              {savingPassword ? t('settings.saving') : t('settings.changePassword')}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
