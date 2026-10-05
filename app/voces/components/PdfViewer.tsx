"use client";
import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { loadPdfJs } from "@/lib/voces-pdfjs-loader";

// Ported from voces-bds's app/components/PdfViewer.tsx: lib/pdfjs-loader -> lib/voces-pdfjs-loader.
// No BDS branding in this file to begin with.

type Props = {
  src: string;
  className?: string;
  style?: CSSProperties;
  initialScale?: number; // default 1.0
  fitToWidth?: boolean;  // default true
  fallbackHref?: string; // external link if render fails
};

export default function PdfViewer({
  src,
  className,
  style,
  initialScale = 1,
  fitToWidth = true,
  fallbackHref,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale] = useState<number>(initialScale);
  const [renderKey] = useState(0); // reserved for future rerenders
  // Zoom y pantalla completa: solo cambian el ancho al que se dibujan las
  // páginas (el contenedor scrollea en ambos ejes). No tocan la carga del PDF.
  const ZOOM_STEPS = [1, 1.5, 2, 3];
  const [zoomIdx, setZoomIdx] = useState(0);
  const [full, setFull] = useState(false);
  const zoom = ZOOM_STEPS[zoomIdx];

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [full]);

  const safeSrc = useMemo(() => src || "", [src]);

  useEffect(() => {
    if (!safeSrc) return;
    let cancelled = false;
    let pdfDoc: any = null;
    let pageRenderTasks: Array<{ cancel: () => void }> = [];

    const clearContainer = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };

    const cleanup = () => {
      try {
        pageRenderTasks.forEach((t) => t.cancel());
        pageRenderTasks = [];
      } catch {}
      try {
        pdfDoc?.destroy?.();
      } catch {}
    };

    (async () => {
      setLoading(true);
      setError(null);
      clearContainer();
      try {
        const pdfjsLib = await loadPdfJs();
        if (cancelled) return;
        const params: any = { url: safeSrc };
        // withCredentials solo para rutas internas; las URLs externas (Supabase Storage, etc.) no lo soportan
        if (safeSrc.startsWith("/")) params.withCredentials = true;
        const loadingTask = pdfjsLib.getDocument(params);
        const doc = await loadingTask.promise;
        if (cancelled) {
          try { doc.destroy(); } catch {}
          return;
        }
        pdfDoc = doc;
        setNumPages(doc.numPages);

        // Render pages sequentially as canvases
        const container = containerRef.current;
        if (!container) return;
        const containerWidth = container.clientWidth || 800;
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;
          const holder = document.createElement("div");
          holder.className = "mb-4 last:mb-0";
          const canvas = document.createElement("canvas");
          canvas.oncontextmenu = (e) => e.preventDefault();
          canvas.style.display = "block";
          canvas.style.background = "white";
          holder.appendChild(canvas);
          container.appendChild(holder);

          const page = await doc.getPage(i);
          const viewportBase = page.getViewport({ scale: 1 });
          let effectiveScale = scale;
          if (fitToWidth) {
            effectiveScale = ((containerWidth - 16) / viewportBase.width) * zoom;
          } else {
            effectiveScale = scale * zoom;
          }
          const viewport = page.getViewport({ scale: Math.max(0.5, Math.min(6, effectiveScale)) });
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          // Nitidez en pantallas de alta densidad: el bitmap se dibuja a
          // resolución de dispositivo (DPR) y se muestra al tamaño CSS. Sin
          // esto el navegador estira un bitmap de baja resolución y se ve
          // borroso en móvil. Se limita el DPR y el total de píxeles para no
          // pasar el máximo de canvas de iOS Safari (~16.7M px).
          const MAX_CANVAS_PIXELS = 16_000_000;
          let outputScale = Math.min(window.devicePixelRatio || 1, 3);
          const cssPixels = viewport.width * viewport.height;
          if (cssPixels * outputScale * outputScale > MAX_CANVAS_PIXELS) {
            outputScale = Math.max(1, Math.sqrt(MAX_CANVAS_PIXELS / cssPixels));
          }
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          const renderTask = page.render({
            canvasContext: ctx,
            viewport,
            transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          });
          const taskWrap = { cancel: () => { try { (renderTask as any).cancel?.(); } catch {} } };
          pageRenderTasks.push(taskWrap);
          await renderTask.promise.catch(() => {});
        }
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "No se pudo cargar el PDF");
          setLoading(false);
        }
      }

      return () => cleanup();
    })();

    return () => {
      cancelled = true;
    };
  }, [safeSrc, scale, fitToWidth, renderKey, zoom, full]);

  const btn = "ds-btn-secondary text-[12px] py-1.5 px-3 min-h-[44px] min-w-[44px]";

  return (
    <div
      className={full ? "fixed inset-0 z-[200] flex flex-col p-3 gap-2" : className}
      style={full ? { background: "var(--color-bg-base, #fff)" } : { minWidth: 0, maxWidth: "100%", ...style }}
    >
      {safeSrc && !error ? (
        <div className="flex items-center justify-end gap-2 mb-2" role="toolbar" aria-label="Controles del documento">
          <button type="button" className={btn} aria-label="Reducir zoom" disabled={zoomIdx === 0}
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}>−</button>
          <span className="text-[12px] tabular-nums min-w-[3ch] text-center" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className={btn} aria-label="Aumentar zoom" disabled={zoomIdx === ZOOM_STEPS.length - 1}
            onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}>+</button>
          <button type="button" className={btn} onClick={() => setFull((f) => !f)}>
            {full ? "Cerrar" : "Pantalla completa"}
          </button>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={`w-full overflow-auto rounded-lg border bg-white ${full ? "flex-1 min-h-0" : "h-[70vh]"}`}
        style={{ touchAction: "pan-x pan-y pinch-zoom", minWidth: 0, maxWidth: "100%", contain: "inline-size" }}
        onContextMenu={(e) => e.preventDefault()}
      />

      {loading && !error ? (
        <p className="mt-2 text-sm text-gray-600">Cargando documento…</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-600">
          No se pudo cargar el visor. {fallbackHref ? (
            <a href={fallbackHref} target="_blank" className="underline">Abrilo aquí</a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
