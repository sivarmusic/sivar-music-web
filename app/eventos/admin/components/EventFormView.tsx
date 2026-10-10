'use client'
import Link from 'next/link'
import { Icon } from '../../components/icons'

export interface EventFormValues {
  nombre: string; slug: string; descripcion: string
  fecha: string; venue: string; direccion: string
  lat: string; lng: string; precio: string
  artistas: string; max_entradas: string; visible: boolean
}

interface Props {
  title: string
  values: EventFormValues
  slugPreview: string
  onChange: (field: keyof EventFormValues, value: string | boolean) => void
  /** Imagen actual (vista previa local o la ya guardada). */
  imageSrc: string | null
  imageChosen: boolean
  onImage: (e: React.ChangeEvent<HTMLInputElement>) => void
  error: string
  loading: boolean
  submitLabel: string
  loadingLabel: string
  onSubmit: (e: React.FormEvent) => void
}

/** Formulario de evento (nuevo / editar). Solo presentación: el estado y el envío viven en cada página. */
export default function EventFormView({
  title, values: f, slugPreview, onChange, imageSrc, imageChosen, onImage, error, loading, submitLabel, loadingLabel, onSubmit,
}: Props) {
  return (
    <>
      <div className="ev-page-head">
        <div className="ev-stack ev-stack--sm">
          <Link className="ev-back-link" href="/eventos/admin"><Icon name="arrow-left" size="sm" />Eventos</Link>
          <h1 className="ev-display ev-display--md">{title}</h1>
        </div>
      </div>

      <form onSubmit={onSubmit} className="ev-stack ev-stack--lg" style={{ maxWidth: 720 }} aria-busy={loading}>
        <fieldset className="ev-fieldset">
          <legend className="ev-display ev-display--sm">Datos</legend>
          <div className="ev-form-grid ev-form-grid--2">
            <div className="ev-field ev-span-2">
              <label className="ev-field__label" htmlFor="ev-nombre">Nombre del evento <span className="ev-opt">(obligatorio)</span></label>
              <input className="ev-input" id="ev-nombre" type="text" value={f.nombre} required placeholder="Nombre del evento" onChange={e => onChange('nombre', e.target.value)} />
            </div>
            <div className="ev-field ev-span-2">
              <label className="ev-field__label" htmlFor="ev-slug">Slug (URL)</label>
              <input className="ev-input" id="ev-slug" type="text" value={f.slug} placeholder="pink-fest-2025" aria-describedby="ev-slug-h" onChange={e => onChange('slug', e.target.value)} />
              <p className="ev-field__hint" id="ev-slug-h">sivarmusic.com/eventos/<strong>{slugPreview || '...'}</strong></p>
            </div>
            <div className="ev-field ev-span-2">
              <label className="ev-field__label" htmlFor="ev-fecha">Fecha y hora <span className="ev-opt">(obligatorio)</span></label>
              <input className="ev-input" id="ev-fecha" type="datetime-local" value={f.fecha} required onChange={e => onChange('fecha', e.target.value)} />
            </div>
            <div className="ev-field">
              <label className="ev-field__label" htmlFor="ev-precio">Precio por entrada (USD) <span className="ev-opt">(obligatorio)</span></label>
              <input className="ev-input" id="ev-precio" type="number" step="0.01" min="0" inputMode="decimal" value={f.precio} required placeholder="10.00" onChange={e => onChange('precio', e.target.value)} />
            </div>
            <div className="ev-field">
              <label className="ev-field__label" htmlFor="ev-max">Máximo de entradas <span className="ev-opt">(opcional)</span></label>
              <input className="ev-input" id="ev-max" type="number" min="1" inputMode="numeric" value={f.max_entradas} placeholder="Sin límite" onChange={e => onChange('max_entradas', e.target.value)} />
            </div>
            <div className="ev-field ev-span-2">
              <label className="ev-field__label" htmlFor="ev-artistas">Artistas <span className="ev-opt">(separados por coma)</span></label>
              <input className="ev-input" id="ev-artistas" type="text" value={f.artistas} placeholder="Artista 1, Artista 2" onChange={e => onChange('artistas', e.target.value)} />
            </div>
            <div className="ev-field ev-span-2">
              <label className="ev-field__label" htmlFor="ev-desc">Descripción</label>
              <textarea className="ev-textarea" id="ev-desc" rows={3} value={f.descripcion} placeholder="Descripción del evento..." onChange={e => onChange('descripcion', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="ev-fieldset">
          <legend className="ev-display ev-display--sm">Lugar</legend>
          <div className="ev-form-grid ev-form-grid--2">
            <div className="ev-field ev-span-2">
              <label className="ev-field__label" htmlFor="ev-venue">Venue / Lugar <span className="ev-opt">(obligatorio)</span></label>
              <input className="ev-input" id="ev-venue" type="text" value={f.venue} required placeholder="Teatro Nacional" onChange={e => onChange('venue', e.target.value)} />
            </div>
            <div className="ev-field ev-span-2">
              <label className="ev-field__label" htmlFor="ev-dir">Dirección</label>
              <input className="ev-input" id="ev-dir" type="text" value={f.direccion} placeholder="1a Calle Ote. y 2a Av. Sur, San Salvador" onChange={e => onChange('direccion', e.target.value)} />
            </div>
            <div className="ev-field">
              <label className="ev-field__label" htmlFor="ev-lat">Latitud</label>
              <input className="ev-input" id="ev-lat" type="number" step="any" value={f.lat} placeholder="13.6929" onChange={e => onChange('lat', e.target.value)} />
            </div>
            <div className="ev-field">
              <label className="ev-field__label" htmlFor="ev-lng">Longitud</label>
              <input className="ev-input" id="ev-lng" type="number" step="any" value={f.lng} placeholder="-89.2182" onChange={e => onChange('lng', e.target.value)} />
            </div>
            <p className="ev-field__hint ev-span-2">Abrí Google Maps, buscá el lugar, y copiá las coordenadas del link.</p>
          </div>
        </fieldset>

        <fieldset className="ev-fieldset">
          <legend className="ev-display ev-display--sm">Imagen</legend>
          <label className="ev-img-pick">
            <input type="file" accept="image/*" onChange={onImage} aria-label="Foto del evento" />
            {imageSrc ? (
              <img src={imageSrc} alt="Vista previa del afiche" />
            ) : (
              <span className="ev-img-pick__empty">
                <span>
                  <span className="ev-dropzone__title" style={{ display: 'block' }}>Seleccionar imagen</span>
                  <span className="ev-dropzone__formats">Foto del evento</span>
                </span>
                <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="image" size="lg" /></span>
              </span>
            )}
          </label>
          {imageSrc && !imageChosen && <p className="ev-subtle" style={{ marginTop: 'var(--ev-space-2)' }}>Tocá para cambiar la imagen</p>}
        </fieldset>

        <label className="ev-checkbox">
          <input type="checkbox" checked={f.visible} onChange={e => onChange('visible', e.target.checked)} />
          <span>Publicar evento (visible en /eventos)</span>
        </label>

        {error && (
          <div className="ev-banner ev-banner--error" role="alert">
            <Icon name="alert-circle" />
            <div><p className="ev-banner__title">{error}</p></div>
          </div>
        )}

        <div className="ev-cluster">
          <button type="submit" className={`ev-btn ev-btn--primary${loading ? ' is-loading' : ''}`} disabled={loading}>
            {loading ? loadingLabel : submitLabel}
          </button>
          <Link className="ev-btn ev-btn--ghost" href="/eventos/admin">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
