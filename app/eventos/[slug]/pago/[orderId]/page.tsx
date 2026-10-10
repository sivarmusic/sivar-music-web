'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n'
import { formatMoneyFull, orderTotal } from '@/lib/format'
import { copyFor, type CopyKey } from '../../../copy'
import { Icon } from '../../../components/icons'
import SiteHeader from '../../../components/site/SiteHeader'
import SiteFooter from '../../../components/site/SiteFooter'
import OrderSteps from '../../../components/ui/OrderSteps'
import OrderStatusChip from '../../../components/ui/OrderStatusChip'
import CopyButton from '../../../components/ui/CopyButton'
import { splitOn } from '../../../components/ui/format'

interface Order {
  id: string; order_code: string; cantidad: number; status: string
  events: { slug: string; nombre: string; precio: number; venue: string; fecha: string } | null
}

const STORAGE_KEY = 'sm_pending'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 4 * 1024 * 1024
const SUPPORT_EMAIL = 'admin@sivarmusic.com'

/** Archivo descartado en el cliente, para mostrarlo con su motivo (como en el diseño). */
type Rejected = { name: string; size: number; kind: 'type' | 'size' }
/** Fallo al enviar: corte de red (se puede reintentar) o mensaje del servidor. */
type SendError = { kind: 'network' } | { kind: 'message'; message: string }

