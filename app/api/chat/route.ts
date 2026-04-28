import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCreatorBySlug } from "@/lib/creators";
import { javiiContext } from "@/lib/bibles/javii";
import { monicaContext } from "@/lib/bibles/monica";
import { vanessaContext } from "@/lib/bibles/vanessa";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

const bibles: Record<string, string> = {
  javii: javiiContext,
  monica: monicaContext,
  vanessa: vanessaContext,
};

type Msg = { role: "user" | "assistant"; text: string };

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("creator_session")?.value;
  const creator = session ? getCreatorBySlug(session) : null;

  if (!creator) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const bible = bibles[creator.slug];
  if (!bible) {
    return NextResponse.json({ error: "Sin biblia de marca configurada" }, { status: 400 });
  }

  const body = await req.json();
  const messages: Msg[] = body.messages ?? [];

  const systemPrompt = `Eres el asistente personal de contenido de ${creator.displayName}, un creador musical latinoamericano. Conoces a fondo su marca, estilo y estrategia. Tu trabajo es ayudarle a redactar captions, pensar ideas, analizar tendencias, planificar lanzamientos, resolver dudas de industria y darle perspectiva estratégica.

BIBLIA DE MARCA DEL CREADOR:
${bible}

REGLAS:
- Responde en español, en el tono y estilo del creador según la biblia
- Sé concreto y accionable — nada de respuestas genéricas
- Si te piden un texto (caption, guion, bio), entrégalo listo para copiar
- Si te piden ideas, dálas con hooks específicos, no temas vagos
- Si te piden estrategia, dá pasos concretos y numerados
- Mantén respuestas breves y directas a menos que se pida desarrollo
- Si la pregunta no tiene que ver con su marca/contenido/música/industria, redirige amablemente al tema`;

  // Convert messages to Gemini format (no role: "assistant", uses "model")
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Chat API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
