import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
vi.mock("@/app/voces/components/I18n", () => ({ useI18n: () => ({ t: (k: string) => k }) }));
import AudioPlayer from "@/app/voces/components/AudioPlayer";

// jsdom no implementa media: simulamos load/play/pause. load() sobre un play()
// pendiente lo aborta, igual que un navegador real (AbortError).
const state = new WeakMap<HTMLMediaElement, { paused: boolean; pending: ((e: Error) => void) | null; time: number }>();
const st = (el: HTMLMediaElement) => {
  let s = state.get(el);
  if (!s) { s = { paused: true, pending: null, time: 0 }; state.set(el, s); }
  return s;
};
let loadCalls = 0;
let playCalls = 0;

beforeEach(() => {
  loadCalls = 0;
  playCalls = 0;
  const P = HTMLMediaElement.prototype;
  Object.defineProperty(P, "paused", { configurable: true, get() { return st(this).paused; } });
  Object.defineProperty(P, "currentTime", { configurable: true, get() { return st(this).time; }, set(v) { st(this).time = v; } });
  P.load = function () {
    loadCalls++;
    const s = st(this);
    if (s.pending) { const rej = s.pending; s.pending = null; rej(new DOMException("aborted", "AbortError")); }
  };
  P.play = function () {
    playCalls++;
    const s = st(this);
    return new Promise<void>((resolve, reject) => {
      s.pending = reject;
      setTimeout(() => {
        if (s.pending !== reject) return;
        s.pending = null;
        s.paused = false;
        this.dispatchEvent(new Event("play"));
        resolve();
      }, 5);
    });
  };
  P.pause = function () {
    const s = st(this);
    if (s.paused) return;
    s.paused = true;
    this.dispatchEvent(new Event("pause"));
  };
});

afterEach(cleanup);

const SRC = "https://example.com/demo.mp3";
const btn = () => screen.getAllByRole("button")[0];
const label = () => btn().getAttribute("aria-label");
const wait = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

describe("AudioPlayer — precarga y reproducción", () => {
  it("(a) hover + focus + click casi simultáneos: un solo load() y reproduce", async () => {
    render(<AudioPlayer src={SRC} />);
    const before = label();
    await act(async () => {
      fireEvent.mouseEnter(btn());
      fireEvent.focus(btn());
      fireEvent.click(btn());
    });
    await wait(40);
    expect(loadCalls).toBe(1);
    expect(label()).not.toBe(before); // quedó en "Pausar", no en "Play"
    expect(document.querySelector("audio")!.paused).toBe(false);
  });

  it("(b) click solo, sin hover, reproduce", async () => {
    render(<AudioPlayer src={SRC} />);
    const before = label();
    await act(async () => { fireEvent.click(btn()); });
    await wait(40);
    expect(loadCalls).toBe(1);
    expect(label()).not.toBe(before);
  });

  it("(c) hover, espera y click reproduce", async () => {
    render(<AudioPlayer src={SRC} />);
    const before = label();
    await act(async () => { fireEvent.mouseEnter(btn()); });
    await wait(20);
    await act(async () => { fireEvent.click(btn()); });
    await wait(40);
    expect(loadCalls).toBe(1);
    expect(label()).not.toBe(before);
  });

  it("(d) pausa tras reproducir", async () => {
    render(<AudioPlayer src={SRC} />);
    const before = label();
    await act(async () => { fireEvent.click(btn()); });
    await wait(40);
    expect(label()).not.toBe(before);
    await act(async () => { fireEvent.click(btn()); });
    await wait(10);
    expect(label()).toBe(before);
    expect(document.querySelector("audio")!.paused).toBe(true);
  });

  it("(e) cambiar src resetea y permite precargar el nuevo", async () => {
    const { rerender } = render(<AudioPlayer src={SRC} />);
    await act(async () => { fireEvent.click(btn()); });
    await wait(40);
    expect(loadCalls).toBe(1);
    rerender(<AudioPlayer src="https://example.com/otro.mp3" />);
    await wait(10);
    const audio = document.querySelector("audio")!;
    expect(audio.paused).toBe(true);
    expect(audio.getAttribute("src")).toBeNull();
    await act(async () => { fireEvent.click(btn()); });
    await wait(40);
    expect(loadCalls).toBe(2);
    expect(audio.getAttribute("src")).toBe("https://example.com/otro.mp3");
    expect(audio.paused).toBe(false);
  });

  it("(f) al reproducir un segundo player, el primero se pausa", async () => {
    render(<><AudioPlayer src={SRC} /><AudioPlayer src="https://example.com/b.mp3" /></>);
    const [b1, b2] = screen.getAllByRole("button");
    const [a1, a2] = Array.from(document.querySelectorAll("audio"));
    await act(async () => { fireEvent.click(b1); });
    await wait(40);
    expect(a1.paused).toBe(false);
    await act(async () => { fireEvent.click(b2); });
    await wait(40);
    expect(a1.paused).toBe(true);
    expect(a2.paused).toBe(false);
  });

  it("(g) seek cambia currentTime", async () => {
    render(<AudioPlayer src={SRC} />);
    const range = screen.getByRole("slider") as HTMLInputElement;
    await act(async () => { fireEvent.change(range, { target: { value: "0" } }); });
    // max = dur = 0 en jsdom; fijamos duración para que el range acepte el valor
    range.max = "100";
    await act(async () => { fireEvent.change(range, { target: { value: "42" } }); });
    expect(document.querySelector("audio")!.currentTime).toBe(42);
  });
});
