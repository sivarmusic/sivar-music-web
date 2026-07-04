'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Suspense } from 'react'

type Tab = 'login' | 'register' | 'forgot'

function LoginForm() {
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  function switchTab(t: Tab) { setTab(t); setError(''); setSuccess('') }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw new Error(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : err.message)
      router.push(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
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
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear cuenta')
      // Iniciar sesión automáticamente
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) {
        setSuccess('Cuenta creada. Ya podés iniciar sesión.')
        switchTab('login')
      } else {
        router.push(next)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
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
      setSuccess('Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña.')
    } catch {
      setSuccess('Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña.')
    } finally { setLoading(false) }
  }

  const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'

  return (
    <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/eventos" className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">Sivar Events</Link>
          <h1 className="text-white text-xl font-bold mt-2">
            {tab === 'login' ? 'Iniciar sesión' : tab === 'register' ? 'Crear cuenta' : 'Recuperar contraseña'}
          </h1>
        </div>

        {/* Tabs principales */}
        <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
          <button onClick={() => switchTab('login')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${tab === 'login' ? 'bg-[#F472B6] text-white' : 'text-white/40 hover:text-white'}`}>
            Entrar
          </button>
          <button onClick={() => switchTab('register')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${tab === 'register' ? 'bg-[#F472B6] text-white' : 'text-white/40 hover:text-white'}`}>
            Crear cuenta
          </button>
        </div>

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className={INPUT} />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}
            {success && <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-2xl px-4 py-3 text-center">{success}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" onClick={() => switchTab('forgot')}
              className="w-full text-white/30 hover:text-white/60 text-xs text-center transition py-1">
              Olvidé mi contraseña
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">Nombre completo</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Tu nombre" className={INPUT} />
            </div>
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" minLength={6} className={INPUT} />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            <p className="text-white/20 text-xs text-center leading-relaxed">
              Al crear una cuenta podés ver tus entradas y recibir notificaciones de eventos.
            </p>
          </form>
        )}

        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-3">
            <div>
              <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">Tu correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}
            {success
              ? <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-2xl px-4 py-3 text-center">{success}</p>
              : (
                <button type="submit" disabled={loading}
                  className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              )}
            <button type="button" onClick={() => switchTab('login')}
              className="w-full text-white/30 hover:text-white/60 text-xs text-center transition py-1">
              ← Volver al inicio de sesión
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
