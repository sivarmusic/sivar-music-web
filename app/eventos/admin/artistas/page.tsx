'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Application {
  id: string; nombre_artistico: string; nombre_contacto: string; email: string; telefono: string | null
  genero: string | null; bio: string | null; instagram: string | null; spotify: string | null
  tiktok: string | null; youtube: string | null; otro_link: string | null
  status: 'pendiente' | 'aprobado' | 'rechazado'; created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  aprobado: { label: 'Aprobado', color: 'text-green-400', bg: 'bg-green-400/10' },
  rechazado: { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default function AdminArtistasPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/eventos/artistas/aplicaciones')
    if (res.status === 401) { router.push('/eventos/admin/login'); return }
    const data = await res.json()
    setApplications(data.applications ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  async function review(id: string, status: 'aprobado' | 'rechazado') {
    if (status === 'aprobado' && !window.confirm('¿Aprobar esta solicitud? Se le enviará una invitación por email para crear su contraseña.')) return
    if (status === 'rechazado' && !window.confirm('¿Rechazar esta solicitud?')) return
    setActionId(id)
    const res = await fetch(`/api/eventos/artistas/aplicaciones/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = await res.json()
      window.alert(data.error || 'Error al procesar')
    }
    await fetchData()
    setActionId(null)
  }

  if (loading) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>

  const pending = applications.filter(a => a.status === 'pendiente')
  const reviewed = applications.filter(a => a.status !== 'pendiente')

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <div className="border-b border-white/8 px-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Sivar Music</p>
          <h1 className="text-white text-lg font-bold">Admin — Solicitudes de artistas</h1>
        </div>
        <Link href="/eventos/admin" className="text-white/40 hover:text-white text-xs transition">← Admin eventos</Link>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-8">
        <div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Pendientes ({pending.length})</p>
          {pending.length === 0 ? (
            <p className="text-white/30 text-sm">No hay solicitudes pendientes.</p>
          ) : (
            <div className="space-y-3">
              {pending.map(app => (
                <ApplicationCard key={app.id} app={app} expanded={expandedId === app.id}
                  onExpand={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  onReview={review} actionId={actionId} />
              ))}
            </div>
          )}
        </div>

        {reviewed.length > 0 && (
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Revisadas</p>
            <div className="space-y-2">
              {reviewed.map(app => {
                const info = STATUS_LABELS[app.status]
                return (
                  <div key={app.id} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{app.nombre_artistico}</p>
                      <p className="text-white/35 text-xs mt-0.5 truncate">{app.email}</p>
                    </div>
                    <span className={`flex-none text-xs px-3 py-1.5 rounded-xl font-semibold ${info.bg} ${info.color}`}>{info.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ApplicationCard({ app, expanded, onExpand, onReview, actionId }: {
  app: Application; expanded: boolean; onExpand: () => void
  onReview: (id: string, status: 'aprobado' | 'rechazado') => void; actionId: string | null
}) {
  const links = [
    { label: 'Instagram', value: app.instagram }, { label: 'Spotify', value: app.spotify },
    { label: 'TikTok', value: app.tiktok }, { label: 'YouTube', value: app.youtube },
    { label: 'Otro', value: app.otro_link },
  ].filter(l => l.value)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 overflow-hidden">
      <button onClick={onExpand} className="w-full px-4 py-4 text-left flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">{app.nombre_artistico}</p>
          <p className="text-white/40 text-xs mt-0.5">{app.nombre_contacto} · {app.email}</p>
          {app.genero && <p className="text-white/30 text-xs mt-0.5">{app.genero}</p>}
        </div>
        <p className="text-white/20 text-xs flex-none">{expanded ? '▲' : '▼'}</p>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-4 py-4 space-y-3">
          {app.telefono && <p className="text-white/50 text-sm">📞 {app.telefono}</p>}
          {app.bio && <p className="text-white/50 text-sm leading-relaxed">{app.bio}</p>}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links.map(l => (
                <a key={l.label} href={l.value!} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold text-white/60 hover:text-[#F472B6] bg-white/6 hover:bg-white/10 px-3 py-1.5 rounded-full transition">
                  {l.label}
                </a>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => onReview(app.id, 'rechazado')} disabled={actionId === app.id}
              className="flex-1 bg-white/8 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 text-white/60 font-bold text-xs uppercase tracking-wider rounded-xl py-3 transition">
              Rechazar
            </button>
            <button onClick={() => onReview(app.id, 'aprobado')} disabled={actionId === app.id}
              className="flex-1 bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl py-3 transition">
              {actionId === app.id ? 'Procesando...' : 'Aprobar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
