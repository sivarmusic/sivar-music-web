// Nombre de la cookie de sesión, aislado en su propio módulo SIN DEPENDENCIAS.
//
// proxy.ts corre en el runtime Edge, donde no existen `node:crypto` ni el
// cliente de Supabase. Si importara lib/voces-session.ts para leer esta
// constante, arrastraría los dos y el build del proxy rompería.
//
// Mismo patrón que voces-bds's lib/sessionCookie.ts.
export const VOCES_SESSION_COOKIE = "voces_session";
