import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pink Fest — Entradas',
  description: 'A beneficio de Fundación Hogar Felino · Beerhaus · 12 de julio · 4PM · Donación $10',
}

export default function PinkFestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
