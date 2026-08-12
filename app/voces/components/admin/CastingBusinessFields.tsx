"use client";

// Ported from voces-bds's app/components/admin/CastingBusinessFields.tsx
// verbatim (pure presentational, no BDS-specific text). Shared by the
// locutor and cantante casting create/edit forms.

type Props = {
  budget: string;
  onBudget: (v: string) => void;
  currency: string;
  onCurrency: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  client: string;
  onClient: (v: string) => void;
  mediaType: string;
  onMediaType: (v: string) => void;
};

export const CASTING_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "open", label: "Abierto" },
  { value: "in_selection", label: "En selección" },
  { value: "closed", label: "Cerrado" },
  { value: "finished", label: "Finalizado" },
];

export const MEDIA_TYPE_OPTIONS = ["TV", "Digital", "Radio", "TV+Digital", "Otro"];

export default function CastingBusinessFields({
  budget, onBudget, currency, onCurrency, status, onStatus, client, onClient, mediaType, onMediaType,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Presupuesto</label>
        <input
          type="text"
          inputMode="numeric"
          value={budget}
          onChange={(e) => onBudget(e.target.value)}
          placeholder="Ej: 1800000"
          className="ds-input"
        />
      </div>
      <div>
        <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Moneda</label>
        <select value={currency} onChange={(e) => onCurrency(e.target.value)} className="ds-input" style={{ colorScheme: "dark" }}>
          <option value="">—</option>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Estado</label>
        <select value={status} onChange={(e) => onStatus(e.target.value)} className="ds-input" style={{ colorScheme: "dark" }}>
          {CASTING_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Tipo de medio</label>
        <select value={mediaType} onChange={(e) => onMediaType(e.target.value)} className="ds-input" style={{ colorScheme: "dark" }}>
          <option value="">—</option>
          {MEDIA_TYPE_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-[11px] font-[500] mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Cliente</label>
        <input
          type="text"
          value={client}
          onChange={(e) => onClient(e.target.value)}
          placeholder="Nombre del cliente"
          className="ds-input"
        />
      </div>
    </div>
  );
}
