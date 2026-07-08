'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function ArtistasLandingPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <div className="px-5 py-5 flex items-center justify-between max-w-2xl mx-auto">
        <Link href="/eventos" className="text-white/40 hover:text-white text-xs transition">← Sivar Events</Link>
        <LanguageSwitcher />
      </div>

      <div className="px-5 py-10 max-w-2xl mx-auto space-y-8 text-center">
        <div className="space-y-4">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">{t('artistas.landing.tag')}</p>
          <h1 className="text-white text-3xl sm:text-4xl font-bold leading-tight">{t('artistas.landing.title')}</h1>
          <p className="text-white/50 text-sm sm:text-base max-w-md mx-auto">{t('artistas.landing.subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-left">
          {[t('artistas.landing.feature1'), t('artistas.landing.feature2'), t('artistas.landing.feature3')].map((f, i) => (
            <div key={i} className="bg-white/4 border border-white/10 rounded-2xl p-4">
              <p className="text-white/70 text-sm leading-snug">{f}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 max-w-xs mx-auto">
          <Link href="/eventos/artistas/aplicar"
            className="block w-full bg-[#F472B6] hover:bg-[#ec4899] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
            {t('artistas.landing.apply')}
          </Link>
          <p className="text-white/30 text-xs">
            {t('artistas.landing.haveAccount')}{' '}
            <Link href="/eventos/artistas/login" className="text-[#F472B6] hover:text-white transition">{t('artistas.landing.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
