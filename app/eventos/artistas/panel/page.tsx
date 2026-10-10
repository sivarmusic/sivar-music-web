'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { formatMoneyFull } from '@/lib/format'
import { uploadErrorMessage } from './uploadError'
import { EVENT_TZ } from '@/lib/eventDate'
import { Icon, type IconName } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'
import { Field, AreaField } from '../components/Field'
import { useCopy } from '../components/useCopy'

interface Profile {
  id: string; slug: string; nombre_artistico: string; genero: string | null; bio: string | null
  foto_url: string | null; instagram: string | null; spotify: string | null
  tiktok: string | null; youtube: string | null; apple_music: string | null; otro_link: string | null
}
interface GalleryItem { id: string; image_url: string }
interface ArtistEvent {
  id: string; nombre: string; fecha: string; venue: string; direccion: string | null
  descripcion: string | null; imagen_url: string | null; link_externo: string | null
  lat: number | null; lng: number | null; precio: number | null; max_entradas: number | null
  status: 'pendiente' | 'aprobado' | 'rechazado'
}

type Tab = 'perfil' | 'galeria' | 'eventos'

async function uploadArtistImage(file: File, type: 'perfil' | 'galeria' | 'evento', token: string) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('type', type)
  const res = await fetch('/api/eventos/artistas/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(uploadErrorMessage(res.status, data.error))
  return data.url as string
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="ev-banner ev-banner--error" role="alert">
      <Icon name="alert-triangle" />
      <div><p className="ev-banner__title">{message}</p></div>
    </div>
  )
}

