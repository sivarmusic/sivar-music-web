import { describe, it, expect } from "vitest";
import { validateNewPassword, MIN_PASSWORD_LENGTH } from "@/lib/voces-password";

const OK = "un-secreto-largo-1";

describe("validateNewPassword", () => {
  it("acepta una contraseña válida y distinta", () => {
    expect(validateNewPassword("la-actual-123", OK)).toEqual({ ok: true });
  });

  it("exige la contraseña actual", () => {
    expect(validateNewPassword("", OK)).toMatchObject({ ok: false });
  });

  it("exige la nueva", () => {
    expect(validateNewPassword("la-actual-123", "")).toMatchObject({ ok: false });
  });

  it(`rechaza menos de ${MIN_PASSWORD_LENGTH} caracteres`, () => {
    const corta = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const r = validateNewPassword("la-actual-123", corta);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it(`acepta exactamente ${MIN_PASSWORD_LENGTH}`, () => {
    expect(validateNewPassword("la-actual-123", "a".repeat(MIN_PASSWORD_LENGTH))).toEqual({ ok: true });
  });

  // El punto del endpoint: que quien asignó la contraseña deje de conocerla.
  // Si "cambiar" admite repetir la misma, no cambió nada.
  it("rechaza que la nueva sea igual a la actual", () => {
    const r = validateNewPassword(OK, OK);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/distinta/i);
  });

  it("rechaza espacios al principio o al final", () => {
    expect(validateNewPassword("la-actual-123", ` ${OK}`).ok).toBe(false);
    expect(validateNewPassword("la-actual-123", `${OK} `).ok).toBe(false);
  });

  it("permite espacios internos (las passphrases son buenas)", () => {
    expect(validateNewPassword("la-actual-123", "caballo correcto grapa")).toEqual({ ok: true });
  });
});
