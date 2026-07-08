'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'

interface Profile {
  slug: string; nombre_artistico: string; genero: string | null; bio: string | null
  foto_url: string | null; instagram: string | null; spotify: string | null
  tiktok: string | null; youtube: string | null; apple_music: string | null; otro_link: string | null
}
interface GalleryItem { id: string; image_url: string }
interface ArtistEvent { id: string; nombre: string; fecha: string; venue: string; descripcion: string | null; imagen_url: string | null; link_externo: string | null }

const SOCIAL_ICONS: { key: keyof Profile; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'apple_music', label: 'Apple Music' },
  { key: 'otro_link', label: 'Link' },
]

export default function ArtistaPublicProfilePage() {
  const { t, dateLocale } = useLanguage()
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [events, setEvents] = useState<ArtistEvent[]>([])

  useEffect(() => {
    supabaseBrowser.from('artist_profiles').select('*').eq('slug', slug).maybeSingle().then(async ({ data }) => {
      if (!data) { setProfile(null); return }
      setProfile(data)
      const [{ data: g }, { data: e }] = await Promise.all([
        supabaseBrowser.from('artist_gallery').select('id, image_url').eq('artist_id', data.id).order('created_at', { ascending: false }),
        supabaseBrowser.from('artist_events').select('*').eq('artist_id', data.id).gte('fecha', new Date().toISOString()).order('fecha', { ascending: true }),
      ])
      setGallery(g ?? [])
      setEvents(e ?? [])
    })
  }, [slug])

  if (profile === undefined) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">{t('detail.loading')}</p></div>
  if (profile === null) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/50 text-sm">{t('artistas.profile.notFound')}</p></div>

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <div className="px-5 pt-10 pb-6 max-w-lg mx-auto text-center space-y-4">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-white/8 mx-auto">
          {profile.foto_url && <img src={profile.foto_url} alt={profile.nombre_artistico} className="w-full h-full object-cover" />}
        </div>
        <div>
          <h1 className="text-white text-2xl font-bold">{profile.nombre_artistico}</h1>
          {profile.genero && <p className="text-[#F472B6] text-[10px] font-bold uppercase tracking-wider mt-1">{profile.genero}</p>}
        </div>
        {profile.bio && <p className="text-white/55 text-sm leading-relaxed">{profile.bio}</p>}

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {SOCIAL_ICONS.filter(s => profile[s.key]).map(s => (
            <a key={s.key} href={profile[s.key] as string} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-white/60 hover:text-[#F472B6] bg-white/6 hover:bg-white/10 px-3 py-1.5 rounded-full transition">
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="px-5 pb-16 max-w-lg mx-auto space-y-8">
        <div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">{t('artistas.profile.upcomingEvents')}</p>
          {events.length === 0 ? (
            <p className="text-white/30 text-sm">{t('artistas.profile.noEvents')}</p>
          ) : (
            <div className="space-y-3">
              {events.map(ev => {
                const fecha = new Date(ev.fecha)
                return (
                  <div key={ev.id} className="bg-white/4 border border-white/10 rounded-2xl overflow-hidden">
                    {ev.imagen_url && <img src={ev.imagen_url} alt={ev.nombre} className="w-full h-40 object-cover" />}
                    <div className="p-4">
                      <p className="text-white font-bold text-sm">{ev.nombre}</p>
                      <p className="text-white/50 text-xs mt-1">
                        {fecha.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{ev.venue}
                      </p>
                      {ev.descripcion && <p className="text-white/40 text-sm mt-2 leading-relaxed">{ev.descripcion}</p>}
                      {ev.link_externo && (
                        <a href={ev.link_externo} target="_blank" rel="noopener noreferrer"
                          className="inline-block mt-3 text-[#F472B6] text-xs font-bold uppercase tracking-wider hover:text-white transition">
                          {t('artistas.profile.info')} →
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {gallery.length > 0 && (
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">{t('artistas.profile.gallery')}</p>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map(item => (
                <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-white/5">
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
