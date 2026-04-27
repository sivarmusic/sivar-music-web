import { NextRequest, NextResponse } from "next/server";
import { validateCredentials } from "@/lib/creators";

export async function POST(req: NextRequest) {
  const { slug, password } = await req.json();

  if (!slug || !password) {
    return NextResponse.json(
      { error: "Credenciales requeridas" },
      { status: 400 }
    );
  }

  const creator = validateCredentials(slug, password);

  if (!creator) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true, slug: creator.slug });

  response.cookies.set("creator_session", creator.slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: "/",
  });

  return response;
}