export default function EventoPagoPage() {
  const { lang, t, dateLocale } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [rejected, setRejected] = useState<Rejected | null>(null)
  const [sendError, setSendError] = useState<SendError | null>(null)
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const previewRef = useRef<string | null>(null)

  useEffect(() => {
    fetch(`/api/eventos/order/${orderId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.order) { setNotFound(true); return }
        setOrder(d.order)
        if (d.order.status === 'pendiente_comprobante') {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              orderId: d.order.id, orderCode: d.order.order_code,
              slug, expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            }))
          } catch {}
        } else if (['en_revision', 'confirmado'].includes(d.order.status)) {
          try { localStorage.removeItem(STORAGE_KEY) } catch {}
          router.replace(`/eventos/${slug}/gracias/${orderId}`)
        }
      })
      .catch(() => setNotFound(true))
  }, [orderId, slug, router])

  // Libera la URL de la vista previa al cambiar de archivo o salir.
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])

  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setPreview(null)
  }

  function discard(f: File, kind: Rejected['kind']) {
    setFile(null); clearPreview()
    setRejected({ name: f.name, size: f.size, kind })
  }

  function acceptFile(f: File) {
    setSendError(null); setRejected(null)
    if (!ALLOWED_TYPES.includes(f.type)) { discard(f, 'type'); return }
    if (f.size > MAX_BYTES) { discard(f, 'size'); return }
    clearPreview()
    setFile(f)
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      previewRef.current = url
      setPreview(url)
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    acceptFile(f)
    // Permite volver a elegir el mismo archivo tras un error.
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) acceptFile(f)
  }

  function removeFile() {
    setFile(null); clearPreview(); setRejected(null); setSendError(null)
  }

  async function handleUpload() {
    if (!file || uploading) return; setSendError(null); setUploading(true)
    try {
      const fd = new FormData(); fd.append('orderId', orderId); fd.append('file', file)
      const res = await fetch('/api/eventos/upload', { method: 'POST', body: fd })
      // Una respuesta no-JSON (p. ej. 413 de la plataforma) no debe romper el flujo.
      const data = await res.json().catch(() => ({} as { error?: string }))
      if (res.status === 413) throw new Error(t('pago.errorSize'))
      // 409 con `remaining` = sin cupo; 409 sin él = la orden ya fue confirmada.
      if (res.status === 409 && typeof (data as { remaining?: number }).remaining !== 'number') { setAlreadyConfirmed(true); return }
      if (!res.ok) throw new Error(data.error || t('pago.errorUpload'))
      setDone(true)
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      setTimeout(() => router.push(`/eventos/${slug}/gracias/${orderId}`), 900)
    } catch (err) {
      if (err instanceof TypeError) setSendError({ kind: 'network' })
      else setSendError({ kind: 'message', message: err instanceof Error ? err.message : t('pago.errorUnexpected') })
    } finally { setUploading(false) }
  }

  const shell = (main: React.ReactNode) => (
    <div className="ev-surface">
      <SiteHeader />
      {main}
      <SiteFooter />
    </div>
  )

  if (notFound) return shell(
    <main id="main" className="ev-state-screen">
      <div className="ev-stack">
        <p className="ev-lead">{t('pago.notFound')}</p>
        <a href={`/eventos/${slug}`} className="ev-link-arrow">{t('pago.backToEvent')}</a>
      </div>
    </main>
  )

  if (!order) return shell(
    <main id="main" className="ev-state-screen" aria-busy="true">
      <p className="ev-muted" role="status">{t('pago.loading')}</p>
    </main>
  )

  const precio = order.events?.precio
  const total = precio != null ? orderTotal(order.cantidad, precio) : null
  const isRejected = order.status === 'rechazado'
  const eventName = order.events?.nombre ?? ''
  const ticketsLabel = `${order.cantidad} ${order.cantidad > 1 ? t('detail.tickets') : t('detail.ticket')}`
  const sizeMb = (bytes: number) => (bytes / 1024 / 1024).toLocaleString(dateLocale, { maximumFractionDigits: 1 })
  const codeHint = splitOn(c('evp.codeHint'), 'concept')
  const qrHint = splitOn(c('evp.qrHint'), 'code')
  const rows: { key: string; label: string; value: string; copy?: string; copyLabel?: string; keyRow?: boolean; big?: boolean }[] = [
    { key: 'bank', label: t('pago.bank'), value: 'Banco Agrícola' },
    { key: 'holder', label: t('pago.holder'), value: 'Andrea Vanessa Garcia Garcia' },
    { key: 'type', label: t('pago.accountType'), value: t('pago.accountTypeValue') },
    { key: 'account', label: t('pago.account'), value: '3110950846', copy: '3110950846', copyLabel: c('evp.copyAccount') },
    { key: 'email', label: t('pago.email'), value: SUPPORT_EMAIL },
    { key: 'concept', label: c('evp.conceptRequired'), value: order.order_code, copy: order.order_code, copyLabel: c('evp.copyConcept'), keyRow: true, big: true },
    ...(total != null
      ? [{ key: 'amount', label: c('evp.exactAmount'), value: formatMoneyFull(total), copy: total.toFixed(2), copyLabel: c('evp.copyAmount'), big: true }]
      : []),
  ]

  const chosen = file

  return shell(
    <main id="main" className="ev-container ev-container--mid ev-page">
      <OrderSteps current={1} />

      <div className="ev-stack ev-stack--lg" style={{ marginTop: 'var(--ev-space-6)' }}>
        {/* ── Encabezado por estado ─────────────────────────── */}
        {isRejected ? (
          <>
            <header className="ev-stack ev-stack--sm">
              <OrderStatusChip status="rechazado" />
              <h1 className="ev-display ev-display--md">{c('evp.rejectedTitle')}</h1>
              <p className="ev-lead">{c('evp.rejectedLead', { code: order.order_code })}</p>
            </header>
            <div className="ev-banner ev-banner--error">
              <Icon name="alert-triangle" />
              <div>
                <p className="ev-banner__title">{c('evp.rejectedWhen')}</p>
                <ul className="ev-banner__text" style={{ paddingLeft: '1.1em', marginTop: 'var(--ev-space-2)' }}>
                  {total != null && <li>{c('evp.rejectedAmount', { amount: formatMoneyFull(total) })}</li>}
                  <li>{c('evp.rejectedConcept', { code: order.order_code })}</li>
                  <li>{c('evp.rejectedImage')}</li>
                </ul>
              </div>
            </div>
            <section className="ev-admin-card ev-stack" style={{ padding: 'var(--ev-space-5)' }} aria-labelledby="ev-h-ayuda">
              <h2 className="ev-title ev-title--sm" id="ev-h-ayuda">{c('evp.helpTitle')}</h2>
              <p className="ev-muted">{c('evp.helpText')}</p>
              <div className="ev-cluster">
                <a className="ev-btn ev-btn--secondary ev-btn--sm" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(order.order_code)}`}>
                  <Icon name="mail" />{c('evp.helpEmail')}
                </a>
              </div>
            </section>
          </>
        ) : (
          <header className="ev-stack ev-stack--sm">
            <OrderStatusChip status="pendiente_comprobante" />
            <h1 className="ev-display ev-display--md">{c('evp.title')}</h1>
            <p className="ev-lead">
              {eventName}{eventName && ' · '}{ticketsLabel}
              {total != null && <> · <strong style={{ color: 'var(--ev-color-text)' }}>{formatMoneyFull(total)}</strong></>}
            </p>
          </header>
        )}

        {/* ── Código de orden (lo más grande de la pantalla) ── */}
        <section className="ev-ticket" aria-labelledby="ev-h-code">
          <div className="ev-ticket__section ev-order-code">
            <h2 className="ev-ticket__label" id="ev-h-code">{t('pago.yourCode')}</h2>
            <p className="ev-order-code__value ev-mono">{order.order_code}</p>
            <p className="ev-order-code__hint">
              {codeHint ? <>{codeHint[0]}<strong>{t('pago.codeNoteBold')}</strong>{codeHint[1]}</> : c('evp.codeHint')}
            </p>
            <div>
              <CopyButton
                value={order.order_code}
                ariaLabel={c('evp.copyCode')}
                idleLabel={c('evp.copyCode')}
                doneLabel={t('pago.copied')}
                announce={`${t('pago.copied')}: ${order.order_code}`}
              />
            </div>
          </div>
          <div className="ev-ticket__perf" aria-hidden="true" />
          <div className="ev-ticket__section ev-ticket__row" style={{ flexWrap: 'wrap' }}>
            <span className="ev-ticket__muted">{c('evp.saveLink')}</span>
          </div>
        </section>

        {/* ── 1 · Transferí ──────────────────────────────────── */}
        <section className="ev-stack" aria-labelledby="ev-h-paso1">
          <h2 className="ev-display ev-display--sm" id="ev-h-paso1">
            <span style={{ color: 'var(--ev-color-accent-text)' }}>1 ·</span>{' '}
            {total != null ? c('evp.step1', { amount: formatMoneyFull(total) }) : c('evp.step1NoAmount')}
          </h2>
          <p className="ev-muted">{t('pago.steps')}</p>
          <div className="ev-copy-list">
            {rows.map(r => (
              <div key={r.key} className={`ev-copy-row${r.keyRow ? ' ev-copy-row--key' : ''}`}>
                <div>
                  <p className="ev-copy-row__label" style={r.keyRow ? { color: 'var(--ev-color-accent-text)' } : undefined}>{r.label}</p>
                  <p className={`ev-copy-row__value${r.big ? ' ev-copy-row__value--big' : ''}`}>{r.value}</p>
                </div>
                {r.copy && (
                  <CopyButton
                    value={r.copy}
                    ariaLabel={r.copyLabel ?? `${t('pago.copyLabel')} ${r.label}`}
                    idleLabel={t('pago.copy')}
                    doneLabel={t('pago.copied')}
                    announce={`${t('pago.copied')}: ${r.label}`}
                  />
                )}
              </div>
            ))}
          </div>

          <details className="ev-admin-card ev-disclosure" style={{ padding: 0 }}>
            <summary style={{ display: 'flex', alignItems: 'center', gap: 'var(--ev-space-3)', minHeight: 56, padding: '0 var(--ev-space-4)', cursor: 'pointer', fontWeight: 600 }}>
              <Icon name="qr" />{c('evp.qrTitle')}<Icon name="chevron-down" className="ev-disclosure__chev" />
            </summary>
            <div style={{ padding: '0 var(--ev-space-4) var(--ev-space-5)', display: 'grid', gap: 'var(--ev-space-3)', justifyItems: 'center', textAlign: 'center' }}>
              <Image
                src="/eventos/qr-banco.png"
                alt="QR Banco Agrícola"
                width={220}
                height={220}
                style={{ background: '#fff', padding: 10, borderRadius: 6 }}
              />
              <p className="ev-subtle">
                {qrHint
                  ? <>{qrHint[0]}<strong style={{ color: 'var(--ev-color-text)' }}>{order.order_code}</strong>{qrHint[1]}</>
                  : c('evp.qrHint')}
              </p>
            </div>
          </details>
        </section>

        {/* ── 2 · Subí el comprobante ─────────────────────────── */}
        <section className="ev-stack" aria-labelledby="ev-h-paso2">
          <h2 className="ev-display ev-display--sm" id="ev-h-paso2">
            <span style={{ color: 'var(--ev-color-accent-text)' }}>2 ·</span> {c('evp.step2')}
          </h2>

          <div className="ev-uploader" aria-busy={uploading}>
            {/* Archivo descartado (formato o tamaño) */}
            {rejected && (
              <div className="ev-file-item ev-file-item--error" role="alert">
                <div className="ev-file-item__thumb" style={{ color: 'var(--ev-color-error)' }}><Icon name="file" size="lg" /></div>
                <div className="ev-file-item__info">
                  <p className="ev-file-item__name">{rejected.name}</p>
                  <p className="ev-file-item__meta" style={{ color: 'var(--ev-color-error)', fontFamily: 'var(--ev-font-sans)', fontSize: 'var(--ev-text-sm)' }}>
                    {rejected.kind === 'size'
                      ? c('evp.errSize', { size: sizeMb(rejected.size), max: sizeMb(MAX_BYTES) })
                      : t('pago.errorType')}
                  </p>
                </div>
                <button type="button" className="ev-icon-btn" aria-label={c('evp.removeFile')} onClick={removeFile}><Icon name="trash" /></button>
              </div>
            )}

            {/* Archivo elegido / subiendo / enviado */}
            {chosen && (
              <div
                className={`ev-file-item${done ? ' ev-file-item--done' : ''}`}
                aria-busy={uploading}
              >
                <div className="ev-file-item__thumb" style={done ? { color: 'var(--ev-color-success)' } : undefined}>
                  {preview ? <img src={preview} alt="" /> : <Icon name={done ? 'check-circle' : 'file'} size="lg" />}
                </div>
                <div className="ev-file-item__info">
                  <p className="ev-file-item__name">{file.name}</p>
                  {uploading && (
                    <div className="ev-progress ev-progress--indeterminate" role="progressbar" aria-label={c('evp.uploading')}>
                      <div className="ev-progress__bar" />
                    </div>
                  )}
                  <p className="ev-file-item__meta">
                    {sizeMb(file.size)} MB{!uploading && !done && ` · ${c('evp.ready')}`}
                  </p>
                </div>
                {!uploading && !done && (
                  <button type="button" className="ev-icon-btn" aria-label={c('evp.removeFile')} onClick={removeFile}><Icon name="trash" /></button>
                )}
              </div>
            )}

            {/* Zona de carga: reposo / arrastrando / con error */}
            {!uploading && !done && !alreadyConfirmed && (
              <label
                className={`ev-dropzone${dragging ? ' is-dragging' : ''}${rejected ? ' ev-dropzone--error' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  aria-describedby="ev-fmt"
                  onChange={handleFile}
                />
                <span className="ev-dropzone__icon" aria-hidden="true"><Icon name="upload" size="lg" /></span>
                <span className="ev-dropzone__title">
                  {dragging ? c('evp.drop') : rejected ? c('evp.chooseOther') : file ? t('pago.changeFile') : t('pago.uploadCta')}
                </span>
                <span className="ev-dropzone__formats">{c('evp.uploadHint')}</span>
                <span className="ev-dropzone__formats" id="ev-fmt">{t('pago.uploadTypes')}</span>
              </label>
            )}

            {/* Errores: tamaño/formato ya se muestran en el archivo; acá red y servidor */}
            <div role="alert" aria-live="assertive">
              {sendError?.kind === 'network' && (
                <div className="ev-banner ev-banner--error">
                  <Icon name="refresh" />
                  <div>
                    <p className="ev-banner__title">{c('evp.networkTitle')}</p>
                    <p className="ev-banner__text">{c('evp.networkText')}</p>
                  </div>
                  <div className="ev-banner__actions">
                    <button type="button" className="ev-btn ev-btn--secondary ev-btn--sm" onClick={handleUpload}>{c('evp.retry')}</button>
                  </div>
                </div>
              )}
              {sendError?.kind === 'message' && (
                <div className="ev-banner ev-banner--error">
                  <Icon name="alert-triangle" />
                  <div><p className="ev-banner__title">{sendError.message}</p></div>
                  <div className="ev-banner__actions">
                    <button type="button" className="ev-btn ev-btn--secondary ev-btn--sm" onClick={handleUpload}>{c('evp.retry')}</button>
                  </div>
                </div>
              )}
            </div>

            {alreadyConfirmed && (
              <div className="ev-banner ev-banner--success" role="status">
                <Icon name="check-circle" />
                <div><p className="ev-banner__title">{t('pago.alreadyConfirmed')}</p></div>
                <div className="ev-banner__actions">
                  <a className="ev-btn ev-btn--secondary ev-btn--sm" href={`/eventos/${slug}/gracias/${orderId}`}>{t('pago.seeOrder')}</a>
                </div>
              </div>
            )}

            {!done && !alreadyConfirmed && (
              <button
                type="button"
                className={`ev-btn ev-btn--primary ev-btn--lg ev-btn--block${uploading ? ' is-loading' : ''}`}
                onClick={handleUpload}
                disabled={!chosen}
                aria-disabled={uploading || undefined}
              >
                {uploading ? c('evp.sending') : t('pago.sendReceipt')}
              </button>
            )}
            {done && <p role="status" className="ev-chip ev-chip--confirmed"><Icon name="check-circle" />{t('pago.receiptReceived')}</p>}
          </div>

          {uploading && <p className="ev-subtle">{c('evp.dontClose')}</p>}
        </section>
      </div>
    </main>
  )
}
