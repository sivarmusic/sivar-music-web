'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'

interface Profile {
  id: string; slug: string; nombre_artistico: string; genero: string | null; bio: string | null
  foto_url: string | null; instagram: string | null; spotify: string | null
  tiktok: string | null; youtube: string | null; apple_music: string | null; otro_link: string | null
}
interface GalleryItem { id: string; image_url: string }
interface ArtistEvent {
  id: string; nombre: string; fecha: string; venue: string; direccion: string | null
  descripcion: string | null; imagen_url: string | null; link_externo: string | null
}

type Tab = 'perfil' | 'galeria' | 'eventos'

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'
const LABEL = 'block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5'

async function uploadArtistImage(file: File, type: 'perfil' | 'galeria' | 'evento', token: string) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('type', type)
  const res = await fetch('/api/eventos/artistas/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al subir')
  return data.url as string
}

export default function ArtistaPanelPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [events, setEvents] = useState<ArtistEvent[]>([])
  const [tab, setTab] = useState<Tab>('perfil')
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
    return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">{t('account.loading')}</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <div className="border-b border-white/8 px-5 py-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Sivar Events for Artists</p>
          <h1 className="text-white text-lg font-bold">{profile.nombre_artistico}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/eventos/artistas/${profile.slug}`} target="_blank" className="text-white/40 hover:text-white text-xs transition">
            {t('artistas.panel.viewProfile')}
          </Link>
          <button onClick={handleLogout} className="text-white/30 hover:text-white text-xs uppercase tracking-wider transition">
            {t('artistas.panel.logout')}
          </button>
        </div>
      </div>

      <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
          {(['perfil', 'galeria', 'eventos'] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${tab === tb ? 'bg-[#F472B6] text-white' : 'text-white/40 hover:text-white'}`}>
              {t(`artistas.panel.tab${tb === 'perfil' ? 'Profile' : tb === 'galeria' ? 'Gallery' : 'Events'}`)}
            </button>
          ))}
        </div>

        {tab === 'perfil' && <ProfileTab profile={profile} setProfile={setProfile} token={token} t={t} />}
        {tab === 'galeria' && <GalleryTab artistId={profile.id} gallery={gallery} setGallery={setGallery} token={token} t={t} />}
        {tab === 'eventos' && <EventsTab artistId={profile.id} events={events} setEvents={setEvents} token={token} t={t} />}
      </div>
    </div>
  )
}

