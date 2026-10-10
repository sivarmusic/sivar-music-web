'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EventFormView from '../components/EventFormView'
import { useRequireAdmin } from '../components/useRequireAdmin'

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
  useRequireAdmin()
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

  function change(field: keyof FormState, value: string | boolean) {
    set(field, value)
    if (field === 'nombre' && !form.slug) set('slug', slugify(String(value)))
  }

  return (
    <EventFormView
      title="Nuevo evento"
      values={form}
      slugPreview={form.slug || slugify(form.nombre)}
      onChange={change}
      imageSrc={imagePreview}
      imageChosen={!!imageFile}
      onImage={handleImage}
      error={error}
      loading={loading}
      submitLabel="Crear evento"
      loadingLabel="Creando…"
      onSubmit={handleSubmit}
    />
  )
}
