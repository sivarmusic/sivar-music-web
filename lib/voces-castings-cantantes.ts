import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import type { VocesCastingStatus, VocesCastingCurrency } from "@/lib/voces-castings";

// Ported from voces-bds's lib/cantantes-castings.ts: mismo patrón que
// lib/voces-castings.ts (locutores) pero sobre voces_castings_cantantes /
// voces_casting_cantante_applications. Mismo bucket voces-casting-files,
// distintas carpetas (prefijo cantante-*).

const STORAGE_BUCKET = "voces-casting-files";

export async function uploadCantanteCastingFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  folder: "cantante-scripts" | "cantante-videos" | "cantante-refs" | "cantante-audios"
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

// ── Types ──────────────────────────────────────────────────────

export type CantanteCastingCriteria = {
  styles?: string[];
  country?: string;
  gender?: string;
  vocalRange?: string;
};

export type CastingAttachment = {
  label: string;
  url: string;
};

export type CantanteCasting = {
  id: string;
  title?: string;
  brief?: string;
  videoUrl?: string | null;
  scriptUrl?: string | null;
  referenceUrl?: string | null;
  attachments?: CastingAttachment[];
  deadline?: string | null;
  createdAt: string;
  shareId: string;
  criteria?: CantanteCastingCriteria;
  budget?: number | null;
  currency?: VocesCastingCurrency | null;
  status?: VocesCastingStatus | null;
  client?: string | null;
  mediaType?: string | null;
};

export type CantanteCastingApplication = {
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

// ── Helpers ────────────────────────────────────────────────────

function castingFromRow(row: any): CantanteCasting {
  return {
    id: row.id,
    title: row.title ?? "",
    brief: row.brief ?? "",
    videoUrl: row.video_url ?? null,
    scriptUrl: row.script_url ?? null,
    referenceUrl: row.reference_url ?? null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
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

function appFromRow(row: any): CantanteCastingApplication {
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

// ── Castings ────────────────────────────────────────────────────

export async function listCantantesCastings(): Promise<CantanteCasting[]> {
  const { data, error } = await supabase
    .from("voces_castings_cantantes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(castingFromRow);
}

export async function getCantanteCasting(
  opts: { id?: string; shareId?: string }
): Promise<CantanteCasting | null> {
  const q = supabase.from("voces_castings_cantantes").select("*");
  const { data, error } = opts.id
    ? await q.eq("id", opts.id).maybeSingle()
    : await q.eq("share_id", opts.shareId!).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? castingFromRow(data) : null;
}

export async function createCantanteCasting(fields: {
  title: string;
  brief: string;
  videoUrl?: string | null;
  scriptUrl?: string | null;
  referenceUrl?: string | null;
  attachments?: CastingAttachment[];
  deadline?: string | null;
  criteria?: CantanteCastingCriteria;
  budget?: number | null;
  currency?: VocesCastingCurrency | null;
  status?: VocesCastingStatus | null;
  client?: string | null;
  mediaType?: string | null;
}): Promise<CantanteCasting> {
  const id = `cac_${randomUUID()}`;
  const shareId = `ccs_${randomUUID()}`;
  const { data, error } = await supabase
    .from("voces_castings_cantantes")
    .insert({
      id,
      title: fields.title,
      brief: fields.brief,
      video_url: fields.videoUrl ?? null,
      script_url: fields.scriptUrl ?? null,
      reference_url: fields.referenceUrl ?? null,
      attachments: fields.attachments?.length ? fields.attachments : null,
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

export async function updateCantanteCasting(
  id: string,
  fields: Partial<{
    title: string;
    brief: string;
    videoUrl: string | null;
    scriptUrl: string | null;
    referenceUrl: string | null;
    attachments: CastingAttachment[];
    deadline: string | null;
    criteria: CantanteCastingCriteria | undefined;
    budget: number | null;
    currency: VocesCastingCurrency | null;
    status: VocesCastingStatus | null;
    client: string | null;
    mediaType: string | null;
  }>
): Promise<CantanteCasting> {
  const patch: Record<string, any> = {};
  if ("title" in fields) patch.title = fields.title;
  if ("brief" in fields) patch.brief = fields.brief;
  if ("videoUrl" in fields) patch.video_url = fields.videoUrl;
  if ("scriptUrl" in fields) patch.script_url = fields.scriptUrl;
  if ("referenceUrl" in fields) patch.reference_url = fields.referenceUrl;
  if ("attachments" in fields) patch.attachments = fields.attachments?.length ? fields.attachments : null;
  if ("deadline" in fields) patch.deadline = fields.deadline ?? null;
  if ("criteria" in fields) patch.criteria = fields.criteria ?? null;
  if ("budget" in fields) patch.budget = fields.budget ?? null;
  if ("currency" in fields) patch.currency = fields.currency ?? null;
  if ("status" in fields) patch.status = fields.status ?? null;
  if ("client" in fields) patch.client = fields.client ?? null;
  if ("mediaType" in fields) patch.media_type = fields.mediaType ?? null;
  const { data, error } = await supabase
    .from("voces_castings_cantantes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return castingFromRow(data);
}

export async function deleteCantanteCasting(id: string): Promise<void> {
  const { error } = await supabase
    .from("voces_castings_cantantes")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Applications ────────────────────────────────────────────────

export async function getCantanteApplications(
  opts: { castingId?: string; shareId?: string }
): Promise<CantanteCastingApplication[]> {
  const q = supabase
    .from("voces_casting_cantante_applications")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } = opts.castingId
    ? await q.eq("casting_id", opts.castingId)
    : await q.eq("share_id", opts.shareId!);
  if (error) throw new Error(error.message);
  return (data ?? []).map(appFromRow);
}

export async function createCantanteApplication(fields: {
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
}): Promise<CantanteCastingApplication> {
  const id = `cca_${randomUUID()}`;
  const { data, error } = await supabase
    .from("voces_casting_cantante_applications")
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

export async function updateCantanteApplicationAudioUrl(
  id: string,
  audioUrl: string,
  originalLink?: string
): Promise<void> {
  const patch: Record<string, any> = { audio_url: audioUrl };
  if (originalLink) patch.audio_link_original = originalLink;
  const { error } = await supabase
    .from("voces_casting_cantante_applications")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setCantanteApplicationSelected(
  id: string,
  selected: boolean
): Promise<void> {
  const { error } = await supabase
    .from("voces_casting_cantante_applications")
    .update({ selected, selected_at: selected ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCantanteApplication(id: string): Promise<void> {
  const { error } = await supabase
    .from("voces_casting_cantante_applications")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function cantanteApplicationExists(
  shareId: string,
  email: string
): Promise<boolean> {
  const { data } = await supabase
    .from("voces_casting_cantante_applications")
    .select("id")
    .eq("share_id", shareId)
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}
