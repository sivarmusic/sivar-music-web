'use client'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/icons'

type Phase = 'ready' | 'scanning' | 'error'

/**
 * Escáner de QR de la puerta (tema claro de alto contraste). Misma lógica que el
 * escáner anterior: jsQR sobre el video de la cámara trasera, `onDecode` por ref
 * para que escribir en el campo manual no reinicie la cámara.
 * Devuelve el escenario y la barra de acciones como hijos directos del grid `.ev-door`.
 */
export default function DoorScanner({ onDecode, children }: { onDecode: (decoded: string) => void; children?: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('ready')
  const [error, setError] = useState('')
  const onDecodeRef = useRef(onDecode)
  useEffect(() => { onDecodeRef.current = onDecode }, [onDecode])

  useEffect(() => {
    if (phase !== 'scanning') return
    if (!videoRef.current || !canvasRef.current) return

    let active = true
    const video = videoRef.current
    const canvas = canvasRef.current

    function stopStream() {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    function decoded(data: string) {
      active = false
      stopStream()
      if (navigator.vibrate) navigator.vibrate(80)
      onDecodeRef.current(data)
    }

    async function start() {
      try {
        // Importar jsQR una sola vez antes de empezar el loop
        const { default: jsQR } = await import('jsqr')

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })

        if (!active) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        video.srcObject = stream
        await video.play()

        function scan() {
          if (!active) return
          if (video.readyState < 2 || !video.videoWidth) {
            rafRef.current = requestAnimationFrame(scan)
            return
          }

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(video, 0, 0)

          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(img.data, img.width, img.height)

          if (code?.data) {
            decoded(code.data)
            return
          }
          rafRef.current = requestAnimationFrame(scan)
        }

        rafRef.current = requestAnimationFrame(scan)
      } catch (e) {
        if (!active) return
        const msg = (e instanceof Error ? e.message : '').toLowerCase()
        setError(
          msg.includes('permission') || msg.includes('denied')
            ? 'Permiso de cámara denegado. Habilitalo en la configuración del navegador y recargá.'
            : msg.includes('notfound') || msg.includes('notreadable')
            ? 'No se encontró cámara disponible.'
            : 'No se pudo acceder a la cámara. Intentá recargar la página.'
        )
        setPhase('error')
      }
    }

    start()

    return () => {
      active = false
      stopStream()
    }
  }, [phase])

  if (phase === 'error') {
    return (
      <>
        <div className="ev-door__stage ev-door__stage--col">
          <div className="ev-door__stage-block" role="alert">
            <span className="ev-door-result__icon" aria-hidden="true"><Icon name="camera" /></span>
            <h1 className="ev-display ev-display--md">Necesito la cámara</h1>
            <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>{error}</p>
          </div>
          {children}
        </div>
        <div className="ev-door__actions">
          <button type="button" className="ev-door-btn" onClick={() => { setError(''); setPhase('ready') }}>
            <Icon name="refresh" />Reintentar
          </button>
        </div>
      </>
    )
  }

  if (phase === 'scanning') {
    return (
      <>
        <div className="ev-door__stage ev-door__stage--col">
          <div className="ev-viewfinder" role="group" aria-label="Vista de la cámara. Apuntá al QR de la entrada.">
            <video ref={videoRef} playsInline muted autoPlay />
            <canvas ref={canvasRef} hidden />
            <div className="ev-viewfinder__frame" />
            <div className="ev-viewfinder__line" />
            <p className="ev-viewfinder__hint">Apuntá al QR</p>
          </div>
          {children}
        </div>
        <div className="ev-door__actions">
          <p className="ev-door__status" role="status"><Icon name="camera" /> Cámara activa · buscando código</p>
          <button type="button" className="ev-door-btn ev-door-btn--light" onClick={() => { setPhase('ready'); setError('') }}>
            Cancelar escaneo
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="ev-door__stage ev-door__stage--col">
        <div className="ev-door__stage-block">
          <span className="ev-door-result__icon" aria-hidden="true"><Icon name="scan" /></span>
          <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            Activá la cámara para escanear el QR de la entrada del asistente
          </p>
        </div>
        {children}
      </div>
      <div className="ev-door__actions">
        <button type="button" className="ev-door-btn" onClick={() => setPhase('scanning')}>
          <Icon name="camera" />Activar cámara
        </button>
      </div>
    </>
  )
}
