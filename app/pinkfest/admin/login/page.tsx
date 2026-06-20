'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PinkFestAdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/pinkfest/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        router.push('/pinkfest/admin')
      } else {
        const data = await res.json()
        setError(data.error || 'Error al iniciar sesión')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0008] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-2">
            Pink Fest
          </p>
          <h1 className="text-white text-2xl font-bold">Panel de administrador</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Correo"
            required
            autoComplete="email"
            className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            autoComplete="current-password"
            className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition"
          />

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
