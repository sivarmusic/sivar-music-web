'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FormState {
  nombre: string; slug: string; descripcion: string
  fecha: string; venue: string; direccion: string
  lat: string; lng: string; precio: string
  artistas: string; max_entradas: string; visible: boolean
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NuevoEventoPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    nombre: '', slug: '', descripcion: '', fecha: '', venue: '', direccion: '',
    lat: '', lng: '', precio: '', artistas: '', max_entradas: '', visible: false,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof FormState, value: string | boolean) {
    setForm(p => ({ ...p, [field]: value }))
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setImageFile(f)
    if (f.type.startsWith('image/')) setImagePreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      let imagen_url: string | null = null

      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        fd.append('slug', form.slug || slugify(form.nombre))
        const upRes = await fetch('/api/eventos/upload-image', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error || 'Error al subir imagen')
        imagen_url = upData.url
      }

      const payload = {
        nombre: form.nombre.trim(),
        slug: form.slug.trim() || slugify(form.nombre),
        descripcion: form.descripcion.trim(),
        fecha: form.fecha,
        venue: form.venue.trim(),
        direccion: form.direccion.trim(),
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        precio: parseFloat(form.precio) || 0,
        artistas: form.artistas.split(',').map(a => a.trim()).filter(Boolean),
        max_entradas: form.max_entradas ? parseInt(form.max_entradas) : null,
        visible: form.visible,
        imagen_url,
      }

      const res = await fetch('/api/eventos/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear evento')
      router.push('/eventos/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0008] text-white">
      <div className="border-b border-white/8 px-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.25em] uppercase">Admin</p>
          <h1 className="text-white text-lg font-bold">Nuevo evento</h1>
        </div>
        <a href="/eventos/admin" className="text-white/35 hover:text-white text-xs transition">← Volver</a>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-6 max-w-lg mx-auto space-y-4">
        {/* Imagen */}
        <div>
          <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Foto del evento</label>
          <div
            onClick={() => document.getElementById('img-input')?.click()}
            className="rounded-2xl border-2 border-dashed border-white/15 hover:border-[#F472B6]/50 bg-white/3 cursor-pointer transition overflow-hidden"
          >
            {imagePreview
              ? <img src={imagePreview} alt="Preview" className="w-full h-44 object-cover" />
              : <div className="h-32 flex flex-col items-center justify-center gap-2"><span className="text-3xl">🖼</span><span className="text-white/35 text-sm">Seleccionar imagen</span></div>}
          </div>
          <input id="img-input" type="file" accept="image/*" onChange={handleImage} className="hidden" />
        </div>

        {/* Nombre */}
        <Field label="Nombre del evento" required>
          <input type="text" value={form.nombre} required placeholder="Pink Fest 2025"
            onChange={e => { set('nombre', e.target.value); if (!form.slug) set('slug', slugify(e.target.value)) }}
            className={INPUT} />
        </Field>

        {/* Slug */}
        <Field label="Slug (URL)">
          <input type="text" value={form.slug} placeholder="pink-fest-2025"
            onChange={e => set('slug', e.target.value)}
            className={INPUT} />
          <p className="text-white/25 text-xs mt-1">sivarmusic.com/eventos/<strong>{form.slug || slugify(form.nombre) || '...'}</strong></p>
        </Field>

        {/* Descripción */}
        <Field label="Descripción">
          <textarea value={form.descripcion} rows={3} placeholder="Descripción del evento..."
            onChange={e => set('descripcion', e.target.value)}
            className={INPUT + ' resize-none'} />
        </Field>

        {/* Fecha */}
        <Field label="Fecha y hora" required>
          <input type="datetime-local" value={form.fecha} required
            onChange={e => set('fecha', e.target.value)}
            className={INPUT + ' [color-scheme:dark]'} />
        </Field>

        {/* Venue */}
        <Field label="Venue / Lugar" required>
          <input type="text" value={form.venue} required placeholder="Teatro Nacional"
            onChange={e => set('venue', e.target.value)}
            className={INPUT} />
        </Field>

        {/* Dirección */}
        <Field label="Dirección">
          <input type="text" value={form.direccion} placeholder="1a Calle Ote. y 2a Av. Sur, San Salvador"
            onChange={e => set('direccion', e.target.value)}
            className={INPUT} />
        </Field>

        {/* Coordenadas */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud">
            <input type="number" step="any" value={form.lat} placeholder="13.6929"
              onChange={e => set('lat', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Longitud">
            <input type="number" step="any" value={form.lng} placeholder="-89.2182"
              onChange={e => set('lng', e.target.value)} className={INPUT} />
          </Field>
        </div>
        <p className="text-white/20 text-xs -mt-2">Abrí Google Maps, buscá el lugar, y copiá las coordenadas del link.</p>

        {/* Artistas */}
        <Field label="Artistas (separados por coma)">
          <input type="text" value={form.artistas} placeholder="Artista 1, Artista 2"
            onChange={e => set('artistas', e.target.value)} className={INPUT} />
        </Field>

        {/* Precio */}
        <Field label="Precio por entrada (USD)" required>
          <input type="number" step="0.01" min="0" value={form.precio} required placeholder="10.00"
            onChange={e => set('precio', e.target.value)} className={INPUT} />
        </Field>

        {/* Máximo de entradas */}
        <Field label="Máximo de entradas (opcional)">
          <input type="number" min="1" value={form.max_entradas} placeholder="Sin límite"
            onChange={e => set('max_entradas', e.target.value)} className={INPUT} />
        </Field>

        {/* Visible */}
        <label className="flex items-center gap-3 cursor-pointer py-1">
          <div onClick={() => set('visible', !form.visible)}
            className={`w-10 h-6 rounded-full transition-colors flex-none ${form.visible ? 'bg-[#F472B6]' : 'bg-white/15'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${form.visible ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-white/55 text-sm">Publicar evento (visible en /eventos)</span>
        </label>

        {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-[#F472B6] hover:bg-[#ec4899] disabled:opacity-50 text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all">
          {loading ? 'Creando...' : 'Crear evento'}
        </button>
      </form>
    </div>
  )
}

const INPUT = 'w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F472B6]/50 transition'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/55 text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5">
        {label}{required && <span className="text-[#F472B6] ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
