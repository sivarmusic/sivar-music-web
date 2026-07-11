'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHeader from '../components/AdminHeader'
import { useRequireAdmin } from '../components/useRequireAdmin'

interface Application {
  id: string; nombre_artistico: string; nombre_contacto: string; email: string; telefono: string | null
  genero: string | null; bio: string | null; instagram: string | null; spotify: string | null
  tiktok: string | null; youtube: string | null; otro_link: string | null
  status: 'pendiente' | 'aprobado' | 'rechazado'; created_at: string
}

interface ArtistEvent {
  id: string; nombre: string; descripcion: string | null; fecha: string; venue: string
  direccion: string | null; imagen_url: string | null; lat: number | null; lng: number | null
  precio: number | null; max_entradas: number | null
  link_externo: string | null; status: 'pendiente' | 'aprobado' | 'rechazado'
  artist_profiles: { nombre_artistico: string; slug: string } | { nombre_artistico: string; slug: string }[] | null
}

interface Profile {
  id: string; slug: string; nombre_artistico: string; genero: string | null; bio: string | null
  foto_url: string | null; instagram: string | null; spotify: string | null
  tiktok: string | null; youtube: string | null; apple_music: string | null; otro_link: string | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  aprobado: { label: 'Aprobado', color: 'text-green-400', bg: 'bg-green-400/10' },
  rechazado: { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-400/10' },
}

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'
const LABEL = 'block text-white/45 text-[10px] font-bold uppercase tracking-wider mb-1'

function getArtist(rel: ArtistEvent['artist_profiles']) {
  return Array.isArray(rel) ? rel[0] : rel
}

export default function AdminArtistasPage() {
  useRequireAdmin()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [events, setEvents] = useState<ArtistEvent[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [appsRes, eventsRes, profilesRes] = await Promise.all([
      fetch('/api/eventos/artistas/aplicaciones'),
      fetch('/api/eventos/artistas/eventos'),
      fetch('/api/eventos/artistas/perfiles'),
    ])
    if (appsRes.status === 401 || eventsRes.status === 401 || profilesRes.status === 401) { router.push('/eventos/admin/login'); return }
    const [appsData, eventsData, profilesData] = await Promise.all([appsRes.json(), eventsRes.json(), profilesRes.json()])
    setApplications(appsData.applications ?? [])
    setEvents(eventsData.events ?? [])
    setProfiles(profilesData.profiles ?? [])
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

  async function reviewEvent(id: string, status: 'aprobado' | 'rechazado') {
    if (status === 'aprobado' && !window.confirm('¿Publicar este evento?')) return
    if (status === 'rechazado' && !window.confirm('¿Rechazar este evento?')) return
    setActionId(id)
    const res = await fetch(`/api/eventos/artistas/eventos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = await res.json()
      window.alert(data.error || 'Error al procesar')
    }
    await fetchData()
    setActionId(null)
  }

  async function saveEvent(id: string, fields: Partial<ArtistEvent>) {
    const res = await fetch(`/api/eventos/artistas/eventos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    })
    const data = await res.json()
    if (!res.ok) { window.alert(data.error || 'Error al guardar'); return false }
    await fetchData()
    return true
  }

  async function saveProfile(id: string, fields: Partial<Profile>) {
    const res = await fetch(`/api/eventos/artistas/perfiles/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    })
    const data = await res.json()
    if (!res.ok) { window.alert(data.error || 'Error al guardar'); return false }
    await fetchData()
    return true
  }

  if (loading) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>

  const pending = applications.filter(a => a.status === 'pendiente')
  const reviewed = applications.filter(a => a.status !== 'pendiente')
  const pendingEvents = events.filter(e => e.status === 'pendiente')
  const reviewedEvents = events.filter(e => e.status !== 'pendiente')

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <AdminHeader />
      <div className="px-5 pt-5 max-w-2xl mx-auto">
        <h1 className="text-white text-lg font-bold">Artistas</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-8">
        <div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Solicitudes pendientes ({pending.length})</p>
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
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Solicitudes revisadas</p>
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

        <div className="border-t border-white/8 pt-8">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Eventos por confirmar ({pendingEvents.length})</p>
          {pendingEvents.length === 0 ? (
            <p className="text-white/30 text-sm">No hay eventos pendientes.</p>
          ) : (
            <div className="space-y-3">
              {pendingEvents.map(ev => (
                <EventCard key={ev.id} ev={ev} onReview={reviewEvent} onSave={saveEvent} actionId={actionId} />
              ))}
            </div>
          )}
        </div>

        {reviewedEvents.length > 0 && (
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Eventos revisados</p>
            <div className="space-y-3">
              {reviewedEvents.map(ev => (
                <EventCard key={ev.id} ev={ev} onReview={reviewEvent} onSave={saveEvent} actionId={actionId} collapsedByDefault />
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/8 pt-8">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Perfiles de artistas ({profiles.length})</p>
          {profiles.length === 0 ? (
            <p className="text-white/30 text-sm">Todavía no hay artistas aprobados.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map(p => <ProfileCard key={p.id} profile={p} onSave={saveProfile} />)}
            </div>
          )}
        </div>
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

function EventCard({ ev, onReview, onSave, actionId, collapsedByDefault }: {
  ev: ArtistEvent; onReview: (id: string, status: 'aprobado' | 'rechazado') => void
  onSave: (id: string, fields: Partial<ArtistEvent>) => Promise<boolean | undefined>
  actionId: string | null; collapsedByDefault?: boolean
}) {
  const artist = getArtist(ev.artist_profiles)
  const fecha = new Date(ev.fecha)
  const info = STATUS_LABELS[ev.status]
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: ev.nombre, descripcion: ev.descripcion ?? '', fecha: ev.fecha.slice(0, 16),
    venue: ev.venue, direccion: ev.direccion ?? '', lat: ev.lat?.toString() ?? '', lng: ev.lng?.toString() ?? '',
    precio: ev.precio?.toString() ?? '', max_entradas: ev.max_entradas?.toString() ?? '', link_externo: ev.link_externo ?? '',
  })

  function set<K extends keyof typeof form>(key: K, value: string) { setForm(f => ({ ...f, [key]: value })) }

  async function handleSave() {
    setSaving(true)
    const ok = await onSave(ev.id, {
      nombre: form.nombre, descripcion: form.descripcion || null, fecha: form.fecha,
      venue: form.venue, direccion: form.direccion || null,
      lat: form.lat ? parseFloat(form.lat) : null, lng: form.lng ? parseFloat(form.lng) : null,
      precio: form.precio ? parseFloat(form.precio) : null,
      max_entradas: form.max_entradas ? parseInt(form.max_entradas) : null,
      link_externo: form.link_externo || null,
    })
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (!editing && collapsedByDefault) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{ev.nombre}</p>
          <p className="text-white/35 text-xs mt-0.5 truncate">{artist?.nombre_artistico} · {fecha.toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <span className={`text-xs px-3 py-1.5 rounded-xl font-semibold ${info.bg} ${info.color}`}>{info.label}</span>
          <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-white/8 text-white/50 hover:bg-[#F472B6]/20 hover:text-[#F472B6] transition">
            Editar
          </button>
        </div>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/4 overflow-hidden">
        {ev.imagen_url && <img src={ev.imagen_url} alt={ev.nombre} className="w-full h-40 object-cover" />}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white font-semibold text-sm">{ev.nombre}</p>
              <p className="text-white/40 text-xs mt-0.5">{artist?.nombre_artistico ?? '—'}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {fecha.toLocaleDateString('es-SV', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}{ev.venue}
              </p>
              {ev.direccion && <p className="text-white/30 text-xs mt-0.5">{ev.direccion}</p>}
              {ev.precio != null && <p className="text-white/30 text-xs mt-0.5">Precio: ${ev.precio}</p>}
              {ev.max_entradas != null && <p className="text-white/30 text-xs mt-0.5">Máx. entradas: {ev.max_entradas}</p>}
            </div>
            <button onClick={() => setEditing(true)} className="flex-none text-xs px-3 py-1.5 rounded-xl font-semibold bg-white/8 text-white/50 hover:bg-[#F472B6]/20 hover:text-[#F472B6] transition">
              Editar
            </button>
          </div>
          {ev.descripcion && <p className="text-white/50 text-sm leading-relaxed">{ev.descripcion}</p>}
          {ev.link_externo && (
            <a href={ev.link_externo} target="_blank" rel="noopener noreferrer"
              className="inline-block text-xs font-semibold text-white/60 hover:text-[#F472B6] bg-white/6 hover:bg-white/10 px-3 py-1.5 rounded-full transition">
              Link externo
            </a>
          )}
          {ev.status === 'pendiente' && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => onReview(ev.id, 'rechazado')} disabled={actionId === ev.id}
                className="flex-1 bg-white/8 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 text-white/60 font-bold text-xs uppercase tracking-wider rounded-xl py-3 transition">
                Rechazar
              </button>
              <button onClick={() => onReview(ev.id, 'aprobado')} disabled={actionId === ev.id}
                className="flex-1 bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl py-3 transition">
                {actionId === ev.id ? 'Procesando...' : 'Publicar'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#F472B6]/30 bg-white/4 p-4 space-y-2">
      <div><label className={LABEL}>Nombre</label><input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>Descripción</label><textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2} className={INPUT + ' resize-none'} /></div>
      <div><label className={LABEL}>Fecha y hora</label><input type="datetime-local" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={INPUT + ' [color-scheme:dark]'} /></div>
      <div><label className={LABEL}>Venue</label><input value={form.venue} onChange={e => set('venue', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>Dirección</label><input value={form.direccion} onChange={e => set('direccion', e.target.value)} className={INPUT} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={LABEL}>Latitud</label><input type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Longitud</label><input type="number" step="any" value={form.lng} onChange={e => set('lng', e.target.value)} className={INPUT} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={LABEL}>Precio</label><input type="number" step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} className={INPUT} /></div>
        <div><label className={LABEL}>Máx. entradas</label><input type="number" value={form.max_entradas} onChange={e => set('max_entradas', e.target.value)} className={INPUT} /></div>
      </div>
      <div><label className={LABEL}>Link externo</label><input value={form.link_externo} onChange={e => set('link_externo', e.target.value)} className={INPUT} /></div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => setEditing(false)} className="flex-1 bg-white/8 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl py-3 transition">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl py-3 transition">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function ProfileCard({ profile, onSave }: {
  profile: Profile; onSave: (id: string, fields: Partial<Profile>) => Promise<boolean | undefined>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre_artistico: profile.nombre_artistico, genero: profile.genero ?? '', bio: profile.bio ?? '',
    instagram: profile.instagram ?? '', spotify: profile.spotify ?? '', tiktok: profile.tiktok ?? '',
    youtube: profile.youtube ?? '', apple_music: profile.apple_music ?? '', otro_link: profile.otro_link ?? '',
  })

  function set<K extends keyof typeof form>(key: K, value: string) { setForm(f => ({ ...f, [key]: value })) }

  async function handleSave() {
    setSaving(true)
    const ok = await onSave(profile.id, form)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (!editing) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/8 flex-none">
            {profile.foto_url && <img src={profile.foto_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{profile.nombre_artistico}</p>
            <p className="text-white/35 text-xs mt-0.5 truncate">/eventos/artistas/{profile.slug}</p>
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="flex-none text-xs px-3 py-1.5 rounded-xl font-semibold bg-white/8 text-white/50 hover:bg-[#F472B6]/20 hover:text-[#F472B6] transition">
          Editar
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#F472B6]/30 bg-white/4 p-4 space-y-2">
      <div><label className={LABEL}>Nombre artístico</label><input value={form.nombre_artistico} onChange={e => set('nombre_artistico', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>Género</label><input value={form.genero} onChange={e => set('genero', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>Bio</label><textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={2} className={INPUT + ' resize-none'} /></div>
      <div><label className={LABEL}>Instagram</label><input value={form.instagram} onChange={e => set('instagram', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>Spotify</label><input value={form.spotify} onChange={e => set('spotify', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>TikTok</label><input value={form.tiktok} onChange={e => set('tiktok', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>YouTube</label><input value={form.youtube} onChange={e => set('youtube', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>Apple Music</label><input value={form.apple_music} onChange={e => set('apple_music', e.target.value)} className={INPUT} /></div>
      <div><label className={LABEL}>Otro link</label><input value={form.otro_link} onChange={e => set('otro_link', e.target.value)} className={INPUT} /></div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => setEditing(false)} className="flex-1 bg-white/8 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl py-3 transition">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl py-3 transition">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
