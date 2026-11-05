"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import {
  isWritableTable,
  requireCatalogAdmin,
  type WritableTable,
} from "@/lib/catalog";

const TABLES_WITH_UPDATED_AT = new Set<WritableTable>([
  "llm_providers",
  "llm_models",
  "prompt_chain_mix",
  "terms",
  "images",
  "generation_examples",
]);

const IMAGE_BUCKET = "studio-images";
const FALLBACK_BUCKET = "avatars";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 4.5 * 1024 * 1024;

function revalidateCatalog() {
  revalidatePath("/prompts");
  revalidatePath("/terms");
  revalidatePath("/images");
  revalidatePath("/generations");
  revalidatePath("/models");
  revalidatePath("/security");
}

function cleanValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value ?? null;
}

function stamp(
  table: WritableTable,
  values: Record<string, unknown>,
  inserting: boolean
) {
  const next: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (key === "id" || key === "created_at") continue;
    next[key] = cleanValue(raw);
  }
  if (!inserting && TABLES_WITH_UPDATED_AT.has(table)) {
    next.updated_at = new Date().toISOString();
  }
  return next;
}

export async function createCatalogRowAction(
  table: WritableTable,
  values: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!isWritableTable(table)) {
    return { success: false, error: "This table is read-only." };
  }

  const supabase = await createClient();
  const payload = stamp(table, values, true);
  if (table === "allowed_signup_domains" && typeof payload.domain === "string") {
    payload.domain = payload.domain.toLowerCase().replace(/^@/, "");
  }
  if (table === "whitelisted_emails" && typeof payload.email === "string") {
    payload.email = payload.email.toLowerCase();
  }

  const { error } = await supabase.from(table).insert(payload);
  if (error) return { success: false, error: error.message };
  revalidateCatalog();
  return { success: true };
}

export async function updateCatalogRowAction(
  table: WritableTable,
  id: string,
  values: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!isWritableTable(table)) {
    return { success: false, error: "This table is read-only." };
  }

  const supabase = await createClient();
  const payload = stamp(table, values, false);
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: error?.message || "Update was rejected." };
  }
  revalidateCatalog();
  return { success: true };
}

export async function deleteCatalogRowAction(
  table: WritableTable,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!isWritableTable(table) || table === "prompt_chain_mix") {
    return { success: false, error: "This record cannot be deleted." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateCatalog();
  return { success: true };
}

export async function savePromptMixAction(input: {
  mixId: string;
  name: string;
  notes: string;
  is_active: boolean;
  entries: Array<{ chain_id: string; weight: number }>;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { error: mixError } = await supabase
    .from("prompt_chain_mix")
    .update({
      name: input.name.trim() || "Default mix",
      notes: input.notes.trim() || null,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.mixId);

  if (mixError) return { success: false, error: mixError.message };

  const { error: clearError } = await supabase
    .from("prompt_chain_mix_entries")
    .delete()
    .eq("mix_id", input.mixId);
  if (clearError) return { success: false, error: clearError.message };

  const rows = input.entries
    .filter((entry) => entry.chain_id)
    .map((entry) => ({
      mix_id: input.mixId,
      chain_id: entry.chain_id,
      weight: Number.isFinite(entry.weight) ? Math.max(0, entry.weight) : 1,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("prompt_chain_mix_entries")
      .insert(rows);
    if (insertError) return { success: false, error: insertError.message };
  }

  revalidateCatalog();
  return { success: true };
}

export async function createStudioImageAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const file = formData.get("image") as File | null;
    const remoteUrl = String(formData.get("image_url") || "").trim();
    const altText = String(formData.get("alt_text") || "").trim();
    const supabase = await createClient();

    let imageUrl = remoteUrl;
    let storagePath = remoteUrl;
    const userId = gate.userId!;

    if (file && file.size > 0) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return { success: false, error: "Use a JPG, PNG, WebP, or GIF." };
      }
      if (file.size > MAX_BYTES) {
        return { success: false, error: "Image must be under 4.5 MB." };
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = file.type.split("/")[1] || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const uploaded = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, bytes, { contentType: file.type, upsert: false });

      if (uploaded.error) {
        const fallbackPath = `studio/${path}`;
        const fallback = await supabase.storage
          .from(FALLBACK_BUCKET)
          .upload(fallbackPath, bytes, {
            contentType: file.type,
            upsert: false,
          });
        if (fallback.error) {
          return {
            success: false,
            error: uploaded.error.message || fallback.error.message,
          };
        }
        storagePath = fallbackPath;
        imageUrl = supabase.storage.from(FALLBACK_BUCKET).getPublicUrl(fallbackPath)
          .data.publicUrl;
      } else {
        storagePath = path;
        imageUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data
          .publicUrl;
      }
    } else if (!remoteUrl) {
      return { success: false, error: "Upload a file or paste an image URL." };
    }

    const { error } = await supabase.from("images").insert({
      user_id: userId,
      storage_path: storagePath,
      image_url: imageUrl,
      alt_text: altText,
    });
    if (error) return { success: false, error: error.message };
    revalidateCatalog();
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not save image.",
    };
  }
}

export async function updateStudioImageAction(input: {
  id: string;
  alt_text: string;
  image_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    alt_text: input.alt_text.trim(),
    updated_at: new Date().toISOString(),
  };
  if (input.image_url?.trim()) patch.image_url = input.image_url.trim();

  const { error } = await supabase.from("images").update(patch).eq("id", input.id);
  if (error) return { success: false, error: error.message };
  revalidateCatalog();
  return { success: true };
}

export async function deleteStudioImageAction(
  id: string,
  storagePath?: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  if (storagePath) {
    await supabase.storage.from(IMAGE_BUCKET).remove([storagePath]);
    await supabase.storage.from(FALLBACK_BUCKET).remove([storagePath]);
  }
  const { error } = await supabase.from("images").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateCatalog();
  return { success: true };
}
