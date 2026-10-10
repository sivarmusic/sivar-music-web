'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAdmin } from '../components/useRequireAdmin'
import { EVENT_TZ } from '@/lib/eventDate'
import { Icon, type IconName } from '../../components/icons'
import { Field, AreaField } from '../../artistas/components/Field'

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

const STATUS_LABELS: Record<string, { label: string; cls: string; icon: IconName }> = {
  pendiente: { label: 'Pendiente', cls: 'review', icon: 'hourglass' },
  aprobado: { label: 'Aprobado', cls: 'confirmed', icon: 'check-circle' },
  rechazado: { label: 'Rechazado', cls: 'rejected', icon: 'x-circle' },
}

function StatusChip({ status }: { status: string }) {
  const info = STATUS_LABELS[status]
  return <span className={`ev-chip ev-chip--${info.cls}`}><Icon name={info.icon} />{info.label}</span>
}

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

  if (loading) return <div className="ev-state-screen"><p className="ev-muted" role="status">Cargando…</p></div>

  const pending = applications.filter(a => a.status === 'pendiente')
  const reviewed = applications.filter(a => a.status !== 'pendiente')
  const pendingEvents = events.filter(e => e.status === 'pendiente')
  const reviewedEvents = events.filter(e => e.status !== 'pendiente')

  return (
    <>
      <div className="ev-page-head">
        <div className="ev-stack ev-stack--sm">
          <h1 className="ev-display ev-display--md">Artistas</h1>
          <p className="ev-muted">Revisá solicitudes, eventos informativos y perfiles de Sivar Events for Artists.</p>
        </div>
      </div>

      <div className="ev-stack ev-stack--lg">
        <section aria-labelledby="h-sol">
          <h2 className="ev-title ev-title--sm" id="h-sol" style={{ marginBottom: 'var(--ev-space-4)' }}>Solicitudes pendientes ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className="ev-empty"><p className="ev-empty__text">No hay solicitudes pendientes.</p></div>
          ) : (
            <div className="ev-stack">
              {pending.map(app => (
                <ApplicationCard key={app.id} app={app} expanded={expandedId === app.id}
                  onExpand={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  onReview={review} actionId={actionId} />
              ))}
            </div>
          )}
        </section>

        {reviewed.length > 0 && (
          <section aria-labelledby="h-rev">
            <h2 className="ev-title ev-title--sm" id="h-rev" style={{ marginBottom: 'var(--ev-space-4)' }}>Solicitudes revisadas</h2>
            <ul className="ev-stack" role="list" style={{ listStyle: 'none', padding: 0 }}>
              {reviewed.map(app => (
                <li key={app.id} className="ev-admin-card ev-admin-card__head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="ev-title ev-title--sm">{app.nombre_artistico}</p>
                    <p className="ev-subtle" style={{ overflowWrap: 'anywhere' }}>{app.email}</p>
                  </div>
                  <StatusChip status={app.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <hr className="ev-divider" />

        <section aria-labelledby="h-evp">
          <h2 className="ev-title ev-title--sm" id="h-evp" style={{ marginBottom: 'var(--ev-space-4)' }}>Eventos por confirmar ({pendingEvents.length})</h2>
          {pendingEvents.length === 0 ? (
            <div className="ev-empty"><p className="ev-empty__text">No hay eventos pendientes.</p></div>
          ) : (
            <div className="ev-stack">
              {pendingEvents.map(ev => (
                <EventCard key={ev.id} ev={ev} onReview={reviewEvent} onSave={saveEvent} actionId={actionId} />
              ))}
            </div>
          )}
        </section>

        {reviewedEvents.length > 0 && (
          <section aria-labelledby="h-evr">
            <h2 className="ev-title ev-title--sm" id="h-evr" style={{ marginBottom: 'var(--ev-space-4)' }}>Eventos revisados</h2>
            <div className="ev-stack">
              {reviewedEvents.map(ev => (
                <EventCard key={ev.id} ev={ev} onReview={reviewEvent} onSave={saveEvent} actionId={actionId} collapsedByDefault />
              ))}
            </div>
          </section>
        )}

        <hr className="ev-divider" />

        <section aria-labelledby="h-prf">
          <h2 className="ev-title ev-title--sm" id="h-prf" style={{ marginBottom: 'var(--ev-space-4)' }}>Perfiles de artistas ({profiles.length})</h2>
          {profiles.length === 0 ? (
            <div className="ev-empty"><p className="ev-empty__text">Todavía no hay artistas aprobados.</p></div>
          ) : (
            <div className="ev-stack">
              {profiles.map(p => <ProfileCard key={p.id} profile={p} onSave={saveProfile} />)}
            </div>
          )}
        </section>
      </div>
    </>
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
    <div className="ev-admin-card">
      <button
        type="button" onClick={onExpand} aria-expanded={expanded} aria-controls={`app-${app.id}`}
        className="ev-admin-card__head" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, color: 'inherit', cursor: 'pointer', minHeight: 'var(--ev-tap-min)' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="ev-title ev-title--sm">{app.nombre_artistico}</p>
          <p className="ev-subtle" style={{ overflowWrap: 'anywhere' }}>{app.nombre_contacto} · {app.email}</p>
          {app.genero && <p className="ev-subtle">{app.genero}</p>}
        </div>
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
      </button>

      {expanded && (
        <div className="ev-admin-card__body" id={`app-${app.id}`}>
          {app.telefono && <p className="ev-muted"><Icon name="phone" size="sm" /> {app.telefono}</p>}
          {app.bio && <p className="ev-muted">{app.bio}</p>}
          {links.length > 0 && (
            <div className="ev-cluster">
              {links.map(l => (
                <a key={l.label} className="ev-btn ev-btn--secondary ev-btn--sm" href={l.value!} target="_blank" rel="noopener noreferrer">
                  <Icon name="external" />{l.label}
                </a>
              ))}
            </div>
          )}
          <div className="ev-cluster">
            <button type="button" className="ev-btn ev-btn--danger ev-btn--sm" onClick={() => onReview(app.id, 'rechazado')} disabled={actionId === app.id}>
              <Icon name="x" />Rechazar
            </button>
            <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={() => onReview(app.id, 'aprobado')} disabled={actionId === app.id}>
              <Icon name="check" />{actionId === app.id ? 'Procesando…' : 'Aprobar'}
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
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: ev.nombre, descripcion: ev.descripcion ?? '', fecha: ev.fecha.slice(0, 16),
    venue: ev.venue, direccion: ev.direccion ?? '', lat: ev.lat?.toString() ?? '', lng: ev.lng?.toString() ?? '',
    precio: ev.precio?.toString() ?? '', max_entradas: ev.max_entradas?.toString() ?? '', link_externo: ev.link_externo ?? '',
  })

  function set<K extends keyof typeof form>(key: K) { return (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value })) }

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
      <div className="ev-admin-card ev-admin-card__head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="ev-title ev-title--sm">{ev.nombre}</p>
          <p className="ev-subtle">{artist?.nombre_artistico} · {fecha.toLocaleDateString('es-SV', { timeZone: EVENT_TZ })}</p>
        </div>
        <div className="ev-cluster" style={{ flex: 'none' }}>
          <StatusChip status={ev.status} />
          <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setEditing(true)} aria-label={`Editar ${ev.nombre}`}>
            <Icon name="edit" />Editar
          </button>
        </div>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="ev-admin-card">
        <div className="ev-admin-card__head">
          <div className="ev-admin-card__thumb">
            {ev.imagen_url
              ? <img src={ev.imagen_url} alt="" />
              : <div className="ev-poster-fallback" aria-hidden="true"><span className="ev-poster-fallback__name">{ev.nombre}</span></div>}
          </div>
          <div className="ev-stack ev-stack--sm" style={{ flex: 1, minWidth: 0 }}>
            <StatusChip status={ev.status} />
            <h3 className="ev-title ev-title--sm">{ev.nombre}</h3>
            <p className="ev-subtle">{artist?.nombre_artistico ?? '—'}</p>
            <p className="ev-subtle">
              {fecha.toLocaleDateString('es-SV', { timeZone: EVENT_TZ, weekday: 'short', day: 'numeric', month: 'short' })}
              {' · '}{ev.venue}
            </p>
            {ev.direccion && <p className="ev-subtle">{ev.direccion}</p>}
            {ev.precio != null && <p className="ev-subtle">Precio: ${ev.precio}</p>}
            {ev.max_entradas != null && <p className="ev-subtle">Máx. entradas: {ev.max_entradas}</p>}
          </div>
          <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setEditing(true)} aria-label={`Editar ${ev.nombre}`}>
            <Icon name="edit" />Editar
          </button>
        </div>
        <div className="ev-admin-card__body">
          {ev.descripcion && <p className="ev-muted">{ev.descripcion}</p>}
          {ev.link_externo && (
            <div className="ev-cluster">
              <a className="ev-btn ev-btn--secondary ev-btn--sm" href={ev.link_externo} target="_blank" rel="noopener noreferrer">
                <Icon name="external" />Link externo
              </a>
            </div>
          )}
          {ev.status === 'pendiente' && (
            <div className="ev-cluster">
              <button type="button" className="ev-btn ev-btn--danger ev-btn--sm" onClick={() => onReview(ev.id, 'rechazado')} disabled={actionId === ev.id}>
                <Icon name="x" />Rechazar
              </button>
              <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={() => onReview(ev.id, 'aprobado')} disabled={actionId === ev.id}>
                <Icon name="check" />{actionId === ev.id ? 'Procesando…' : 'Publicar'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const p = `ee-${ev.id}`
  return (
    <div className="ev-admin-card ev-admin-form ev-stack">
      <h3 className="ev-title ev-title--sm">Editar evento</h3>
      <div className="ev-form-grid ev-form-grid--2">
        <Field id={`${p}-n`} className="ev-span-2" label="Nombre" value={form.nombre} onChange={set('nombre')} />
        <AreaField id={`${p}-d`} className="ev-span-2" label="Descripción" rows={2} value={form.descripcion} onChange={set('descripcion')} />
        <Field id={`${p}-f`} label="Fecha y hora" type="datetime-local" value={form.fecha} onChange={set('fecha')} />
        <Field id={`${p}-v`} label="Venue" value={form.venue} onChange={set('venue')} />
        <Field id={`${p}-a`} className="ev-span-2" label="Dirección" value={form.direccion} onChange={set('direccion')} />
        <Field id={`${p}-la`} label="Latitud" type="number" step="any" value={form.lat} onChange={set('lat')} />
        <Field id={`${p}-lo`} label="Longitud" type="number" step="any" value={form.lng} onChange={set('lng')} />
        <Field id={`${p}-p`} label="Precio" type="number" step="0.01" value={form.precio} onChange={set('precio')} />
        <Field id={`${p}-m`} label="Máx. entradas" type="number" value={form.max_entradas} onChange={set('max_entradas')} />
        <Field id={`${p}-l`} className="ev-span-2" label="Link externo" value={form.link_externo} onChange={set('link_externo')} />
      </div>
      <div className="ev-cluster">
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setEditing(false)}>Cancelar</button>
        <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
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

  function set<K extends keyof typeof form>(key: K) { return (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value })) }

  async function handleSave() {
    setSaving(true)
    const ok = await onSave(profile.id, form)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (!editing) {
    return (
      <div className="ev-admin-card ev-admin-card__head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="ev-cluster" style={{ minWidth: 0, flexWrap: 'nowrap' }}>
          <div className="ev-avatar" style={{ width: 48, height: 48 }}>
            {profile.foto_url ? <img src={profile.foto_url} alt="" /> : <Icon name="user" />}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="ev-title ev-title--sm">{profile.nombre_artistico}</p>
            <p className="ev-subtle" style={{ overflowWrap: 'anywhere' }}>/eventos/artistas/{profile.slug}</p>
          </div>
        </div>
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setEditing(true)} aria-label={`Editar ${profile.nombre_artistico}`}>
          <Icon name="edit" />Editar
        </button>
      </div>
    )
  }

  const p = `ep-${profile.id}`
  return (
    <div className="ev-admin-card ev-admin-form ev-stack">
      <h3 className="ev-title ev-title--sm">Editar perfil</h3>
      <div className="ev-form-grid ev-form-grid--2">
        <Field id={`${p}-n`} label="Nombre artístico" value={form.nombre_artistico} onChange={set('nombre_artistico')} />
        <Field id={`${p}-g`} label="Género" value={form.genero} onChange={set('genero')} />
        <AreaField id={`${p}-b`} className="ev-span-2" label="Bio" rows={2} value={form.bio} onChange={set('bio')} />
        <Field id={`${p}-ig`} label="Instagram" icon="instagram" value={form.instagram} onChange={set('instagram')} />
        <Field id={`${p}-sp`} label="Spotify" icon="spotify" value={form.spotify} onChange={set('spotify')} />
        <Field id={`${p}-tk`} label="TikTok" icon="music" value={form.tiktok} onChange={set('tiktok')} />
        <Field id={`${p}-yt`} label="YouTube" icon="youtube" value={form.youtube} onChange={set('youtube')} />
        <Field id={`${p}-am`} label="Apple Music" icon="music" value={form.apple_music} onChange={set('apple_music')} />
        <Field id={`${p}-ot`} label="Otro link" icon="globe" value={form.otro_link} onChange={set('otro_link')} />
      </div>
      <div className="ev-cluster">
        <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setEditing(false)}>Cancelar</button>
        <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
