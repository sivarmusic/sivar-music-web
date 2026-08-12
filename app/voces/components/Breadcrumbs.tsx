"use client";
import React from "react";

// Ported verbatim from voces-bds's app/components/Breadcrumbs.tsx (no BDS-specific
// text/paths in the original — items/hrefs are supplied by the caller).
type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items, className, showBack = true }: { items: Crumb[]; className?: string; showBack?: boolean }) {
  const onBack = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch {}
    window.location.href = "/voces";
  };
  return (
    <nav className={`flex items-center gap-2 text-sm ${className || ""}`} aria-label="Breadcrumb">
      {showBack && (
        <>
          <a href="#" onClick={onBack} className="text-blue-700 hover:underline">Volver</a>
          <span className="text-gray-300">|</span>
        </>
      )}
      {items.map((it, i) => (
        <React.Fragment key={`${it.label}-${i}`}>
          {i > 0 && <span className="text-gray-400">›</span>}
          {it.href ? (
            <a href={it.href} className="text-blue-700 hover:underline truncate max-w-[40ch] inline-block align-middle">{it.label}</a>
          ) : (
            <span className="text-gray-700 truncate max-w-[40ch] inline-block align-middle">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
