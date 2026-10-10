'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import { copyFor, type CopyKey } from '../../copy'
import { Icon } from '../../components/icons'
import SiteHeader from '../../components/site/SiteHeader'
import SiteFooter from '../../components/site/SiteFooter'
import { Field, AreaField } from '../components/Field'
import { collectInvalid } from '../components/formErrors'
import { ARTIST_ART } from '../components/artistArt'

export default function AplicarArtistaPage() {
  const { lang, t } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  const [nombreArtistico, setNombreArtistico] = useState('')
  const [nombreContacto, setNombreContacto] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [genero, setGenero] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [spotify, setSpotify] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [youtube, setYoutube] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function bind(id: string, set: (v: string) => void) {
    return (e: { target: { value: string } }) => {
      set(e.target.value)
      if (fieldErrors[id]) setFieldErrors(prev => { const next = { ...prev }; delete next[id]; return next })
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    // Mismas reglas nativas de siempre (required / email / url), con error por campo.
    const invalid = collectInvalid(e.currentTarget)
    if (invalid.length) {
      setFieldErrors(Object.fromEntries(invalid.map(f => [f.id, f.missing ? c('art.required') : c('art.invalidValue')])))
      invalid[0].element.focus()
      return
    }
    setFieldErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/eventos/artistas/aplicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreArtistico, nombreContacto, email, telefono, genero, bio, instagram, spotify, tiktok, youtube }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('artistas.apply.error'))
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('artistas.apply.error'))
    } finally { setLoading(false) }
  }

  const errorCount = Object.keys(fieldErrors).length

  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main">
        <section className="ev-artist-hero">
          <img className="ev-artist-hero__img" src={ARTIST_ART} alt="" />
          <div className="ev-container ev-artist-hero__inner">
            <p className="ev-eyebrow">{c('ev.forArtists')}</p>
            <h1 className="ev-artist-hero__name ev-artist-hero__name--lg" style={{ marginTop: 'var(--ev-space-3)' }}>{t('artistas.apply.title')}</h1>
            <p className="ev-lead" style={{ marginTop: 'var(--ev-space-4)', maxWidth: '46ch' }}>{t('artistas.apply.subtitle')}</p>
          </div>
        </section>

        <div className="ev-container ev-container--narrow ev-page">
          {success ? (
            <section className="ev-stack ev-stack--lg" role="status">
              <span className="ev-stamp ev-stamp--accent ev-stamp--anim" style={{ alignSelf: 'start', marginLeft: 'var(--ev-space-2)', fontSize: '2rem' }}>
                <Icon name="check" size="xl" />{c('art.sent')}
              </span>
              <h2 className="ev-display ev-display--md">{c('art.thanks')}</h2>
              <p className="ev-lead">{t('artistas.apply.success')}</p>
              <Link href="/eventos" className="ev-link-arrow">{c('eva.seeLineup')} <Icon name="arrow-right" /></Link>
            </section>
          ) : (
            <form className="ev-stack ev-stack--lg" noValidate onSubmit={handleSubmit} aria-busy={loading}>
              {errorCount > 0 && (
                <div className="ev-banner ev-banner--error" role="alert">
                  <Icon name="alert-triangle" />
                  <div><p className="ev-banner__title">{c('art.fixFields', { n: errorCount })}</p></div>
                </div>
              )}
              {error && (
                <div className="ev-banner ev-banner--error" role="alert">
                  <Icon name="alert-triangle" />
                  <div><p className="ev-banner__title">{error}</p></div>
                </div>
              )}

              <fieldset className="ev-fieldset">
                <legend className="ev-display ev-display--sm">{c('art.about')}</legend>
                <div className="ev-form-grid">
                  <Field id="ap-a" label={t('artistas.apply.stageName')} autoComplete="off" required value={nombreArtistico} onChange={bind('ap-a', setNombreArtistico)} error={fieldErrors['ap-a']} />
                  <Field id="ap-n" label={t('artistas.apply.contactName')} autoComplete="name" required value={nombreContacto} onChange={bind('ap-n', setNombreContacto)} error={fieldErrors['ap-n']} />
                  <Field id="ap-e" label={t('artistas.apply.email')} icon="mail" type="email" autoComplete="email" required placeholder="tu@correo.com" value={email} onChange={bind('ap-e', setEmail)} error={fieldErrors['ap-e']} />
                  <Field id="ap-t" label={t('artistas.apply.phone')} icon="phone" type="tel" autoComplete="tel" placeholder="+503 7000 0000" value={telefono} onChange={bind('ap-t', setTelefono)} error={fieldErrors['ap-t']} />
                </div>
              </fieldset>

              <fieldset className="ev-fieldset">
                <legend className="ev-display ev-display--sm">{c('art.music')}</legend>
                <div className="ev-form-grid">
                  <Field id="ap-g" label={t('artistas.apply.genre')} icon="music" placeholder="Pop, Reggaetón, Rock..." value={genero} onChange={bind('ap-g', setGenero)} error={fieldErrors['ap-g']} />
                  <AreaField id="ap-m" label={t('artistas.apply.bio')} rows={4} value={bio} onChange={bind('ap-m', setBio)} error={fieldErrors['ap-m']} />
                </div>
              </fieldset>

              <fieldset className="ev-fieldset">
                <legend className="ev-display ev-display--sm">{t('artistas.apply.socials')}</legend>
                <div className="ev-form-grid">
                  <Field id="ap-ig" label="Instagram" icon="instagram" type="url" required placeholder="https://instagram.com/…" value={instagram} onChange={bind('ap-ig', setInstagram)} error={fieldErrors['ap-ig']} />
                  <Field id="ap-sp" label="Spotify" icon="spotify" type="url" required placeholder="https://open.spotify.com/…" value={spotify} onChange={bind('ap-sp', setSpotify)} error={fieldErrors['ap-sp']} />
                  <Field id="ap-tk" label="TikTok" icon="music" type="url" required placeholder="https://tiktok.com/@…" value={tiktok} onChange={bind('ap-tk', setTiktok)} error={fieldErrors['ap-tk']} />
                  <Field id="ap-yt" label="YouTube" icon="youtube" type="url" required placeholder="https://youtube.com/…" value={youtube} onChange={bind('ap-yt', setYoutube)} error={fieldErrors['ap-yt']} />
                </div>
              </fieldset>

              <button className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${loading ? ' is-loading' : ''}`} type="submit" disabled={loading}>
                {loading ? t('artistas.apply.sending') : t('artistas.apply.submit')}
              </button>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
