'use client'
import { useLanguage } from '@/lib/i18n'
import { copyFor } from '../copy'

export default function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'rotulo' }) {
  const { lang, setLang } = useLanguage()

  if (variant === 'rotulo') {
    // Rediseño "Rótulo de medianoche": selector segmentado ES / EN
    return (
      <nav className="ev-lang" aria-label={copyFor(lang, 'ev.langNav')}>
        <button type="button" className="ev-lang__opt" lang="es" aria-current={lang === 'es'} aria-label="Español" onClick={() => setLang('es')}>ES</button>
        <button type="button" className="ev-lang__opt" lang="en" aria-current={lang === 'en'} aria-label="English" onClick={() => setLang('en')}>EN</button>
      </nav>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-none">
      <button
        onClick={() => setLang('es')}
        title="Español"
        aria-label="Español"
        className={`flex items-center gap-1 text-base leading-none rounded-md p-1 transition ${lang === 'es' ? 'opacity-100 ring-1 ring-[#F472B6]/60' : 'opacity-35 hover:opacity-70'}`}
      >
        🇸🇻<span className="text-[9px] font-bold uppercase tracking-wider">ES</span>
      </button>
      <button
        onClick={() => setLang('en')}
        title="English"
        aria-label="English"
        className={`flex items-center gap-1 text-base leading-none rounded-md p-1 transition ${lang === 'en' ? 'opacity-100 ring-1 ring-[#F472B6]/60' : 'opacity-35 hover:opacity-70'}`}
      >
        🇺🇸<span className="text-[9px] font-bold uppercase tracking-wider">EN</span>
      </button>
    </div>
  )
}
