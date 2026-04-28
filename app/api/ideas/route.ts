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
  const { platform = "todo", format = "todo", topic = "", count = 5 } = body;

  const platformInstruction =
    platform === "todo"
      ? "Las ideas pueden ser para cualquier plataforma (TikTok, Instagram Reels, Carrusel, Story). Incluye variedad."
      : platform === "instagram"
      ? "Las ideas deben ser específicamente para Instagram (Reels, Carruseles, Stories)."
      : "Las ideas deben ser específicamente para TikTok.";

  const formatInstruction =
    format === "todo"
      ? "Incluye variedad de formatos: Reel, Carrusel, Story, TikTok."
      : `El formato debe ser: ${format}.`;

  const topicInstruction = topic
    ? `El usuario quiere ideas sobre este tema o enfoque específico: "${topic}". Úsalo como punto de partida pero mantén la autenticidad de la marca.`
    : "Elige los temas que mejor encajen con los pilares de contenido de la marca.";

  const systemPrompt = `Eres un estratega de contenido especializado en artistas y creadores musicales latinoamericanos. Tu trabajo es generar ideas de contenido para redes sociales que sean específicas, accionables y auténticas a la identidad de cada creador.

BIBLIA DE MARCA DEL CREADOR:
${bible}

REGLAS PARA GENERAR IDEAS:
- Cada idea debe ser ESPECÍFICA y ACCIONABLE, no genérica
- Incluye un hook poderoso (los primeros 3 segundos que engancharán al viewer)
- El tono debe ser 100% consistente con la identidad del creador según la biblia
- Las ideas deben poder ejecutarse esta semana, no son conceptos lejanos
- Cada idea debe tener un ángulo único, no repetir fórmulas
- Responde SIEMPRE en español`;

  const userPrompt = `Genera exactamente ${count} ideas de contenido para redes sociales.

${platformInstruction}
${formatInstruction}
${topicInstruction}

Responde ÚNICAMENTE con un array JSON válido con este formato exacto, sin texto adicional antes ni después:

[
  {
    "title": "Título corto de la idea (máx 60 caracteres)",
    "hook": "El hook exacto que diría en los primeros 3 segundos del video o en el primer slide del carrusel",
    "format": "reel" | "carrusel" | "story" | "tiktok",
    "pillar": "nombre del pilar de contenido que trabaja esta idea",
    "angle": "El ángulo único o perspectiva que hace esta idea diferente a lo genérico (1-2 oraciones)",
    "keyIdeas": ["3-5 ideas clave que el contenido debe transmitir, una por elemento del array, en bullets cortos"],
    "script": "Guion completo y listo para grabar/leer, en primera persona. Debe seguir EXACTAMENTE la GUÍA DE ESTILO PARA GUIONES de la biblia (voseo, hooks específicos, estructura por bloques con encabezados conceptuales en mayúsculas, datos concretos, autoridad tranquila, negación+revelación, frases sentenciosas, CTA con una sola acción). Estructura: HOOK (5 seg, en cursiva entre comillas) + DESARROLLO con 2-4 bloques numerados o titulados + CTA final. Para reels/tiktok: 70-90 segundos hablados (~180-240 palabras). Para carruseles: 5-8 slides separados con --- SLIDE --- como divisor."
  }
]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 4096,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(errBody);
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({ error: "Error al parsear respuesta de IA" }, { status: 500 });
    }

    const ideas = JSON.parse(match[0]);
    return NextResponse.json({ ideas });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Ideas API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
