import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";

// Ported from voces-bds's lib/castings.ts: locutor castings.
//  - supabaseAdmin -> supabase (this repo's single shared client, per
//    lib/supabase.ts / lib/voces-auth.ts convention).
//  - uid("cas") / uid("cs") / uid("cap") -> randomUUID() with the same
//    prefixes (matches app/api/voces/admin/register's `adm_${randomUUID()}`
//    convention already established in this repo).
//  - Bucket "casting-files" -> "voces-casting-files" (provisioned as public
//    in scripts/voces-schema.sql; no on-demand createBucket needed).
//  - Table "castings"/"casting_applications" -> "voces_castings"/"voces_casting_applications".

const STORAGE_BUCKET = "voces-casting-files";

export async function uploadCastingFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  folder: "scripts" | "videos" | "refs" | "audios"
): Promise<string> {
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
  const storagePath = `${folder}/${safeName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Storage upload: ${error.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export type CastingCriteria = {
  language?: string;
  accent?: string;
  gender?: string;
  styles?: string[];
  ages?: string[];
};

// Estados posibles de un casting (usados en reportes y en el panel).
export type VocesCastingStatus = "open" | "in_selection" | "closed" | "finished";
export type VocesCastingCurrency = "ARS" | "USD";

export type Casting = {
  id: string;
  title?: string;
  brief?: string;
  videoUrl?: string | null;
  scriptUrl?: string | null;
  referenceUrl?: string | null;
  deadline?: string | null;
  createdAt: string;
  shareId: string;
  criteria?: CastingCriteria;
  budget?: number | null;
  currency?: VocesCastingCurrency | null;
  status?: VocesCastingStatus | null;
  client?: string | null;
  mediaType?: string | null;
};

export type CastingApplication = {
  id: string;
  castingId: string;
  shareId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  country?: string;
  gender?: string;
  homeStudio?: boolean;
  onlineSessions?: boolean;
  audioUrl?: string | null;
  audioLinkOriginal?: string | null;
  selected?: boolean;
  selectedAt?: string | null;
  createdAt: string;
};

function castingFromRow(row: any): Casting {
  return {
    id: row.id,
    title: row.title ?? "",
    brief: row.brief ?? "",
    videoUrl: row.video_url ?? null,
    scriptUrl: row.script_url ?? null,
    referenceUrl: row.reference_url ?? null,
    deadline: row.deadline ?? null,
    createdAt: row.created_at,
    shareId: row.share_id,
    criteria: row.criteria ?? undefined,
    budget: row.budget ?? null,
    currency: row.currency ?? null,
    status: row.status ?? null,
    client: row.client ?? null,
    mediaType: row.media_type ?? null,
  };
}

function appFromRow(row: any): CastingApplication {
  return {
    id: row.id,
    castingId: row.casting_id,
    shareId: row.share_id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    country: row.country ?? "",
    gender: row.gender ?? "",
    homeStudio: row.home_studio ?? false,
    onlineSessions: row.online_sessions ?? false,
    audioUrl: row.audio_url ?? null,
    audioLinkOriginal: row.audio_link_original ?? null,
    selected: row.selected ?? false,
    selectedAt: row.selected_at ?? null,
    createdAt: row.created_at,
  };
}

// ── Castings ────────────────────────────────────────────────

export async function listCastings(): Promise<Casting[]> {
  const { data, error } = await supabase
    .from("voces_castings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(castingFromRow);
}

export async function getCasting(opts: { id?: string; shareId?: string }): Promise<Casting | null> {
  const q = supabase.from("voces_castings").select("*");
  const { data, error } = opts.id
    ? await q.eq("id", opts.id).maybeSingle()
    : await q.eq("share_id", opts.shareId!).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? castingFromRow(data) : null;
}

export async function createCasting(fields: {
  title: string;
  brief: string;
  videoUrl?: string | null;
  scriptUrl?: string | null;
  referenceUrl?: string | null;
  deadline?: string | null;
  criteria?: CastingCriteria;
  budget?: number | null;
  currency?: VocesCastingCurrency | null;
  status?: VocesCastingStatus | null;
  client?: string | null;
  mediaType?: string | null;
}): Promise<Casting> {
  const id = `cas_${randomUUID()}`;
  const shareId = `cs_${randomUUID()}`;
  const { data, error } = await supabase
    .from("voces_castings")
    .insert({
      id,
      title: fields.title,
      brief: fields.brief,
      video_url: fields.videoUrl ?? null,
      script_url: fields.scriptUrl ?? null,
      reference_url: fields.referenceUrl ?? null,
      deadline: fields.deadline ?? null,
      share_id: shareId,
      criteria: fields.criteria ?? null,
      budget: fields.budget ?? null,
      currency: fields.currency ?? null,
      status: fields.status ?? "open",
      client: fields.client ?? null,
      media_type: fields.mediaType ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return castingFromRow(data);
}

export async function updateCasting(id: string, fields: Partial<{
  title: string;
  brief: string;
  videoUrl: string | null;
  scriptUrl: string | null;
  referenceUrl: string | null;
  deadline: string | null;
  criteria: CastingCriteria | undefined;
  budget: number | null;
  currency: VocesCastingCurrency | null;
  status: VocesCastingStatus | null;
  client: string | null;
  mediaType: string | null;
}>): Promise<Casting> {
  const patch: Record<string, any> = {};
  if ("title" in fields) patch.title = fields.title;
  if ("brief" in fields) patch.brief = fields.brief;
  if ("videoUrl" in fields) patch.video_url = fields.videoUrl;
  if ("scriptUrl" in fields) patch.script_url = fields.scriptUrl;
  if ("referenceUrl" in fields) patch.reference_url = fields.referenceUrl;
  if ("deadline" in fields) patch.deadline = fields.deadline ?? null;
  if ("criteria" in fields) patch.criteria = fields.criteria ?? null;
  if ("budget" in fields) patch.budget = fields.budget ?? null;
  if ("currency" in fields) patch.currency = fields.currency ?? null;
  if ("status" in fields) patch.status = fields.status ?? null;
  if ("client" in fields) patch.client = fields.client ?? null;
  if ("mediaType" in fields) patch.media_type = fields.mediaType ?? null;
  const { data, error } = await supabase
    .from("voces_castings")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return castingFromRow(data);
}

export async function deleteCasting(id: string): Promise<void> {
  const { error } = await supabase.from("voces_castings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Applications ─────────────────────────────────────────────

export async function getApplications(opts: { castingId?: string; shareId?: string }): Promise<CastingApplication[]> {
  const q = supabase.from("voces_casting_applications").select("*").order("created_at", { ascending: false });
  const { data, error } = opts.castingId
    ? await q.eq("casting_id", opts.castingId)
    : await q.eq("share_id", opts.shareId!);
  if (error) throw new Error(error.message);
  return (data ?? []).map(appFromRow);
}

export async function createApplication(fields: {
  castingId: string;
  shareId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  country: string;
  gender?: string;
  homeStudio: boolean;
  onlineSessions: boolean;
  audioUrl?: string | null;
}): Promise<CastingApplication> {
  const id = `cap_${randomUUID()}`;
  const { data, error } = await supabase
    .from("voces_casting_applications")
    .insert({
      id,
      casting_id: fields.castingId,
      share_id: fields.shareId,
      first_name: fields.firstName,
      last_name: fields.lastName,
      phone: fields.phone,
      email: fields.email,
      country: fields.country,
      gender: fields.gender ?? null,
      home_studio: fields.homeStudio,
      online_sessions: fields.onlineSessions,
      audio_url: fields.audioUrl ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return appFromRow(data);
}

export async function updateApplicationAudioUrl(id: string, audioUrl: string, originalLink?: string): Promise<void> {
  const patch: Record<string, any> = { audio_url: audioUrl };
  if (originalLink) patch.audio_link_original = originalLink;
  const { error } = await supabase
    .from("voces_casting_applications")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setApplicationSelected(id: string, _castingId: string, selected: boolean): Promise<void> {
  // Se permiten múltiples locutores elegidos por casting (voces múltiples / varios personajes),
  // por lo que cada postulación se marca de forma independiente.
  const { error } = await supabase
    .from("voces_casting_applications")
    .update({ selected, selected_at: selected ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase.from("voces_casting_applications").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function applicationExists(shareId: string, email: string): Promise<boolean> {
  const { data } = await supabase
    .from("voces_casting_applications")
    .select("id")
    .eq("share_id", shareId)
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}
