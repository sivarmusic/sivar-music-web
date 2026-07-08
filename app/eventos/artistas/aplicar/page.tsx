'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'
const LABEL = 'block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5'

export default function AplicarArtistaPage() {
  const { t } = useLanguage()
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
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

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="w-full max-w-sm space-y-4">
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">Sivar Events for Artists</p>
          <p className="text-5xl">🎉</p>
          <p className="text-white/70 text-sm leading-relaxed">{t('artistas.apply.success')}</p>
          <Link href="/eventos" className="text-[#F472B6] text-sm hover:text-white transition block mt-4">← Sivar Events</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/eventos/artistas" className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase">Sivar Events for Artists</Link>
          <h1 className="text-white text-xl font-bold mt-2">{t('artistas.apply.title')}</h1>
          <p className="text-white/40 text-sm mt-1">{t('artistas.apply.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={LABEL}>{t('artistas.apply.stageName')}</label>
            <input type="text" value={nombreArtistico} onChange={e => setNombreArtistico(e.target.value)} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.apply.contactName')}</label>
            <input type="text" value={nombreContacto} onChange={e => setNombreContacto(e.target.value)} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.apply.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@correo.com" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.apply.phone')}</label>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+503 7000 0000" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.apply.genre')}</label>
            <input type="text" value={genero} onChange={e => setGenero(e.target.value)} placeholder="Pop, Reggaetón, Rock..." className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{t('artistas.apply.bio')}</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className={INPUT + ' resize-none'} />
          </div>

          <div className="border-t border-white/8 pt-3">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">{t('artistas.apply.socials')}</p>
            <div className="space-y-2">
              <input type="url" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Instagram" required className={INPUT} />
              <input type="url" value={spotify} onChange={e => setSpotify(e.target.value)} placeholder="Spotify" required className={INPUT} />
              <input type="url" value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="TikTok" required className={INPUT} />
              <input type="url" value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="YouTube" required className={INPUT} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
            {loading ? t('artistas.apply.sending') : t('artistas.apply.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
