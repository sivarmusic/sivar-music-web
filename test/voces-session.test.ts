import { describe, it, expect, beforeEach } from "vitest";
import {
  signSession,
  verifySessionToken,
  readCookie,
  VOCES_SESSION_COOKIE,
} from "@/lib/voces-session";

const SECRET_A = "a".repeat(32);
const SECRET_B = "b".repeat(32);

beforeEach(() => {
  process.env.VOCES_SESSION_SECRET = SECRET_A;
});

describe("firma de sesión", () => {
  it("hace round-trip del clientId", () => {
    const { token } = signSession("cli_123");
    expect(verifySessionToken(token)?.cid).toBe("cli_123");
  });

  it("rechaza una firma alterada", () => {
    const { token } = signSession("cli_123");
    const [body, sig] = token.split(".");
    const flipped = sig[0] === "A" ? "B" : "A";
    expect(verifySessionToken(`${body}.${flipped}${sig.slice(1)}`)).toBeNull();
  });

  it("rechaza un payload alterado — el caso que importa: escalar a otro usuario", () => {
    const { token } = signSession("cli_victima");
    const sig = token.slice(token.indexOf(".") + 1);
    const forjado = Buffer.from(JSON.stringify({ cid: "cli_admin", exp: Date.now() + 10_000 }))
      .toString("base64url");
    expect(verifySessionToken(`${forjado}.${sig}`)).toBeNull();
  });

  it("rechaza un token firmado con otro secreto (rotación revoca sesiones)", () => {
    const { token } = signSession("cli_123");
    process.env.VOCES_SESSION_SECRET = SECRET_B;
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rechaza un token vencido", () => {
    const vencido = Buffer.from(JSON.stringify({ cid: "cli_123", exp: Date.now() - 1 }))
      .toString("base64url");
    // Firmado de verdad: lo que lo invalida es el exp, no la firma.
    const { token } = signSession("cli_123");
    expect(verifySessionToken(token)).not.toBeNull();
    expect(verifySessionToken(`${vencido}.${token.split(".")[1]}`)).toBeNull();
  });

  it("falla cerrada si no hay VOCES_SESSION_SECRET", () => {
    const { token } = signSession("cli_123");
    delete process.env.VOCES_SESSION_SECRET;
    expect(verifySessionToken(token)).toBeNull();
    expect(() => signSession("cli_123")).toThrow(/VOCES_SESSION_SECRET/);
  });

  it("falla cerrada si el secreto es demasiado corto", () => {
    process.env.VOCES_SESSION_SECRET = "corto";
    expect(() => signSession("cli_123")).toThrow(/VOCES_SESSION_SECRET/);
  });

  it.each([null, undefined, "", "sinpunto", ".", "a.", ".b", "x".repeat(600)])(
    "rechaza token malformado: %p",
    (t) => expect(verifySessionToken(t as string)).toBeNull()
  );
});

describe("readCookie", () => {
  it("lee el valor exacto", () => {
    expect(readCookie(`${VOCES_SESSION_COOKIE}=abc; otra=1`, VOCES_SESSION_COOKIE)).toBe("abc");
  });

  it("tolera espacios y orden", () => {
    expect(readCookie(`otra=1;   ${VOCES_SESSION_COOKIE}=abc`, VOCES_SESSION_COOKIE)).toBe("abc");
  });

  // Estos son los casos que un chequeo ingenuo `cookie.includes("voces_session=1")`
  // resolvía mal: cualquier cookie que CONTUVIERA la subcadena daba positivo.
  it("no matchea un nombre de cookie que termina igual", () => {
    expect(readCookie(`evil_${VOCES_SESSION_COOKIE}=abc`, VOCES_SESSION_COOKIE)).toBeNull();
  });

  it("no matchea la subcadena dentro del valor de otra cookie", () => {
    expect(readCookie(`otra=${VOCES_SESSION_COOKIE}=abc`, VOCES_SESSION_COOKIE)).toBeNull();
  });

  it("devuelve null sin header", () => {
    expect(readCookie(null, VOCES_SESSION_COOKIE)).toBeNull();
  });
});
