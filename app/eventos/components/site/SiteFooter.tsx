'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import { copyFor } from '../../copy'

/** Pie público de Sivar Eventos ("Rótulo de medianoche"). */
export default function SiteFooter() {
  const { lang } = useLanguage()
  return (
    <footer className="ev-site-footer">
      <div className="ev-container ev-site-footer__inner">
        <p className="ev-site-footer__word" aria-hidden="true">Sivar<br />Eventos</p>
        <div className="ev-stack ev-stack--sm">
          <nav className="ev-site-footer__links" aria-label={copyFor(lang, 'ev.footerNav')}>
            <Link href="/eventos/artistas">{copyFor(lang, 'ev.forArtists')}</Link>
            <Link href="/eventos/privacidad">{copyFor(lang, 'ev.privacy')}</Link>
          </nav>
          <p className="ev-subtle">{copyFor(lang, 'ev.footerNote')}</p>
        </div>
      </div>
    </footer>
  )
}
