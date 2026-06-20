'use client'
import { useState } from 'react'

interface Order {
  id: string
  order_code: string
  nombre: string
  cantidad: number
  status: string
}

interface Props {
  onSuccess: (order: Order) => void
}

export default function TicketForm({ onSuccess }: Props) {
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', cantidad: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'cantidad' ? Number(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim() || !form.telefono.trim() || !form.email.trim()) {
      setError('Completá todos los campos.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('El correo no es válido.')
      return
    }
    if (form.telefono.replace(/\D/g, '').length < 8) {
      setError('El teléfono no parece válido (mínimo 8 dígitos).')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/pinkfest/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al registrar')
      onSuccess(data.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const total = form.cantidad * 10

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase mb-3">
          A beneficio de Fundación Hogar Felino
        </p>
        <h2 className="text-white text-2xl font-bold mb-1">Conseguí tu entrada</h2>
        <p className="text-white/50 text-sm">Beerhaus · Dom 12 Jul · 4:00 PM · Donación $10</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white/60 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">
            Nombre completo
          </label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Tu nombre completo"
            autoComplete="name"
            className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 focus:bg-white/10 transition"
            required
          />
        </div>

        <div>
          <label className="block text-white/60 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">
            WhatsApp / Teléfono
          </label>
          <input
            type="tel"
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
            placeholder="+503 7000 0000"
            autoComplete="tel"
            className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 focus:bg-white/10 transition"
            required
          />
        </div>

        <div>
          <label className="block text-white/60 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="tu@correo.com"
            autoComplete="email"
            className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 focus:bg-white/10 transition"
            required
          />
        </div>

        <div>
          <label className="block text-white/60 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">
            Cantidad de entradas
          </label>
          <select
            name="cantidad"
            value={form.cantidad}
            onChange={handleChange}
            className="w-full bg-[#1a0014] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>
                {n} entrada{n > 1 ? 's' : ''} — ${n * 10}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all"
        >
          {loading ? 'Registrando...' : `Continuar → $${total}`}
        </button>
      </form>
    </div>
  )
}
