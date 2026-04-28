"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; text: string };

export default function AsistentePage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hola! Soy tu asistente de contenido. Puedo ayudarte a redactar captions, pensar ideas, analizar tendencias o responder preguntas sobre tu estrategia. ¿Por dónde empezamos?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setError("");
    const newMessages: Msg[] = [...messages, { role: "user", text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.filter((m, i) => !(i === 0 && m.role === "assistant")) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setMessages((m) => [...m, { role: "assistant", text: data.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar mensaje");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col pt-14 lg:h-screen lg:pt-0">
      <div className="mb-6 shrink-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
          IA
        </p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
          Asistente ◈
        </h1>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-white/8 bg-white/3 p-5"
      >
        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[0.82rem] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-white text-black"
                    : "bg-white/8 text-white/80"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl bg-white/8 px-4 py-3 text-[0.82rem] text-white/40">
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "150ms" }} />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-2.5">
          <p className="text-[0.7rem] text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="mt-4 shrink-0 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Pregunta o pide algo..."
          disabled={loading}
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-[0.85rem] text-white placeholder-white/20 outline-none transition focus:border-white/22 focus:bg-white/7 disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="rounded-2xl bg-white px-5 py-3.5 text-[0.78rem] font-black text-black transition hover:bg-white/90 disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}
