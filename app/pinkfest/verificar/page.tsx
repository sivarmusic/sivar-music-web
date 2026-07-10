'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Phase = 'ready' | 'scanning' | 'error'

interface ManualTicket { ticket_number: number; qr_token: string; check_in_at: string | null }

export default function VerificarPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('ready')
  const [error, setError] = useState('')

  const [manualCode, setManualCode] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState('')
  const [manualOrder, setManualOrder] = useState<{ order_code: string; nombre: string; tickets: ManualTicket[] } | null>(null)

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

    function navigate(decoded: string) {
      active = false
      stopStream()
      if (navigator.vibrate) navigator.vibrate(80)
      try {
        const url = new URL(decoded)
        const token = url.pathname.split('/').filter(Boolean).pop()
        router.push(`/pinkfest/verificar/${token}`)
      } catch {
        router.push(`/pinkfest/verificar/${decoded}`)
      }
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
            navigate(code.data)
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
  }, [phase, router])

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = manualCode.trim()
    if (!code) return
    setManualLoading(true); setManualError(''); setManualOrder(null)
    try {
      const res = await fetch(`/api/pinkfest/verify-code/${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar el código')
      if (data.tickets.length === 1) {
        router.push(`/pinkfest/verificar/${data.tickets[0].qr_token}`)
        return
      }
      setManualOrder(data)
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'No se pudo verificar el código')
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0008] flex flex-col items-center px-4 pt-10 pb-10">
      <div className="text-center mb-8">
        <p className="text-[#F472B6] text-[10px] font-bold tracking-[0.28em] uppercase mb-2">
          Pink Fest
        </p>
        <h1 className="text-white text-2xl font-bold">Verificar entrada</h1>
        {phase === 'scanning' && (
          <p className="text-white/50 text-sm mt-1">Apuntá al código QR del asistente</p>
        )}
      </div>

      {/* Cámara — video + canvas oculto para procesar frames */}
      {phase === 'scanning' && (
        <div className="w-full max-w-sm mb-4">
          <video
            ref={videoRef}
            className="w-full rounded-2xl bg-black"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
          <button
            onClick={() => { setPhase('ready'); setError('') }}
            className="w-full mt-3 border border-white/15 text-white/50 hover:text-white rounded-2xl py-3 text-sm transition"
          >
            Cancelar escaneo
          </button>
        </div>
      )}

      {/* Pantalla inicial */}
      {phase === 'ready' && (
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
      )}

      {/* Error */}
      {phase === 'error' && (
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
      )}

      {/* Verificación manual — siempre disponible como respaldo si el QR falla o tarda */}
      <div className="w-full max-w-sm mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-white/25 text-[10px] font-bold uppercase tracking-wider">o ingresá el código</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-2">
          <input
            type="text"
            value={manualCode}
            onChange={e => { setManualCode(e.target.value); setManualError(''); setManualOrder(null) }}
            placeholder="Código de orden (ej: PF-0024)"
            autoCapitalize="characters"
            className="w-full bg-white/6 border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3.5 text-sm text-center tracking-wider focus:outline-none focus:border-[#F472B6]/50 transition"
          />
          <button
            type="submit"
            disabled={manualLoading || !manualCode.trim()}
            className="w-full bg-white/8 hover:bg-[#F472B6]/20 hover:text-[#F472B6] disabled:opacity-40 text-white/70 font-bold text-sm uppercase tracking-[0.18em] rounded-2xl py-3.5 transition-all"
          >
            {manualLoading ? 'Buscando...' : 'Verificar código'}
          </button>
        </form>

        {manualError && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 text-center mt-3">
            {manualError}
          </p>
        )}

        {manualOrder && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/4 p-4">
            <p className="text-white font-semibold text-sm">{manualOrder.nombre}</p>
            <p className="text-white/40 text-xs mb-3">{manualOrder.order_code} · elegí qué entrada verificar</p>
            <div className="space-y-2">
              {manualOrder.tickets.map(ticket => (
                <button
                  key={ticket.qr_token}
                  onClick={() => router.push(`/pinkfest/verificar/${ticket.qr_token}`)}
                  className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 text-sm transition"
                >
                  <span className="text-white/80">Entrada {ticket.ticket_number}</span>
                  {ticket.check_in_at
                    ? <span className="text-red-400 text-xs font-semibold">Ya ingresó</span>
                    : <span className="text-green-400 text-xs font-semibold">Pendiente →</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => router.push('/pinkfest/admin')}
        className="mt-10 text-white/30 hover:text-white text-sm transition"
      >
        ← Volver al admin
      </button>
    </div>
  )
}
