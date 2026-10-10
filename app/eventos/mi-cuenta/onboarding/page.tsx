'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'

type OnboardingArtist = { slug: string; name: string; genre: string; menuImage: string }

const GENRE_KEYS = [
  'onboarding.genre.pop', 'onboarding.genre.reggaeton', 'onboarding.genre.rock',
  'onboarding.genre.electronica', 'onboarding.genre.indie', 'onboarding.genre.trap',
  'onboarding.genre.salsa', 'onboarding.genre.bachata', 'onboarding.genre.jazz',
  'onboarding.genre.cumbia', 'onboarding.genre.otro',
] as const

export default function OnboardingPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [genres, setGenres] = useState<string[]>([])
  const [followed, setFollowed] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [artists, setArtists] = useState<OnboardingArtist[]>([])

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/eventos/mi-cuenta/login'); return }
      setUserId(data.session.user.id)
    })
  }, [router])

  useEffect(() => {
    fetch('/api/artists/public')
      .then(res => res.json())
      .then(data => setArtists(data.artists ?? []))
      .catch(() => setArtists([]))
  }, [])

  function toggleGenre(key: string) {
    setGenres(g => g.includes(key) ? g.filter(x => x !== key) : [...g, key])
  }

  function toggleArtist(slug: string) {
    setFollowed(f => f.includes(slug) ? f.filter(x => x !== slug) : [...f, slug])
  }

  async function finish() {
    if (!userId) return
    setSaving(true)
    await supabaseBrowser.from('attendee_profiles').upsert({
      id: userId,
      generos_favoritos: genres,
      onboarding_completed_at: new Date().toISOString(),
    })
    if (followed.length > 0) {
      await supabaseBrowser.from('artist_follows').upsert(
        followed.map(artist_slug => ({ user_id: userId, artist_slug }))
      )
    }
    router.push('/eventos/mi-cuenta')
  }

  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main" className="ev-container ev-container--narrow ev-page">
        <div className="ev-stack ev-stack--lg" style={{ paddingBlock: 'var(--ev-space-6)' }}>
          <div className="ev-stack ev-stack--sm">
            <ol className="ev-steps" aria-hidden="true" style={{ maxWidth: 560 }}>
              {[1, 2, 3].map(n => (
                <li key={n} className={`ev-steps__item${n < step ? ' is-done' : ''}`} aria-current={n === step ? 'step' : undefined} />
              ))}
            </ol>
            <p className="ev-eyebrow">{t('onboarding.step', { n: step })}</p>
          </div>

          {step === 1 && (
            <div className="ev-stack ev-stack--lg">
              <div className="ev-stack ev-stack--sm">
                <p className="ev-eyebrow ev-eyebrow--accent">Sivar Eventos</p>
                <h1 className="ev-display ev-display--md">{t('onboarding.welcomeTitle')}</h1>
                <p className="ev-lead">{t('onboarding.welcomeBody')}</p>
              </div>
              <div className="ev-stack ev-stack--sm">
                <button type="button" onClick={() => setStep(2)} className="ev-btn ev-btn--primary ev-btn--lg ev-btn--block">
                  {t('onboarding.start')} <Icon name="arrow-right" size="lg" />
                </button>
                <button type="button" onClick={finish} className="ev-btn ev-btn--ghost ev-btn--block">{t('onboarding.skip')}</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="ev-stack ev-stack--lg">
              <div className="ev-stack ev-stack--sm">
                <h1 className="ev-display ev-display--md">{t('onboarding.genresTitle')}</h1>
                <p className="ev-lead">{t('onboarding.genresBody')}</p>
              </div>
              <div className="ev-cluster" role="group" aria-label={t('onboarding.genresTitle')}>
                {GENRE_KEYS.map(key => (
                  <button key={key} type="button" onClick={() => toggleGenre(key)} aria-pressed={genres.includes(key)} className="ev-filter-chip">
                    {t(key)}
                  </button>
                ))}
              </div>
              <div className="ev-stack ev-stack--sm">
                <button type="button" onClick={() => setStep(3)} className="ev-btn ev-btn--primary ev-btn--lg ev-btn--block">
                  {t('onboarding.continue')} <Icon name="arrow-right" size="lg" />
                </button>
                <div className="ev-cluster" style={{ justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => setStep(1)} className="ev-back-link" style={{ background: 'transparent', border: 0 }}>{t('onboarding.back')}</button>
                  <button type="button" onClick={finish} className="ev-back-link" style={{ background: 'transparent', border: 0 }}>{t('onboarding.skip')}</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="ev-stack ev-stack--lg">
              <div className="ev-stack ev-stack--sm">
                <h1 className="ev-display ev-display--md">{t('onboarding.artistsTitle')}</h1>
                <p className="ev-lead">{t('onboarding.artistsBody')}</p>
              </div>
              <ul className="ev-stack" role="list" style={{ padding: 0, listStyle: 'none' }}>
                {artists.map(artist => {
                  const isFollowed = followed.includes(artist.slug)
                  return (
                    <li key={artist.slug} className="ev-admin-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ev-space-3)', padding: 'var(--ev-space-3)' }}>
                      <div style={{ position: 'relative', width: 52, height: 52, flex: 'none', borderRadius: 'var(--ev-radius-xs)', overflow: 'hidden', background: 'var(--ev-color-surface-2)' }}>
                        <Image src={artist.menuImage} alt={artist.name} fill className="object-cover" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 'var(--ev-weight-semi)', overflowWrap: 'anywhere' }}>{artist.name}</p>
                        <p className="ev-subtle">{artist.genre}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleArtist(artist.slug)}
                        aria-pressed={isFollowed}
                        className={`ev-btn ev-btn--sm ${isFollowed ? 'ev-btn--secondary' : 'ev-btn--primary'}`}
                      >
                        {isFollowed ? t('onboarding.following') : t('onboarding.follow')}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="ev-stack ev-stack--sm">
                <button type="button" onClick={finish} disabled={saving} className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${saving ? ' is-loading' : ''}`}>
                  {saving ? t('onboarding.saving') : t('onboarding.finish')}
                </button>
                <button type="button" onClick={() => setStep(2)} className="ev-btn ev-btn--ghost ev-btn--block">{t('onboarding.back')}</button>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
