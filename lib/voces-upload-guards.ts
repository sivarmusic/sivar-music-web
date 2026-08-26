// Restricciones compartidas para las subidas de audio en /voces.
//
// ISOMÓRFICO A PROPÓSITO: este módulo no importa nada de Node ni de Supabase,
// así que lo consumen tanto los route handlers como los formularios del
// cliente. Una sola fuente de verdad para la lista de formatos: si el cliente
// valida contra una lista y el server contra otra, el usuario pasa la
// validación del navegador y se come un rechazo del server sin entender por qué.
//
// POR QUÉ NO ALCANZA CON "EXIGIR AUTH":
// Varios de los endpoints de upload los consumen flujos anónimos por diseño
// — el alta pública de locutores (/voces/registro, /voces/actualizar-reel) y
// la postulación pública a castings (/voces/c/[id]/apply, /voces/cc/[id]/apply).
// Pedir sesión ahí rompería el funnel entero. Lo que sí se puede es dejar de
// firmar subidas arbitrarias: acotar la extensión, acotar la carpeta destino
// y, cuando hay un recurso de por medio, exigir que ese recurso exista.
//
// Copiado de voces-bds's lib/uploadGuards.ts — no hay nada específico de BDS
// acá, y REGISTRO_KINDS coincide con los valores que ya usa
// app/voces/registro/page.tsx y app/voces/actualizar-reel/page.tsx (demo,
// demo2, singer, reel-update).

// Formatos que la gente manda de verdad. aiff/aif entran porque salen de Pro
// Tools y Logic, que es con lo que graba media industria del doblaje; opus y
// webm porque son lo que produce una grabación hecha desde el navegador.
export const AUDIO_EXTS = [
  "mp3", "wav", "m4a", "aac", "ogg", "flac", "aiff", "aif", "opus", "webm",
] as const;

// Para mostrarle al usuario qué puede subir.
export const AUDIO_EXTS_LABEL = AUDIO_EXTS.join(", ");

// La extensión termina siendo parte de la ruta pública del archivo. Sin
// allowlist se podía subir cualquier cosa (.html, .svg, .js) a un bucket
// público.
//
// LÍMITE CONOCIDO — PENDIENTE, no bloqueante:
// Esto valida la extensión pedida, NO el contenido. El PUT va directo del
// navegador a Supabase Storage con la URL firmada, así que nuestro server
// nunca ve los bytes. Un archivo renombrado (por ejemplo un .html guardado
// como .mp3) queda alojado en un bucket público que se sirve bajo el dominio
// propio. Opciones a evaluar más adelante: (a) job posterior que valide el
// magic number y borre lo que no sea audio, (b) forzar Content-Type/
// Content-Disposition al servir, (c) proxear la subida y validar en tránsito.
export function safeAudioExt(raw: string | null): string | null {
  const ext = (raw || "mp3").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return (AUDIO_EXTS as readonly string[]).includes(ext) ? ext : null;
}

export function extOf(fileName: string): string {
  return (fileName.split(".").pop() || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function isAllowedAudioFile(fileName: string): boolean {
  return (AUDIO_EXTS as readonly string[]).includes(extOf(fileName));
}

// `kind` se usa como carpeta destino en registro/upload-url. Allowlist cerrada.
export const REGISTRO_KINDS = ["demo", "demo2", "singer", "reel-update"] as const;

export function safeKind(raw: string | null): string | null {
  const kind = (raw || "demo").replace(/[^a-zA-Z0-9_-]/g, "");
  return (REGISTRO_KINDS as readonly string[]).includes(kind) ? kind : null;
}

export function safeShareId(raw: string | null): string | null {
  const id = (raw || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return id.length >= 4 && id.length <= 128 ? id : null;
}