function ProfileTab({ profile, setProfile, token, t }: {
  profile: Profile; setProfile: (p: Profile) => void; token: string; t: (k: any, v?: any) => string
}) {
  const [form, setForm] = useState(profile)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function set<K extends keyof Profile>(key: K, value: Profile[K]) { setForm(f => ({ ...f, [key]: value })) }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadArtistImage(file, 'perfil', token)
      set('foto_url', url)
      await supabaseBrowser.from('artist_profiles').update({ foto_url: url }).eq('id', profile.id)
      setProfile({ ...form, foto_url: url })
    } catch { /* noop */ } finally { setUploading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg('')
    const { error } = await supabaseBrowser.from('artist_profiles').update({
      bio: form.bio, genero: form.genero, instagram: form.instagram, spotify: form.spotify,
      tiktok: form.tiktok, youtube: form.youtube, apple_music: form.apple_music, otro_link: form.otro_link,
    }).eq('id', profile.id)
    setMsg(error ? error.message : t('artistas.panel.saved'))
    setProfile(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-white/8 flex-none">
          {form.foto_url && <img src={form.foto_url} alt={form.nombre_artistico} className="w-full h-full object-cover" />}
        </div>
        <label className="text-[#F472B6] text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition">
          {uploading ? t('pago.uploading') : t('artistas.panel.changePhoto')}
          <input type="file" accept="image/*" onChange={handlePhoto} disabled={uploading} className="hidden" />
        </label>
      </div>

      <div>
        <label className={LABEL}>{t('artistas.apply.genre')}</label>
        <input type="text" value={form.genero ?? ''} onChange={e => set('genero', e.target.value)} className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Bio</label>
        <textarea value={form.bio ?? ''} onChange={e => set('bio', e.target.value)} rows={3} className={INPUT + ' resize-none'} />
      </div>

      <div className="border-t border-white/8 pt-4 space-y-2">
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">{t('artistas.panel.socialsTitle')}</p>
        <input type="url" value={form.instagram ?? ''} onChange={e => set('instagram', e.target.value)} placeholder={t('artistas.panel.instagram')} className={INPUT} />
        <input type="url" value={form.spotify ?? ''} onChange={e => set('spotify', e.target.value)} placeholder={t('artistas.panel.spotify')} className={INPUT} />
        <input type="url" value={form.tiktok ?? ''} onChange={e => set('tiktok', e.target.value)} placeholder={t('artistas.panel.tiktok')} className={INPUT} />
        <input type="url" value={form.youtube ?? ''} onChange={e => set('youtube', e.target.value)} placeholder={t('artistas.panel.youtube')} className={INPUT} />
        <input type="url" value={form.apple_music ?? ''} onChange={e => set('apple_music', e.target.value)} placeholder={t('artistas.panel.appleMusic')} className={INPUT} />
        <input type="url" value={form.otro_link ?? ''} onChange={e => set('otro_link', e.target.value)} placeholder={t('artistas.panel.otherLink')} className={INPUT} />
      </div>

      {msg && <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-2xl px-4 py-3 text-center">{msg}</p>}

      <button type="submit" disabled={saving}
        className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
        {saving ? t('artistas.panel.saving') : t('artistas.panel.save')}
      </button>
    </form>
  )
}

function GalleryTab({ artistId, gallery, setGallery, token, t }: {
  artistId: string; gallery: GalleryItem[]; setGallery: (g: GalleryItem[]) => void; token: string; t: (k: any) => string
}) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadArtistImage(file, 'galeria', token)
      const { data } = await supabaseBrowser.from('artist_gallery').insert({ artist_id: artistId, image_url: url }).select('id, image_url').single()
      if (data) setGallery([data, ...gallery])
    } catch { /* noop */ } finally { setUploading(false) }
  }

  async function handleDelete(id: string) {
    await supabaseBrowser.from('artist_gallery').delete().eq('id', id)
    setGallery(gallery.filter(g => g.id !== id))
  }

  return (
    <div className="space-y-4">
      <label className="block w-full text-center bg-white/6 hover:bg-white/10 border border-dashed border-white/15 rounded-2xl py-4 text-white/60 text-sm font-semibold cursor-pointer transition">
        {uploading ? t('pago.uploading') : t('artistas.panel.uploadPhoto')}
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>

      {gallery.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-8">{t('artistas.panel.galleryEmpty')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {gallery.map(item => (
            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 group">
              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => handleDelete(item.id)}
                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-500/80 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition">
                {t('artistas.panel.delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EventsTab({ artistId, events, setEvents, token, t }: {
  artistId: string; events: ArtistEvent[]; setEvents: (e: ArtistEvent[]) => void; token: string; t: (k: any) => string
}) {
  const empty = { nombre: '', fecha: '', venue: '', direccion: '', descripcion: '', imagen_url: '', link_externo: '' }
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadArtistImage(file, 'evento', token)
      setForm(f => ({ ...f, imagen_url: url }))
    } catch { /* noop */ } finally { setUploading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const { data } = await supabaseBrowser.from('artist_events').insert({
      artist_id: artistId,
      nombre: form.nombre, fecha: form.fecha, venue: form.venue, direccion: form.direccion || null,
      descripcion: form.descripcion || null, imagen_url: form.imagen_url || null, link_externo: form.link_externo || null,
    }).select('*').single()
    if (data) setEvents([...events, data].sort((a, b) => a.fecha.localeCompare(b.fecha)))
    setForm(empty); setShowForm(false); setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabaseBrowser.from('artist_events').delete().eq('id', id)
    setEvents(events.filter(ev => ev.id !== id))
  }

  return (
    <div className="space-y-4">
      {events.length === 0 && !showForm && <p className="text-white/30 text-sm text-center py-4">{t('artistas.panel.eventsEmpty')}</p>}

      <div className="space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="bg-white/4 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{ev.nombre}</p>
              <p className="text-white/40 text-xs mt-0.5">{new Date(ev.fecha).toLocaleDateString()} · {ev.venue}</p>
            </div>
            <button onClick={() => handleDelete(ev.id)} className="flex-none text-red-400/70 hover:text-red-400 text-xs font-bold uppercase transition">
              {t('artistas.panel.delete')}
            </button>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          className="w-full bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
          {t('artistas.panel.newEvent')}
        </button>
      ) : (
        <form onSubmit={handleCreate} className="space-y-3 border-t border-white/8 pt-4">
          <div>
            <label className={LABEL}>{t('artistas.panel.eventName')}</label>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.panel.eventDate')}</label>
            <input type="datetime-local" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.panel.eventVenue')}</label>
            <input type="text" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.panel.eventAddress')}</label>
            <input type="text" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.panel.eventDescription')}</label>
            <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={INPUT + ' resize-none'} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.panel.eventImage')}</label>
            {form.imagen_url && <img src={form.imagen_url} alt="" className="w-full h-32 object-cover rounded-xl mb-2" />}
            <label className="block w-full text-center bg-white/6 hover:bg-white/10 border border-dashed border-white/15 rounded-2xl py-3 text-white/60 text-sm font-semibold cursor-pointer transition">
              {uploading ? t('pago.uploading') : t('artistas.panel.eventImage')}
              <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} className="hidden" />
            </label>
          </div>
          <div>
            <label className={LABEL}>{t('artistas.panel.eventLink')}</label>
            <input type="url" value={form.link_externo} onChange={e => setForm(f => ({ ...f, link_externo: e.target.value }))} className={INPUT} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setForm(empty) }}
              className="flex-1 bg-white/8 hover:bg-white/15 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {t('artistas.panel.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {saving ? t('artistas.panel.saving') : t('artistas.panel.eventCreate')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