export default function ArtistaPanelPage() {
  const { t, c } = useCopy()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [events, setEvents] = useState<ArtistEvent[]>([])
  const [tab, setTab] = useState<Tab>('eventos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (!session) { router.push('/eventos/artistas/login'); return }
      setToken(session.access_token)

      const { data: profileData } = await supabaseBrowser.from('artist_profiles').select('*').eq('id', session.user.id).maybeSingle()
      if (!profileData) { router.push('/eventos/artistas/login'); return }
      setProfile(profileData)

      const [{ data: galleryData }, { data: eventsData }] = await Promise.all([
        supabaseBrowser.from('artist_gallery').select('id, image_url').eq('artist_id', session.user.id).order('created_at', { ascending: false }),
        supabaseBrowser.from('artist_events').select('*').eq('artist_id', session.user.id).order('fecha', { ascending: true }),
      ])
      setGallery(galleryData ?? [])
      setEvents(eventsData ?? [])
      setLoading(false)
    })
  }, [router])

  async function handleLogout() {
    await supabaseBrowser.auth.signOut()
    router.push('/eventos/artistas/login')
  }

  if (loading || !profile) {
    return (
      <div className="ev-surface">
        <div className="ev-state-screen"><p className="ev-muted" role="status">{t('account.loading')}</p></div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'eventos', label: t('artistas.panel.tabEvents') },
    { id: 'galeria', label: t('artistas.panel.tabGallery') },
    { id: 'perfil', label: t('artistas.panel.tabProfile') },
  ]

  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main" className="ev-container ev-page">
        <header className="ev-page-head">
          <div className="ev-stack ev-stack--sm">
            <p className="ev-eyebrow">{c('ev.forArtists')}</p>
            <h1 className="ev-display ev-display--md">{profile.nombre_artistico}</h1>
            <span className="ev-chip ev-chip--confirmed"><Icon name="check-circle" />{c('art.panel.published')}</span>
          </div>
          <div className="ev-cluster">
            <a className="ev-btn ev-btn--secondary ev-btn--sm" href={`/eventos/artistas/${profile.slug}`} target="_blank" rel="noopener noreferrer">
              <Icon name="external" />{c('art.panel.viewPublic')}
            </a>
            <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => setTab('perfil')}>
              <Icon name="edit" />{c('art.panel.editProfile')}
            </button>
            <button type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={handleLogout}>
              <Icon name="log-out" />{t('artistas.panel.logout')}
            </button>
          </div>
        </header>

        <div className="ev-segmented ev-artist-panel-nav" role="tablist" aria-label={c('art.panel.sections')}>
          {tabs.map(tb => (
            <button
              key={tb.id} type="button" role="tab" id={`tab-${tb.id}`} aria-controls={`panel-${tb.id}`}
              aria-selected={tab === tb.id} tabIndex={tab === tb.id ? 0 : -1}
              className="ev-segmented__opt" onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'perfil' && <ProfileTab profile={profile} setProfile={setProfile} token={token} />}
          {tab === 'galeria' && <GalleryTab artistId={profile.id} gallery={gallery} setGallery={setGallery} token={token} />}
          {tab === 'eventos' && <EventsTab events={events} setEvents={setEvents} token={token} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function ProfileTab({ profile, setProfile, token }: {
  profile: Profile; setProfile: (p: Profile) => void; token: string
}) {
  const { t, c } = useCopy()
  const [form, setForm] = useState(profile)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [uploadErr, setUploadErr] = useState('')

  function set<K extends keyof Profile>(key: K, value: Profile[K]) { setForm(f => ({ ...f, [key]: value })) }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setUploadErr('')
    try {
      const url = await uploadArtistImage(file, 'perfil', token)
      set('foto_url', url)
      await supabaseBrowser.from('artist_profiles').update({ foto_url: url }).eq('id', profile.id)
      setProfile({ ...form, foto_url: url })
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : c('art.panel.uploadFail'))
    } finally { setUploading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    const { error } = await supabaseBrowser.from('artist_profiles').update({
      bio: form.bio, genero: form.genero, instagram: form.instagram, spotify: form.spotify,
      tiktok: form.tiktok, youtube: form.youtube, apple_music: form.apple_music, otro_link: form.otro_link,
    }).eq('id', profile.id)
    setMsg(error ? { text: error.message, ok: false } : { text: t('artistas.panel.saved'), ok: true })
    setProfile(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="ev-stack ev-stack--lg ev-container--mid" style={{ marginInline: 0 }} aria-busy={saving}>
      <fieldset className="ev-fieldset">
        <legend className="ev-display ev-display--sm">{t('artistas.panel.photo')}</legend>
        <label className="ev-img-pick">
          <input type="file" accept="image/*" onChange={handlePhoto} disabled={uploading} aria-label={t('artistas.panel.changePhoto')} />
          {form.foto_url ? (
            <img src={form.foto_url} alt={c('art.panel.photoAlt', { name: form.nombre_artistico })} />
          ) : (
            <span className="ev-img-pick__empty">
              <span>
                <span className="ev-dropzone__title" style={{ display: 'block' }}>
                  {uploading ? t('pago.uploading') : c('art.panel.pickImage')}
                </span>
                <span className="ev-dropzone__formats">{c('art.panel.imageFormats')}</span>
              </span>
              <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="image" size="lg" /></span>
            </span>
          )}
        </label>
        {form.foto_url && (
          <p className="ev-subtle" style={{ marginTop: 'var(--ev-space-2)' }}>
            {uploading ? t('pago.uploading') : t('artistas.panel.changePhoto')}
          </p>
        )}
        {uploadErr && <div style={{ marginTop: 'var(--ev-space-3)' }}><ErrorBanner message={uploadErr} /></div>}
      </fieldset>

      <fieldset className="ev-fieldset">
        <legend className="ev-display ev-display--sm">{t('artistas.panel.tabProfile')}</legend>
        <div className="ev-form-grid">
          <Field id="pf-g" label={t('artistas.apply.genre')} icon="music" value={form.genero ?? ''} onChange={e => set('genero', e.target.value)} />
          <AreaField id="pf-b" label={c('art.profile.bio')} rows={4} value={form.bio ?? ''} onChange={e => set('bio', e.target.value)} />
        </div>
      </fieldset>

      <fieldset className="ev-fieldset">
        <legend className="ev-display ev-display--sm">{t('artistas.panel.socialsTitle')}</legend>
        <div className="ev-form-grid ev-form-grid--2">
          <Field id="pf-ig" label={t('artistas.panel.instagram')} icon="instagram" type="url" value={form.instagram ?? ''} onChange={e => set('instagram', e.target.value)} />
          <Field id="pf-sp" label={t('artistas.panel.spotify')} icon="spotify" type="url" value={form.spotify ?? ''} onChange={e => set('spotify', e.target.value)} />
          <Field id="pf-tk" label={t('artistas.panel.tiktok')} icon="music" type="url" value={form.tiktok ?? ''} onChange={e => set('tiktok', e.target.value)} />
          <Field id="pf-yt" label={t('artistas.panel.youtube')} icon="youtube" type="url" value={form.youtube ?? ''} onChange={e => set('youtube', e.target.value)} />
          <Field id="pf-am" label={t('artistas.panel.appleMusic')} icon="music" type="url" value={form.apple_music ?? ''} onChange={e => set('apple_music', e.target.value)} />
          <Field id="pf-ot" label={t('artistas.panel.otherLink')} icon="globe" type="url" value={form.otro_link ?? ''} onChange={e => set('otro_link', e.target.value)} />
        </div>
      </fieldset>

      {msg && (msg.ok
        ? <div className="ev-banner ev-banner--success" role="status"><Icon name="check-circle" /><div><p className="ev-banner__title">{msg.text}</p></div></div>
        : <ErrorBanner message={msg.text} />)}

      <button type="submit" disabled={saving} className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${saving ? ' is-loading' : ''}`}>
        {saving ? t('artistas.panel.saving') : t('artistas.panel.save')}
      </button>
    </form>
  )
}

function GalleryTab({ artistId, gallery, setGallery, token }: {
  artistId: string; gallery: GalleryItem[]; setGallery: (g: GalleryItem[]) => void; token: string
}) {
  const { t, c } = useCopy()
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setUploadErr('')
    try {
      const url = await uploadArtistImage(file, 'galeria', token)
      const { data } = await supabaseBrowser.from('artist_gallery').insert({ artist_id: artistId, image_url: url }).select('id, image_url').single()
      if (data) setGallery([data, ...gallery])
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : c('art.panel.uploadFail'))
    } finally { setUploading(false) }
  }

  async function handleDelete(id: string) {
    await supabaseBrowser.from('artist_gallery').delete().eq('id', id)
    setGallery(gallery.filter(g => g.id !== id))
  }

  return (
    <div className="ev-stack ev-stack--lg">
      <label className={`ev-dropzone${uploadErr ? ' ev-dropzone--error' : ''}`}>
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} aria-describedby="gal-fmt" />
        <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="upload" size="lg" /></span>
        <span className="ev-dropzone__title">{uploading ? t('pago.uploading') : t('artistas.panel.uploadPhoto')}</span>
        <span className="ev-dropzone__formats" id="gal-fmt">{c('art.panel.imageFormats')}</span>
      </label>

      {uploadErr && <ErrorBanner message={uploadErr} />}

      {gallery.length === 0 ? (
        <div className="ev-empty">
          <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="image" size="lg" /></span>
          <p className="ev-empty__text">{t('artistas.panel.galleryEmpty')}</p>
        </div>
      ) : (
        <ul className="ev-gallery-grid" role="list">
          {gallery.map((item, i) => (
            <li key={item.id} className="ev-gallery-item">
              <img src={item.image_url} alt="" loading="lazy" />
              <button
                type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => handleDelete(item.id)}
                aria-label={c('art.panel.removeAria', { name: `${t('artistas.panel.photo')} ${gallery.length - i}` })}
              >
                <Icon name="trash" />{t('artistas.panel.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const STATUS_CHIP: Record<ArtistEvent['status'], { cls: string; icon: IconName; key: 'art.panel.statusPending' | 'art.panel.statusApproved' | 'art.panel.statusRejected' }> = {
  pendiente: { cls: 'review', icon: 'hourglass', key: 'art.panel.statusPending' },
  aprobado: { cls: 'confirmed', icon: 'check-circle', key: 'art.panel.statusApproved' },
  rechazado: { cls: 'rejected', icon: 'x-circle', key: 'art.panel.statusRejected' },
}

function EventsTab({ token, events, setEvents }: {
  events: ArtistEvent[]; setEvents: (e: ArtistEvent[]) => void; token: string
}) {
  const { t, c, dateLocale } = useCopy()
  const empty = {
    nombre: '', fecha: '', venue: '', direccion: '', descripcion: '', imagen_url: '',
    lat: '', lng: '', precio: '', max_entradas: '', link_externo: '',
  }
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadErr, setUploadErr] = useState('')

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setUploadErr('')
    try {
      const url = await uploadArtistImage(file, 'evento', token)
      setForm(f => ({ ...f, imagen_url: url }))
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : c('art.panel.uploadFail'))
    } finally { setUploading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await fetch('/api/eventos/artistas/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: form.nombre, fecha: form.fecha, venue: form.venue, direccion: form.direccion || null,
          descripcion: form.descripcion || null, imagen_url: form.imagen_url || null,
          lat: form.lat ? parseFloat(form.lat) : null, lng: form.lng ? parseFloat(form.lng) : null,
          precio: form.precio ? parseFloat(form.precio) : null,
          max_entradas: form.max_entradas ? parseInt(form.max_entradas) : null,
          link_externo: form.link_externo || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || c('art.panel.createFail'))
      setEvents([...events, data.event].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      setForm(empty); setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : c('art.panel.unexpected'))
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await supabaseBrowser.from('artist_events').delete().eq('id', id)
    setEvents(events.filter(ev => ev.id !== id))
  }

  const setF = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="ev-stack ev-stack--lg">
      <div className="ev-cluster" style={{ justifyContent: 'space-between' }}>
        <h2 className="ev-display ev-display--sm">{c('art.panel.myEvents')}</h2>
        {!showForm && (
          <button type="button" className="ev-btn ev-btn--primary ev-btn--sm" onClick={() => setShowForm(true)}>
            <Icon name="plus" />{t('artistas.panel.newEvent')}
          </button>
        )}
      </div>

      {events.length === 0 && !showForm && (
        <div className="ev-empty">
          <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="calendar" size="lg" /></span>
          <p className="ev-empty__text">{t('artistas.panel.eventsEmpty')}</p>
        </div>
      )}

      {events.length > 0 && (
        <>
          <ul className="ev-admin-grid" role="list">
            {events.map(ev => {
              const st = STATUS_CHIP[ev.status]
              const fecha = new Date(ev.fecha)
              return (
                <li key={ev.id} className="ev-admin-card">
                  <div className="ev-admin-card__head">
                    <div className="ev-admin-card__thumb">
                      {ev.imagen_url
                        ? <img src={ev.imagen_url} alt="" />
                        : <div className="ev-poster-fallback" aria-hidden="true"><span className="ev-poster-fallback__name">{ev.nombre}</span></div>}
                    </div>
                    <div className="ev-stack ev-stack--sm" style={{ flex: 1, minWidth: 0 }}>
                      <span className={`ev-chip ev-chip--${st.cls}`} style={{ alignSelf: 'start' }}><Icon name={st.icon} />{c(st.key)}</span>
                      <h3 className="ev-title ev-title--sm">{ev.nombre}</h3>
                      <p className="ev-subtle">
                        {fecha.toLocaleDateString(dateLocale, { timeZone: EVENT_TZ, weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{ev.venue}
                        {ev.precio != null && <>{' · '}{formatMoneyFull(ev.precio)}</>}
                      </p>
                    </div>
                    <button
                      type="button" className="ev-btn ev-btn--ghost ev-btn--sm" onClick={() => handleDelete(ev.id)}
                      aria-label={c('art.panel.removeAria', { name: ev.nombre })}
                    >
                      <Icon name="trash" />{t('artistas.panel.delete')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="ev-subtle">{c('art.panel.eventsHint')}</p>
        </>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="ev-admin-card ev-admin-form ev-stack ev-stack--lg" aria-busy={saving}>
          <h3 className="ev-title ev-title--sm">{t('artistas.panel.newEvent')}</h3>

          <fieldset className="ev-fieldset">
            <legend className="ev-field__label" style={{ marginBottom: 'var(--ev-space-2)' }}>{t('artistas.panel.eventImage')}</legend>
            <label className="ev-img-pick">
              <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} aria-label={t('artistas.panel.eventImage')} />
              {form.imagen_url ? (
                <img src={form.imagen_url} alt="" />
              ) : (
                <span className="ev-img-pick__empty">
                  <span>
                    <span className="ev-dropzone__title" style={{ display: 'block' }}>
                      {uploading ? t('pago.uploading') : c('art.panel.pickImage')}
                    </span>
                    <span className="ev-dropzone__formats">{c('art.panel.imageFormats')}</span>
                  </span>
                  <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="image" size="lg" /></span>
                </span>
              )}
            </label>
            {uploadErr && <div style={{ marginTop: 'var(--ev-space-3)' }}><ErrorBanner message={uploadErr} /></div>}
          </fieldset>

          <div className="ev-form-grid ev-form-grid--2">
            <Field id="ne-n" className="ev-span-2" label={t('artistas.panel.eventName')} required value={form.nombre} onChange={setF('nombre')} />
            <AreaField id="ne-d" className="ev-span-2" label={t('artistas.panel.eventDescription')} rows={3} value={form.descripcion} onChange={setF('descripcion')} />
            <Field id="ne-f" label={t('artistas.panel.eventDate')} icon="calendar" type="datetime-local" required value={form.fecha} onChange={setF('fecha')} />
            <Field id="ne-v" label={t('artistas.panel.eventVenue')} icon="map-pin" required value={form.venue} onChange={setF('venue')} />
            <Field id="ne-a" className="ev-span-2" label={t('artistas.panel.eventAddress')} value={form.direccion} onChange={setF('direccion')} />
            <Field id="ne-la" label={t('artistas.panel.eventLat')} type="number" step="any" inputMode="decimal" placeholder="13.6929" value={form.lat} onChange={setF('lat')} />
            <Field id="ne-lo" label={t('artistas.panel.eventLng')} type="number" step="any" inputMode="decimal" placeholder="-89.2182" value={form.lng} onChange={setF('lng')} />
            <Field id="ne-p" label={t('artistas.panel.eventPrice')} type="number" step="0.01" min="0" inputMode="decimal" placeholder="10.00" value={form.precio} onChange={setF('precio')} />
            <Field id="ne-m" label={t('artistas.panel.eventMaxTickets')} type="number" min="1" inputMode="numeric" value={form.max_entradas} onChange={setF('max_entradas')} />
            <Field id="ne-l" className="ev-span-2" label={t('artistas.panel.eventLink')} icon="globe" type="url" value={form.link_externo} onChange={setF('link_externo')} />
          </div>

          <div className="ev-banner ev-banner--info">
            <Icon name="info" />
            <div><p className="ev-banner__text">{t('artistas.panel.eventPendingNote')}</p></div>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="ev-cluster">
            <button type="button" className="ev-btn ev-btn--ghost" onClick={() => { setShowForm(false); setForm(empty); setError(''); setUploadErr('') }}>
              {t('artistas.panel.cancel')}
            </button>
            <button type="submit" disabled={saving} className={`ev-btn ev-btn--primary${saving ? ' is-loading' : ''}`}>
              {saving ? t('artistas.panel.saving') : t('artistas.panel.eventCreate')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
