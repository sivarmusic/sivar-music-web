// Reglas de contraseña. Puro y sin dependencias, para poder testearlo y para
// que cliente y server validen exactamente lo mismo.
//
// Copiado verbatim de voces-bds's lib/password.ts — no hay nada específico
// de BDS acá.

export const MIN_PASSWORD_LENGTH = 10;

export type PasswordCheck = { ok: true } | { ok: false; error: string };

// Se valida la nueva contra la actual EN CLARO acá porque en este punto el
// usuario nos mandó las dos. La verificación de que la actual es correcta se
// hace aparte, con bcrypt contra el hash de su fila.
export function validateNewPassword(current: string, next: string): PasswordCheck {
  if (!current) return { ok: false, error: "Ingresá tu contraseña actual." };
  if (!next) return { ok: false, error: "Ingresá la contraseña nueva." };

  if (next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `La contraseña nueva necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (next === current) {
    return { ok: false, error: "La contraseña nueva tiene que ser distinta de la actual." };
  }
  if (next.trim() !== next) {
    return { ok: false, error: "La contraseña no puede empezar ni terminar con espacios." };
  }
  return { ok: true };
}
