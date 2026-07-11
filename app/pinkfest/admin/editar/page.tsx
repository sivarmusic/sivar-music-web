'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRequireAdmin } from '@/app/eventos/admin/components/useRequireAdmin'
import AdminHeader from '@/app/eventos/admin/components/AdminHeader'

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'
const LABEL = 'block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-2'

export default function EditarPinkFestPage() {
  useRequireAdmin()
  const [venue, setVenue] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/pinkfest/settings')
      .then(r => r.json())
      .then(data => {
        setVenue(data.venue ?? '')
        setDescripcion(data.descripcion ?? '')
        setImagenUrl(data.imagen_url ?? '')
        setLoading(false)
      })
  }, [])

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setImageFile(f)
    if (f.type.startsWith('image/')) setImagePreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true); setSaved(false)
    try {
      let newImagenUrl = imagenUrl

      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        fd.append('slug', 'pinkfest')
        const upRes = await fetch('/api/eventos/upload-image', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error || 'Error al subir imagen')
        newImagenUrl = upData.url
      }

      const res = await fetch('/api/pinkfest/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue: venue.trim(), descripcion: descripcion.trim(), imagen_url: newImagenUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setImagenUrl(newImagenUrl)
      setImageFile(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="min-h-screen bg-[#0a0008] flex items-center justify-center"><p className="text-white/30 text-sm">Cargando...</p></div>

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <AdminHeader />
      <div className="px-4 pt-4 max-w-lg mx-auto flex items-center justify-between">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Pink Fest</p>
          <h1 className="text-white text-lg font-bold leading-tight">Editar</h1>
        </div>
        <Link href="/pinkfest/admin" className="text-white/40 hover:text-white text-xs uppercase tracking-wider transition">
          ← Órdenes
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-6 max-w-lg mx-auto space-y-4">
        <p className="text-white/35 text-xs -mt-2 mb-2">
          La fecha y el precio de Pink Fest no se editan acá porque ya están ligados a las órdenes y los correos enviados. Solo se puede ajustar la imagen, el venue y la descripción.
        </p>

        {/* Imagen */}
        <div>
          <label className={LABEL}>Foto del evento</label>
          <div
            onClick={() => document.getElementById('img-input')?.click()}
            className="rounded-2xl border-2 border-dashed border-white/15 hover:border-[#F472B6]/50 bg-white/3 cursor-pointer transition overflow-hidden"
          >
            <img src={imagePreview ?? imagenUrl} alt="Preview" className="w-full h-44 object-cover" />
          </div>
          <input id="img-input" type="file" accept="image/*" onChange={handleImage} className="hidden" />
        </div>

        <div>
          <label className={LABEL}>Venue / Lugar</label>
          <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Beerhaus · San Salvador" className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Descripción</label>
          <textarea value={descripcion} rows={3} onChange={e => setDescripcion(e.target.value)} className={INPUT + ' resize-none'} />
        </div>

        {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3">{error}</p>}
        {saved && <p className="text-green-400 text-xs text-center">Guardado ✓</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
