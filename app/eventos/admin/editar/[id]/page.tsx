'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import EventFormView from '../../components/EventFormView'
import { useRequireAdmin } from '../../components/useRequireAdmin'
import { toEventDatetimeLocal } from '@/lib/eventDate'

interface FormState {
  nombre: string; slug: string; descripcion: string
  fecha: string; venue: string; direccion: string
  lat: string; lng: string; precio: string
  artistas: string; max_entradas: string; visible: boolean
  imagen_url: string | null
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// El input datetime-local se muestra y edita siempre en hora de El Salvador.
const toLocalDatetime = toEventDatetimeLocal

export default function EditarEventoPage() {
  useRequireAdmin()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [form, setForm] = useState<FormState>({
    nombre: '', slug: '', descripcion: '', fecha: '', venue: '', direccion: '',
    lat: '', lng: '', precio: '', artistas: '', max_entradas: '', visible: false, imagen_url: null,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/eventos/events/${id}`)
      .then(r => r.json())
      .then(({ event }) => {
        if (!event) return
        setForm({
          nombre: event.nombre ?? '',
          slug: event.slug ?? '',
          descripcion: event.descripcion ?? '',
          fecha: toLocalDatetime(event.fecha),
          venue: event.venue ?? '',
          direccion: event.direccion ?? '',
          lat: event.lat != null ? String(event.lat) : '',
          lng: event.lng != null ? String(event.lng) : '',
          precio: event.precio != null ? String(event.precio) : '',
          artistas: (event.artistas ?? []).join(', '),
          max_entradas: event.max_entradas != null ? String(event.max_entradas) : '',
          visible: event.visible ?? false,
          imagen_url: event.imagen_url ?? null,
        })
        setFetching(false)
      })
  }, [id])

  function set(field: keyof FormState, value: string | boolean | null) {
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
      let imagen_url = form.imagen_url

      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        fd.append('slug', form.slug)
        const upRes = await fetch('/api/eventos/upload-image', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error || 'Error al subir imagen')
        imagen_url = upData.url
      }

      const payload = {
        nombre: form.nombre.trim(),
        slug: form.slug.trim(),
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

      const res = await fetch(`/api/eventos/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      router.push('/eventos/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally { setLoading(false) }
  }

  if (fetching) return <div className="ev-state-screen"><p className="ev-muted" role="status">Cargando…</p></div>

  const currentImage = imagePreview ?? form.imagen_url

  return (
    <EventFormView
      title="Editar evento"
      values={form}
      slugPreview={form.slug}
      onChange={set}
      imageSrc={currentImage}
      imageChosen={!!imageFile}
      onImage={handleImage}
      error={error}
      loading={loading}
      submitLabel="Guardar cambios"
      loadingLabel="Guardando…"
      onSubmit={handleSubmit}
    />
  )
}
