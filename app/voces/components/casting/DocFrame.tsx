import type { ReactNode } from "react";

/** Marco de "claqueta" para el visor de documentos: integra el PDF al papel (cabecera mono + bloque desplazado). */
export default function DocFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cs-frame">
      <div className="cs-frame-in">
        <div aria-hidden="true" className="cs-frame-head cs-mono">
          <span>{label}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
