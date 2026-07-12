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

  const INPUT = 'w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6] focus:ring-2 focus:ring-[#F472B6]/15 transition'
  const heroVideoSrc = encodeURI('/VIDEO PORTADA SIVAR MUSIC WEB 2.mp4')

  return (
    <div className="relative min-h-screen flex items-center justify-center px-5 py-12 overflow-hidden bg-black">
      <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
        <source src={heroVideoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        <div>
          <Link href="/eventos" className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">Sivar Events</Link>
          <h1 className="text-gray-900 text-2xl font-bold mt-1">
            {tab === 'login' ? t('login.tabSignIn') : tab === 'register' ? t('login.tabCreate') : t('login.tabForgot')}
          </h1>
        </div>

        {/* Tabs principales */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          <button onClick={() => switchTab('login')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${tab === 'login' ? 'bg-[#F472B6] text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            {t('login.enter')}
          </button>
          <button onClick={() => switchTab('register')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${tab === 'register' ? 'bg-[#F472B6] text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            {t('login.createAccount')}
          </button>
        </div>

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            <div>
              <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className={INPUT} />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">{error}</p>}
            {success && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-center">{success}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {loading ? t('login.entering') : t('login.enter')}
            </button>
            <button type="button" onClick={() => switchTab('forgot')}
              className="w-full text-gray-400 hover:text-gray-700 text-xs text-center transition py-1">
              {t('login.forgotPassword')}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.fullName')}</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder={t('login.fullNamePh')} className={INPUT} />
            </div>
            <div>
              <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            <div>
              <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={t('login.passwordMinPh')} minLength={6} className={INPUT} />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {loading ? t('login.creatingAccount') : t('login.createAccount')}
            </button>
            <p className="text-gray-400 text-xs text-center leading-relaxed">
              {t('login.createAccountNote')}
            </p>
          </form>
        )}

        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-3">
            <div>
              <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">{t('login.yourEmail')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">{error}</p>}
            {success
              ? <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-center">{success}</p>
              : (
                <button type="submit" disabled={loading}
                  className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
                  {loading ? t('login.sending') : t('login.sendLink')}
                </button>
              )}
            <button type="button" onClick={() => switchTab('login')}
              className="w-full text-gray-400 hover:text-gray-700 text-xs text-center transition py-1">
              {t('login.backToSignIn')}
            </button>
          </form>
        )}

        {tab !== 'forgot' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">{t('login.orContinueWith')}</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
            <div className="flex justify-center">
              <button type="button" onClick={handleGoogleLogin} disabled={loading} title={t('login.continueGoogle')}
                className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.28-2.1 3.56-5.2 3.56-8.84z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.9l-3.89-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.11C3.26 21.3 7.3 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11z"/>
                  <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.59 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
