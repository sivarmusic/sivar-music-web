"use client";

// Primitivos visuales del reporte: charts livianos en SVG/CSS (sin dependencias),
// KPIs, tablas, skeletons y estado vacío. Todo presentacional.
//
// Ported verbatim from voces-bds's app/components/reportes/primitives.tsx,
// only the format.ts import path changed.

import { useState } from "react";
import { fmtNum } from "@/lib/voces-reportes/format";

export const ACCENT = "#e84c2b";   // locutores / primary
export const SECOND = "#4c9be8";   // cantantes / secondary
const GRID = "rgba(255,255,255,0.07)";
const TEXT_MUTED = "rgba(240,237,232,0.30)";
const TEXT_SECOND = "rgba(240,237,232,0.50)";

// ── Layout ───────────────────────────────────────────────────────

export function Section({
  title, description, note, children,
}: { title: string; description?: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-[18px] font-[600]" style={{ color: "var(--color-text-primary)" }}>{title}</h2>
        {description && <p className="text-[13px] mt-0.5" style={{ color: TEXT_SECOND }}>{description}</p>}
        {note && (
          <p className="text-[11px] mt-1.5 inline-block px-2 py-0.5 rounded" style={{ color: TEXT_MUTED, background: "rgba(255,255,255,0.04)" }}>
            ⚠ {note}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`ds-card p-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-[500] mb-3" style={{ color: TEXT_SECOND }}>{children}</h3>;
}

// ── KPI ──────────────────────────────────────────────────────────

export function KpiCard({
  label, value, sub, accent = false,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className="ds-card p-4 flex flex-col justify-between"
      style={accent ? { borderColor: "var(--color-accent-border)", background: "var(--color-accent-bg)" } : undefined}
    >
      <span className="text-[11px] uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{label}</span>
      <span className="text-[26px] font-[600] mt-2 leading-none" style={{ color: accent ? ACCENT : "var(--color-text-primary)" }}>{value}</span>
      {sub && <span className="text-[12px] mt-1.5" style={{ color: TEXT_SECOND }}>{sub}</span>}
    </div>
  );
}

// ── Bar chart (vertical, CSS) ────────────────────────────────────

export function BarChart({ data, color = ACCENT, height = 160 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  if (!data.length) return <EmptyMini />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center justify-end gap-1 min-w-[26px] flex-1" style={{ height: "100%" }} title={`${d.label}: ${fmtNum(d.value)}`}>
          <span className="text-[10px]" style={{ color: TEXT_SECOND }}>{d.value > 0 ? fmtNum(d.value) : ""}</span>
          <div className="w-full rounded-t" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0, background: color }} />
          <span className="text-[9px] whitespace-nowrap" style={{ color: TEXT_MUTED }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stacked bar (dos series) ─────────────────────────────────────

export function StackedBarChart({
  data, labelA, labelB, colorA = ACCENT, colorB = SECOND, height = 180,
}: { data: { label: string; a: number; b: number }[]; labelA: string; labelB: string; colorA?: string; colorB?: string; height?: number }) {
  if (!data.length) return <EmptyMini />;
  const max = Math.max(...data.map((d) => d.a + d.b), 1);
  return (
    <div>
      <Legend items={[{ label: labelA, color: colorA }, { label: labelB, color: colorB }]} />
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1 mt-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center justify-end min-w-[26px] flex-1" style={{ height: "100%" }} title={`${d.label} — ${labelA}: ${d.a} · ${labelB}: ${d.b}`}>
            <div className="w-full flex flex-col justify-end" style={{ height: "100%" }}>
              <div className="w-full" style={{ height: `${(d.b / max) * 100}%`, background: colorB }} />
              <div className="w-full rounded-t" style={{ height: `${(d.a / max) * 100}%`, background: colorA }} />
            </div>
            <span className="text-[9px] whitespace-nowrap mt-1" style={{ color: TEXT_MUTED }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line chart (SVG) ─────────────────────────────────────────────

export function LineChart({ data, color = ACCENT, height = 160 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  if (!data.length) return <EmptyMini />;
  const w = Math.max(data.length * 48, 320);
  const h = height;
  const pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="block">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={GRID} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.value)} r={3} fill={color} />
            <text x={x(i)} y={h - pad + 14} textAnchor="middle" fontSize={9} fill={TEXT_MUTED}>{d.label}</text>
            {d.value > 0 && <text x={x(i)} y={y(d.value) - 8} textAnchor="middle" fontSize={9} fill={TEXT_SECOND}>{fmtNum(d.value)}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Donut (SVG) ──────────────────────────────────────────────────

const PALETTE = [ACCENT, SECOND, "#e8b84c", "#6ee84c", "#b84ce8", "#4ce8c8", "#e84c9b"];

export function Donut({ data }: { data: { label: string; value: number }[] }) {
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyMini />;
  const r = 60, sw = 22, c = 2 * Math.PI * r, cx = 80, cy = 80;
  let offset = 0;
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg width={160} height={160}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {items.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * c;
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={sw}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={20} fontWeight={600} fill="var(--color-text-primary)">{fmtNum(total)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={10} fill={TEXT_MUTED}>total</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {items.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span style={{ color: TEXT_SECOND }}>{d.label}</span>
            <span style={{ color: "var(--color-text-primary)" }}>{fmtNum(d.value)}</span>
            <span style={{ color: TEXT_MUTED }}>({((d.value / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar list ──────────────────────────────────────────

export function HBarList({ data, color = ACCENT }: { data: { label: string; value: number }[]; color?: string }) {
  const items = data.filter((d) => d.value > 0);
  if (!items.length) return <EmptyMini />;
  const max = Math.max(...items.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-2">
      {items.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[12px] w-28 shrink-0 truncate" style={{ color: TEXT_SECOND }} title={d.label}>{d.label}</span>
          <div className="flex-1 h-4 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="h-full rounded" style={{ width: `${(d.value / max) * 100}%`, background: color, minWidth: 2 }} />
          </div>
          <span className="text-[12px] w-12 text-right shrink-0" style={{ color: "var(--color-text-primary)" }}>{fmtNum(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: TEXT_SECOND }}>
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ── Table (opcionalmente ordenable) ──────────────────────────────

export type Column<T> = {
  key: keyof T;
  header: string;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

export function DataTable<T extends Record<string, any>>({
  columns, rows, emptyMessage = "Sin datos", maxRows,
}: { columns: Column<T>[]; rows: T[]; emptyMessage?: string; maxRows?: number }) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [dir, setDir] = useState<1 | -1>(-1);

  let sorted = rows;
  if (sortKey) {
    sorted = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  if (maxRows) sorted = sorted.slice(0, maxRows);

  if (!rows.length) return <EmptyMini message={emptyMessage} />;

  const toggle = (k: keyof T) => {
    if (sortKey === k) setDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setDir(-1); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${GRID}` }}>
            {columns.map((c) => (
              <th
                key={String(c.key)}
                onClick={c.sortable ? () => toggle(c.key) : undefined}
                className={`py-2 px-3 font-[500] ${c.align === "right" ? "text-right" : "text-left"} ${c.sortable ? "cursor-pointer select-none" : ""}`}
                style={{ color: TEXT_MUTED, whiteSpace: "nowrap" }}
              >
                {c.header}{c.sortable && sortKey === c.key ? (dir === 1 ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} style={{ borderBottom: `0.5px solid ${GRID}` }}>
              {columns.map((c) => (
                <td key={String(c.key)} className={`py-2 px-3 ${c.align === "right" ? "text-right" : "text-left"}`} style={{ color: "var(--color-text-primary)" }}>
                  {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Skeleton & empty ─────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded animate-pulse ${className}`} style={{ background: "rgba(255,255,255,0.05)" }} />;
}

export function SectionSkeleton() {
  return (
    <div className="mb-10">
      <Skeleton className="h-5 w-48 mb-3" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="ds-card p-10 text-center">
      <div className="text-[15px] font-[500]" style={{ color: "var(--color-text-primary)" }}>{title}</div>
      <div className="text-[13px] mt-1.5" style={{ color: TEXT_SECOND }}>{message}</div>
    </div>
  );
}

export function EmptyMini({ message = "Sin datos en el rango" }: { message?: string }) {
  return <div className="text-[12px] py-6 text-center" style={{ color: TEXT_MUTED }}>{message}</div>;
}
