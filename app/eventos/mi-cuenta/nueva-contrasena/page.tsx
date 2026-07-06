'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n'

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
    if (password.length < 6) { setError(t('resetPw.errorMinLength')); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw new Error(err.message)
      router.push('/eventos/mi-cuenta')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetPw.errorUnexpected'))
    } finally { setLoading(false) }
  }

  if (!ready) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">{t('resetPw.verifying')}</p></div>

  return (
    <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">Sivar Music</p>
          <h1 className="text-white text-xl font-bold mt-2">{t('resetPw.title')}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('resetPw.newPassword')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              placeholder={t('login.passwordMinPh')}
              className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition" />
          </div>
          <div>
            <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('resetPw.confirmPassword')}</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              placeholder={t('resetPw.confirmPasswordPh')}
              className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition" />
          </div>
          {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
            {loading ? t('resetPw.saving') : t('resetPw.save')}
          </button>
        </form>
      </div>
    </div>
  )
}
