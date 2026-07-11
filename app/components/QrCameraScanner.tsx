'use client'
import { useEffect, useRef, useState } from 'react'

type Phase = 'ready' | 'scanning' | 'error'

export default function QrCameraScanner({ onDecode }: { onDecode: (decoded: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('ready')
  const [error, setError] = useState('')

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
      onDecode(data)
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
  }, [phase, onDecode])

  if (phase === 'scanning') {
    return (
      <div className="w-full max-w-sm mb-4">
        <video ref={videoRef} className="w-full rounded-2xl bg-black" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="hidden" />
        <button
          onClick={() => { setPhase('ready'); setError('') }}
          className="w-full mt-3 border border-white/15 text-white/50 hover:text-white rounded-2xl py-3 text-sm transition"
        >
          Cancelar escaneo
        </button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-2xl border border-red-400/25 bg-red-400/8 p-6 text-center">
          <p className="text-red-400 text-sm leading-relaxed">{error}</p>
        </div>
        <button
          onClick={() => { setError(''); setPhase('ready') }}
          className="w-full border border-white/15 text-white/60 hover:text-white rounded-2xl py-3 text-sm transition"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="rounded-3xl bg-white/5 border border-white/10 p-8 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#F472B6]/15 flex items-center justify-center text-3xl">
          📷
        </div>
        <p className="text-white/60 text-sm text-center leading-relaxed">
          Activá la cámara para escanear el QR de la entrada del asistente
        </p>
      </div>
      <button
        onClick={() => setPhase('scanning')}
        className="w-full bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.98] text-white font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-4 transition-all"
      >
        Activar cámara
      </button>
    </div>
  )
}
