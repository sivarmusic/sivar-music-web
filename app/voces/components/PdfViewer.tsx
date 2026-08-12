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
            effectiveScale = (containerWidth - 16) / viewportBase.width;
          }
          const viewport = page.getViewport({ scale: Math.max(0.5, Math.min(4, effectiveScale)) });
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const renderTask = page.render({ canvasContext: ctx, viewport });
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
  }, [safeSrc, scale, fitToWidth, renderKey]);

  return (
    <div className={className} style={style}>
      <div
        ref={containerRef}
        className="w-full h-[70vh] overflow-auto rounded-lg border bg-white"
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
