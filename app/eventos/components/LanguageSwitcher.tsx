'use client'
import { useLanguage } from '@/lib/i18n'

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

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
