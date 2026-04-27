import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCreatorBySlug } from "@/lib/creators";
import { getCreatorStats, saveCreatorStats, type CreatorStats } from "@/lib/stats";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ creator: string }> }
) {
  const { creator: slug } = await params;
  const stats = await getCreatorStats(slug);
  return NextResponse.json(stats ?? {});
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ creator: string }> }
) {
  const { creator: slug } = await params;

  // Verify session — only the creator can update their own stats
  const cookieStore = await cookies();
  const session = cookieStore.get("creator_session")?.value;
  const creator = session ? getCreatorBySlug(session) : null;

  if (!creator || creator.slug !== slug) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body: CreatorStats = await req.json();
  body.updatedAt = new Date().toISOString();

  await saveCreatorStats(slug, body);
  return NextResponse.json({ ok: true });
}
