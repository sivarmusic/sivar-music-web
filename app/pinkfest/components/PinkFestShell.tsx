import Image from 'next/image'

export default function PinkFestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0a0008] overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/pinkfest/bg-texture.jpg"
          alt=""
          fill
          className="object-cover opacity-[0.18]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0008]/70 via-[#0a0008]/30 to-[#0a0008]/85" />
      </div>
      <div className="relative z-10 flex flex-col items-center min-h-screen px-5 py-10">
        {children}
        <p className="mt-auto pt-12 text-white/20 text-[10px] text-center">
          Sivar Music Group · 2025
        </p>
      </div>
    </div>
  )
}
