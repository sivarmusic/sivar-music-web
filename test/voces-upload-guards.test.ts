import { describe, it, expect } from "vitest";
import {
  AUDIO_EXTS, safeAudioExt, safeKind, safeShareId, isAllowedAudioFile, extOf,
} from "@/lib/voces-upload-guards";

describe("allowlist de audio", () => {
  it.each(["mp3", "wav", "m4a", "aac", "ogg", "flac", "aiff", "aif"])(
    "acepta %s — formato que la gente manda de verdad",
    (ext) => expect(safeAudioExt(ext)).toBe(ext)
  );

  it("acepta formatos de grabación desde navegador", () => {
    expect(safeAudioExt("opus")).toBe("opus");
    expect(safeAudioExt("webm")).toBe("webm");
  });

  it("normaliza mayúsculas (Pro Tools exporta .AIFF)", () => {
    expect(safeAudioExt("AIFF")).toBe("aiff");
    expect(safeAudioExt("MP3")).toBe("mp3");
  });

  // El motivo de existir de la allowlist: el path va a un bucket público.
  it.each(["html", "svg", "js", "php", "exe", "pdf"])(
    "rechaza %s",
    (ext) => expect(safeAudioExt(ext)).toBeNull()
  );

  it("rechaza intentos de escapar el path", () => {
    expect(safeAudioExt("../../etc/passwd")).toBeNull();
    expect(safeAudioExt("mp3/../evil")).toBeNull();
  });

  it("cae a mp3 si no se pasa nada", () => {
    expect(safeAudioExt(null)).toBe("mp3");
  });
});

describe("isAllowedAudioFile — misma lista que usa el cliente", () => {
  it.each(["demo.mp3", "Demo Final.WAV", "reel.aiff", "voz.m4a", "grabacion.webm", "voz.opus"])(
    "acepta %s",
    (n) => expect(isAllowedAudioFile(n)).toBe(true)
  );

  it.each(["demo.wma", "reel.mp4", "foto.png", "sin-extension"])(
    "rechaza %s",
    (n) => expect(isAllowedAudioFile(n)).toBe(false)
  );

  it("toma la última extensión", () => {
    expect(extOf("mi.demo.final.mp3")).toBe("mp3");
  });

  // Cliente y server tienen que coincidir: si divergen, el usuario pasa la
  // validación del navegador y se come un rechazo sin explicación.
  it("cliente y server comparten exactamente la misma lista", () => {
    for (const ext of AUDIO_EXTS) {
      expect(isAllowedAudioFile(`x.${ext}`)).toBe(true);
      expect(safeAudioExt(ext)).toBe(ext);
    }
  });
});

describe("safeKind", () => {
  it.each(["demo", "demo2", "singer", "reel-update"])("acepta %s", (k) =>
    expect(safeKind(k)).toBe(k)
  );
  it("rechaza carpetas arbitrarias", () => {
    expect(safeKind("../../secretos")).toBeNull();
    expect(safeKind("loquesea")).toBeNull();
  });
});

describe("safeShareId", () => {
  it("acepta un shareId normal", () => {
    expect(safeShareId("sh_d5az62gmk8amrv27zz1")).toBe("sh_d5az62gmk8amrv27zz1");
  });
  it("rechaza vacío, corto y desmedido", () => {
    expect(safeShareId(null)).toBeNull();
    expect(safeShareId("ab")).toBeNull();
    expect(safeShareId("x".repeat(200))).toBeNull();
  });
  it("descarta separadores de path", () => {
    expect(safeShareId("../../etc")).toBeNull();
  });
});
