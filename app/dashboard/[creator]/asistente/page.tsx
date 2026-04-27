"use client";

import { useState } from "react";

export default function AsistentePage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hola! Soy tu asistente de contenido. Puedo ayudarte a redactar captions, pensar ideas, analizar tendencias o responder preguntas sobre tu estrategia. ¿Por dónde empezamos?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    // Placeholder response (connect to AI API later)
    await new Promise((r) => setTimeout(r, 800));
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: "Estoy procesando tu solicitud. Pronto podrás conectar esta sección con la API de Claude para respuestas en tiempo real.",
      },
    ]);
    setLoading(false);
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
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-[0.82rem] leading-relaxed ${
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
              <div className="rounded-2xl bg-white/8 px-4 py-3 text-[0.82rem] text-white/40">
                Escribiendo...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="mt-4 shrink-0 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Pregunta o pide algo..."
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-[0.85rem] text-white placeholder-white/20 outline-none transition focus:border-white/22 focus:bg-white/7"
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
