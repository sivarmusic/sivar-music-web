"use client";

// Botón "Generar Reporte" para el panel de admin. Abre el modal de rango
// y navega a /voces/admin/reportes con las fechas elegidas.
//
// Ported from voces-bds's app/components/reportes/GenerarReporteButton.tsx.
//  - Link: /admin/reportes -> /voces/admin/reportes.

import { useState } from "react";
import { useRouter } from "next/navigation";
import RangoModal from "./RangoModal";

export default function GenerarReporteButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={`ds-btn-primary px-4 py-2 text-[13px] inline-flex items-center gap-2 ${className}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <rect x="7" y="10" width="3" height="7" />
          <rect x="12" y="6" width="3" height="11" />
          <rect x="17" y="13" width="3" height="4" />
        </svg>
        Generar Reporte
      </button>
      <RangoModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={(desde, hasta) => {
          setOpen(false);
          router.push(`/voces/admin/reportes?desde=${desde}&hasta=${hasta}`);
        }}
      />
    </>
  );
}
