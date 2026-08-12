// Lightweight loader for PDF.js via CDN. Caches the promise to avoid duplicate loads.
//
// Ported verbatim from voces-bds's lib/pdfjs-loader.ts (no BDS branding, no
// npm dependency — loads pdf.js off a CDN at runtime, so nothing to add to
// package.json). Used by app/voces/components/PdfViewer.tsx.
export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('PDF.js requires a browser environment');
  const w = window as any;
  if (w.pdfjsLib) return w.pdfjsLib;
  if (w.__pdfjsLoadPromise) return w.__pdfjsLoadPromise;

  w.__pdfjsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Pinned version to ensure consistent API
    const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';
    script.src = `${base}/pdf.min.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      try {
        const lib = (window as any).pdfjsLib;
        if (!lib) throw new Error('pdfjsLib not found on window');
        lib.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.js`;
        resolve(lib);
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });

  return w.__pdfjsLoadPromise;
}
