'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { artists } from '@/app/data/artists'

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

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/eventos/mi-cuenta/login'); return }
      setUserId(data.session.user.id)
    })
  }, [router])

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

  const PROGRESS = ['w-1/3', 'w-2/3', 'w-full'][step - 1]

  return (
    <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full bg-[#F472B6] transition-all duration-300 ${PROGRESS}`} />
          </div>
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mt-2">{t('onboarding.step', { n: step })}</p>
        </div>

        {step === 1 && (
          <div className="text-center space-y-5 py-6">
            <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">Sivar Events</p>
            <h1 className="text-white text-2xl font-bold">{t('onboarding.welcomeTitle')}</h1>
            <p className="text-white/50 text-sm leading-relaxed">{t('onboarding.welcomeBody')}</p>
            <button onClick={() => setStep(2)}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {t('onboarding.start')}
            </button>
            <button onClick={finish} className="w-full text-white/30 hover:text-white/60 text-xs text-center transition py-1">
              {t('onboarding.skip')}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-white text-xl font-bold">{t('onboarding.genresTitle')}</h1>
              <p className="text-white/40 text-sm mt-1">{t('onboarding.genresBody')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRE_KEYS.map(key => (
                <button key={key} onClick={() => toggleGenre(key)}
                  className={`text-sm font-semibold px-4 py-2 rounded-full border transition ${
                    genres.includes(key)
                      ? 'border-[#F472B6] bg-[#F472B6]/15 text-[#F472B6]'
                      : 'border-white/10 text-white/50 hover:text-white hover:border-white/25'
                  }`}>
                  {t(key)}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(3)}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {t('onboarding.continue')}
            </button>
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-white/30 hover:text-white/60 text-xs transition">{t('onboarding.back')}</button>
              <button onClick={finish} className="text-white/30 hover:text-white/60 text-xs transition">{t('onboarding.skip')}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-white text-xl font-bold">{t('onboarding.artistsTitle')}</h1>
              <p className="text-white/40 text-sm mt-1">{t('onboarding.artistsBody')}</p>
            </div>
            <div className="space-y-3">
              {artists.map(artist => {
                const isFollowed = followed.includes(artist.slug)
                return (
                  <div key={artist.slug} className="flex items-center gap-3 bg-white/4 border border-white/10 rounded-2xl p-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-none bg-white/5">
                      <Image src={artist.menuImage} alt={artist.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{artist.name}</p>
                      <p className="text-white/35 text-[10px] uppercase tracking-wider truncate">{artist.genre}</p>
                    </div>
                    <button onClick={() => toggleArtist(artist.slug)}
                      className={`flex-none text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition ${
                        isFollowed ? 'bg-white/10 text-white/60' : 'bg-[#F472B6] text-white hover:bg-[#ec4899]'
                      }`}>
                      {isFollowed ? t('onboarding.following') : t('onboarding.follow')}
                    </button>
                  </div>
                )
              })}
            </div>
            <button onClick={finish} disabled={saving}
              className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
              {saving ? t('onboarding.saving') : t('onboarding.finish')}
            </button>
            <button onClick={() => setStep(2)} className="w-full text-white/30 hover:text-white/60 text-xs text-center transition py-1">
              {t('onboarding.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
