'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import { Icon } from '../components/icons'
import SiteHeader from '../components/site/SiteHeader'
import SiteFooter from '../components/site/SiteFooter'
import { ARTIST_ART } from './components/artistArt'

export default function ArtistasLandingPage() {
  const { t } = useLanguage()
  const features = [t('artistas.landing.feature1'), t('artistas.landing.feature2'), t('artistas.landing.feature3')]

  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main">
        <section className="ev-artist-hero">
          <img className="ev-artist-hero__img" src={ARTIST_ART} alt="" />
          <div className="ev-container ev-artist-hero__inner">
            <p className="ev-eyebrow">{t('artistas.landing.tag')}</p>
            <h1 className="ev-display ev-display--lg" style={{ marginTop: 'var(--ev-space-3)' }}>{t('artistas.landing.title')}</h1>
            <p className="ev-lead" style={{ marginTop: 'var(--ev-space-4)', maxWidth: '46ch' }}>{t('artistas.landing.subtitle')}</p>
          </div>
        </section>

        <div className="ev-container ev-container--narrow ev-page ev-stack ev-stack--lg">
          <ul className="ev-feature-list" role="list">
            {features.map(f => (
              <li key={f}>
                <Icon name="check-circle" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="ev-stack ev-stack--sm">
            <Link href="/eventos/artistas/aplicar" className="ev-btn ev-btn--primary ev-btn--lg ev-btn--block">
              {t('artistas.landing.apply')} <Icon name="arrow-right" size="lg" />
            </Link>
            <p className="ev-subtle" style={{ textAlign: 'center' }}>
              {t('artistas.landing.haveAccount')}{' '}
              <Link href="/eventos/artistas/login">{t('artistas.landing.login')}</Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
