'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'

export default function ArtistaLoginPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [forgot, setForgot] = useState(false)

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

  return (
    <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/eventos/artistas" className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">Sivar Events for Artists</Link>
          <h1 className="text-white text-xl font-bold mt-2">{t('artistas.login.title')}</h1>
        </div>

        {!forgot ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className={INPUT} />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {loading ? t('artistas.login.entering') : t('artistas.login.enter')}
            </button>
            <button type="button" onClick={() => setForgot(true)}
              className="w-full text-white/30 hover:text-white/60 text-xs text-center transition py-1">
              {t('artistas.login.forgot')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-3">
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.yourEmail')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            {success
              ? <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-2xl px-4 py-3 text-center">{success}</p>
              : (
                <button type="submit" disabled={loading}
                  className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
                  {loading ? t('login.sending') : t('login.sendLink')}
                </button>
              )}
            <button type="button" onClick={() => { setForgot(false); setSuccess('') }}
              className="w-full text-white/30 hover:text-white/60 text-xs text-center transition py-1">
              {t('login.backToSignIn')}
            </button>
          </form>
        )}

        <p className="text-white/20 text-xs text-center">
          <Link href="/eventos/artistas/aplicar" className="hover:text-white/50 transition">{t('artistas.login.backToApply')}</Link>
        </p>
      </div>
    </div>
  )
}
