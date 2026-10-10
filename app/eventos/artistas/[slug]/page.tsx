'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { EVENT_TZ } from '@/lib/eventDate'
import { copyFor, type CopyKey } from '../../copy'
import { Icon, type IconName } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'
import { ARTIST_ART } from '../components/artistArt'
import { formatMoneyFull } from '@/lib/format'

interface Profile {
  slug: string; nombre_artistico: string; genero: string | null; bio: string | null
  foto_url: string | null; instagram: string | null; spotify: string | null
  tiktok: string | null; youtube: string | null; apple_music: string | null; otro_link: string | null
}
interface GalleryItem { id: string; image_url: string }
interface ArtistEvent {
  id: string; nombre: string; fecha: string; venue: string; descripcion: string | null
  imagen_url: string | null; link_externo: string | null; precio?: number | null
}

type SocialKey = 'instagram' | 'spotify' | 'tiktok' | 'youtube' | 'apple_music' | 'otro_link'
const SOCIALS: { key: SocialKey; label: string; icon: IconName | null }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram' },
  { key: 'spotify', label: 'Spotify', icon: 'spotify' },
  { key: 'youtube', label: 'YouTube', icon: 'youtube' },
  { key: 'tiktok', label: 'TikTok', icon: null },
  { key: 'apple_music', label: 'Apple Music', icon: null },
  { key: 'otro_link', label: '', icon: null },
]

export default function ArtistaPublicProfilePage() {
  const { lang, t, dateLocale } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
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

  if (profile === undefined) {
    return (
      <div className="ev-surface">
        <SiteHeader />
        <main id="main"><div className="ev-state-screen"><p className="ev-muted" role="status">{t('detail.loading')}</p></div></main>
        <SiteFooter />
      </div>
    )
  }
  if (profile === null) {
    return (
      <div className="ev-surface">
        <SiteHeader />
        <main id="main">
          <div className="ev-state-screen">
            <div className="ev-stack ev-stack--sm">
              <h1 className="ev-display ev-display--md">{t('artistas.profile.notFound')}</h1>
              <a className="ev-link-arrow" href="/eventos" style={{ justifySelf: 'center' }}>{c('eva.seeLineup')} <Icon name="arrow-right" /></a>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const name = profile.nombre_artistico
  const links = SOCIALS.filter(s => profile[s.key])
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(dateLocale, { timeZone: EVENT_TZ, ...o })

  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main">
        <section className="ev-artist-hero">
          <img className="ev-artist-hero__img" src={profile.foto_url || ARTIST_ART} alt="" />
          <div className="ev-container ev-artist-hero__inner">
            <p className="ev-eyebrow">{c('art.profile.eyebrow')}</p>
            <h1 className="ev-artist-hero__name" style={{ marginTop: 'var(--ev-space-3)' }}>{name}</h1>
            {profile.genero && <p className="ev-eyebrow ev-eyebrow--accent" style={{ marginTop: 'var(--ev-space-3)' }}>{profile.genero}</p>}
            {links.length > 0 && (
              <div className="ev-cluster" style={{ marginTop: 'var(--ev-space-5)' }}>
                {links.map(s => {
                  const href = profile[s.key] as string
                  const label = s.label || c('art.profile.otherLink')
                  if (s.icon) {
                    return (
                      <a key={s.key} className="ev-icon-btn ev-icon-btn--boxed" href={href} target="_blank" rel="noopener noreferrer"
                        aria-label={c('art.profile.socialAria', { network: label, name })}>
                        <Icon name={s.icon} />
                      </a>
                    )
                  }
                  return (
                    <a key={s.key} className="ev-btn ev-btn--secondary ev-btn--sm" href={href} target="_blank" rel="noopener noreferrer"
                      aria-label={c('art.profile.socialAria', { network: label, name })}>
                      <Icon name="external" />{label}
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <div className="ev-container ev-page ev-split-2">
          <section className="ev-split-2__main ev-stack" aria-labelledby="h-bio">
            {profile.bio && (
              <>
                <h2 className="ev-display ev-display--sm" id="h-bio">{c('art.profile.bio')}</h2>
                <div className="ev-prose"><p>{profile.bio}</p></div>
              </>
            )}
            {gallery.length > 0 && (
              <section className="ev-stack" aria-labelledby="h-gal">
                <h2 className="ev-display ev-display--sm" id="h-gal">{t('artistas.profile.gallery')}</h2>
                <ul className="ev-gallery-grid" role="list">
                  {gallery.map(item => (
                    <li key={item.id} className="ev-gallery-item"><img src={item.image_url} alt="" loading="lazy" /></li>
                  ))}
                </ul>
              </section>
            )}
          </section>

          <section className="ev-split-2__aside ev-stack" aria-labelledby="h-fechas">
            <h2 className="ev-display ev-display--sm" id="h-fechas">{t('artistas.profile.upcomingEvents')}</h2>
            {events.length === 0 ? (
              <div className="ev-empty" style={{ padding: 'var(--ev-space-6)' }}>
                <p className="ev-empty__text">
                  {t('artistas.profile.noEvents')}{profile.instagram ? ` ${c('art.profile.followHint')}` : ''}
                </p>
              </div>
            ) : (
              <ul className="ev-stack" role="list" style={{ listStyle: 'none', padding: 0 }}>
                {events.map(ev => {
                  const fecha = new Date(ev.fecha)
                  const inner = (
                    <>
                      <div className="ev-event-card__media">
                        {ev.imagen_url
                          ? <img src={ev.imagen_url} alt="" />
                          : (
                            <div className="ev-poster-fallback" role="img" aria-label={c('ev.posterNone', { name: ev.nombre })}>
                              <span className="ev-poster-fallback__name">{ev.nombre}</span>
                              <span className="ev-poster-fallback__tag">{c('ev.posterTag')}</span>
                            </div>
                          )}
                        <p className="ev-event-card__date">
                          <span>{fmt(fecha, { weekday: 'short' })}</span>
                          <b>{fmt(fecha, { day: 'numeric' })}</b>
                          <span>{fmt(fecha, { month: 'short' })}</span>
                        </p>
                      </div>
                      <div className="ev-event-card__body">
                        <h3 className="ev-event-card__title">{ev.nombre}</h3>
                        <p className="ev-event-card__meta"><span><Icon name="map-pin" />{ev.venue}</span></p>
                        {ev.descripcion && <p className="ev-subtle">{ev.descripcion}</p>}
                        {(ev.precio != null || ev.link_externo) && (
                          <div className="ev-event-card__foot">
                            {ev.precio != null && <p className="ev-event-card__price">{formatMoneyFull(ev.precio)}</p>}
                            {ev.link_externo && <span className="ev-link-arrow">{t('artistas.profile.info')} <Icon name="external" size="sm" /></span>}
                          </div>
                        )}
                      </div>
                    </>
                  )
                  return (
                    <li key={ev.id}>
                      {ev.link_externo
                        ? <a className="ev-event-card ev-event-card--row" href={ev.link_externo} target="_blank" rel="noopener noreferrer">{inner}</a>
                        : <article className="ev-event-card ev-event-card--row">{inner}</article>}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
