'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'

type Tab = 'login' | 'register' | 'forgot'

function LoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/eventos/mi-cuenta'

  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = supabaseBrowser

  function switchTab(t: Tab) { setTab(t); setError(''); setSuccess('') }

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
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nombre },
          emailRedirectTo: `${window.location.origin}/eventos/mi-cuenta/login`,
        },
      })
      if (signUpErr) {
        if (signUpErr.message.toLowerCase().includes('already')) throw new Error(t('login.errorAlreadyExists'))
        throw new Error(signUpErr.message)
      }
      if (data.session) {
        // Confirmación de email deshabilitada — sesión inmediata
        router.push(next)
      } else {
        // Confirmación requerida — llevar a página de verificación
        router.push(`/eventos/mi-cuenta/verificar?email=${encodeURIComponent(email)}`)
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

  const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'

  return (
    <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/eventos" className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">Sivar Events</Link>
          <h1 className="text-white text-xl font-bold mt-2">
            {tab === 'login' ? t('login.tabSignIn') : tab === 'register' ? t('login.tabCreate') : t('login.tabForgot')}
          </h1>
        </div>

        {/* Tabs principales */}
        <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
          <button onClick={() => switchTab('login')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${tab === 'login' ? 'bg-[#F472B6] text-white' : 'text-white/40 hover:text-white'}`}>
            {t('login.enter')}
          </button>
          <button onClick={() => switchTab('register')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${tab === 'register' ? 'bg-[#F472B6] text-white' : 'text-white/40 hover:text-white'}`}>
            {t('login.createAccount')}
          </button>
        </div>

        {tab !== 'forgot' && (
          <div className="space-y-3">
            <button type="button" onClick={handleGoogleLogin} disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-white/90 disabled:opacity-50 text-[#1f1f1f] font-semibold text-sm rounded-2xl py-3.5 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.28-2.1 3.56-5.2 3.56-8.84z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.9l-3.89-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.11C3.26 21.3 7.3 24 12 24z"/>
                <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11z"/>
                <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.59 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z"/>
              </svg>
              {t('login.continueGoogle')}
            </button>
            <div className="flex items-center gap-3">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-white/25 text-[10px] uppercase tracking-wider">{t('login.orWithEmail')}</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>
          </div>
        )}

        {tab === 'login' && (
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
            {success && <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-2xl px-4 py-3 text-center">{success}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {loading ? t('login.entering') : t('login.enter')}
            </button>
            <button type="button" onClick={() => switchTab('forgot')}
              className="w-full text-white/30 hover:text-white/60 text-xs text-center transition py-1">
              {t('login.forgotPassword')}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.fullName')}</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder={t('login.fullNamePh')} className={INPUT} />
            </div>
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={t('login.passwordMinPh')} minLength={6} className={INPUT} />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {loading ? t('login.creatingAccount') : t('login.createAccount')}
            </button>
            <p className="text-white/20 text-xs text-center leading-relaxed">
              {t('login.createAccountNote')}
            </p>
          </form>
        )}

        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-3">
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.yourEmail')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}
            {success
              ? <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-2xl px-4 py-3 text-center">{success}</p>
              : (
                <button type="submit" disabled={loading}
                  className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
                  {loading ? t('login.sending') : t('login.sendLink')}
                </button>
              )}
            <button type="button" onClick={() => switchTab('login')}
              className="w-full text-white/30 hover:text-white/60 text-xs text-center transition py-1">
              {t('login.backToSignIn')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
