'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import { copyFor } from '../../copy'
import { Icon } from '../icons'
import LanguageSwitcher from '../LanguageSwitcher'
import UserMenu from '../UserMenu'

interface SiteHeaderProps {
  /** Si se pasa, muestra el buscador del encabezado (visible desde 960 px). */
  search?: { value: string; onChange: (value: string) => void }
}

/** Skip-link + encabezado público de Sivar Eventos ("Rótulo de medianoche"). */
export default function SiteHeader({ search }: SiteHeaderProps) {
  const { lang, t } = useLanguage()
  const c = (key: Parameters<typeof copyFor>[1]) => copyFor(lang, key)

  return (
    <>
      <a className="ev-skip-link" href="#main">{c('ev.skip')}</a>
      <header className="ev-site-header">
        <div className="ev-container ev-site-header__inner">
          <Link className="ev-brand" href="/eventos" aria-label={c('ev.brand')}>
            <span className="ev-wordmark" aria-hidden="true">Sivar<br />Eventos</span>
          </Link>

          {search && (
            <form className="ev-site-header__search" role="search" onSubmit={e => e.preventDefault()}>
              <label className="ev-visually-hidden" htmlFor="ev-q-top">{c('ev.searchLabel')}</label>
              <div className="ev-field__control">
                <Icon name="search" />
                <input
                  className="ev-input"
                  id="ev-q-top"
                  type="search"
                  placeholder={t('home.search')}
                  autoComplete="off"
                  value={search.value}
                  onChange={e => search.onChange(e.target.value)}
                />
              </div>
            </form>
          )}

          <div className="ev-site-header__actions">
            <Link className="ev-nav-home" href="/eventos" aria-label={c('ev.homeAria')}>
              <Icon name="home" />
              <span>{c('ev.home')}</span>
            </Link>
            <div className="ev-site-header__social">
              <a className="ev-icon-btn" href="http://instagram.com/sivar.music" target="_blank" rel="noopener noreferrer" aria-label={c('ev.social.instagram')}>
                <Icon name="instagram" />
              </a>
              <a className="ev-icon-btn" href="https://open.spotify.com/user/31xkfblpr6j3rclgugt5vrfwysbu" target="_blank" rel="noopener noreferrer" aria-label={c('ev.social.spotify')}>
                <Icon name="spotify" />
              </a>
              <a className="ev-icon-btn" href="https://www.youtube.com/@sivarmusicentertainment9158" target="_blank" rel="noopener noreferrer" aria-label={c('ev.social.youtube')}>
                <Icon name="youtube" />
              </a>
            </div>
            <LanguageSwitcher variant="rotulo" />
            <UserMenu variant="rotulo" />
          </div>
        </div>
      </header>
    </>
  )
}
