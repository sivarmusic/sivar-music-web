'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import UserMenu from '../../components/UserMenu'

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'

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
    if (password.length < 6) { setPasswordMsg(t('resetPw.errorMinLength')); return }
    setSavingPassword(true)
    const { error } = await supabaseBrowser.auth.updateUser({ password })
    setPasswordMsg(error ? error.message : t('settings.saved'))
    if (!error) { setPassword(''); setConfirm('') }
    setSavingPassword(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">{t('account.loading')}</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
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
          <Link href="/eventos/mi-cuenta" className="text-white/35 hover:text-white text-xs transition block mb-2">{t('settings.back')}</Link>
          <h1 className="text-white text-lg font-bold">{t('settings.title')}</h1>
        </div>

        {/* Perfil */}
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{t('settings.profile')}</p>

          <div>
            <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('settings.fullName')}</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className={INPUT} />
          </div>

          <div>
            <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('settings.phone')}</label>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className={INPUT} />
          </div>

          <div>
            <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('settings.email')}</label>
            <input type="email" value={email} disabled className={INPUT + ' opacity-40 cursor-not-allowed'} />
          </div>

          {profileMsg && (
            <p className={`text-sm rounded-2xl px-4 py-3 text-center border ${profileMsg === t('settings.saved') ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
              {profileMsg}
            </p>
          )}

          <button type="submit" disabled={savingProfile}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
            {savingProfile ? t('settings.saving') : t('settings.save')}
          </button>
        </form>

        {/* Contraseña */}
        <div className="border-t border-white/8 pt-6">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">{t('settings.password')}</p>

          {isGoogleOnly ? (
            <p className="text-white/30 text-sm">{t('settings.googleNotice')}</p>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('resetPw.newPassword')}</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} placeholder={t('login.passwordMinPh')} className={INPUT} />
              </div>
              <div>
                <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('resetPw.confirmPassword')}</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t('resetPw.confirmPasswordPh')} className={INPUT} />
              </div>

              {passwordMsg && (
                <p className={`text-sm rounded-2xl px-4 py-3 text-center border ${passwordMsg === t('settings.saved') ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                  {passwordMsg}
                </p>
              )}

              <button type="submit" disabled={savingPassword}
                className="w-full bg-white/8 hover:bg-white/15 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
                {savingPassword ? t('settings.saving') : t('settings.changePassword')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
