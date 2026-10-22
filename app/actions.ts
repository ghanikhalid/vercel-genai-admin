"use server";

import { createClient } from "@/lib/supabaseServer";
import {
  loadAdminContext,
  readAdminOverlay,
  writeAdminOverlay,
} from "@/lib/adminData";
import {
  createPartFromBase64,
  createUserContent,
  GoogleGenAI,
} from "@google/genai";
import { revalidatePath } from "next/cache";

const CAPTION_BUCKET = "captioned-images";
const FALLBACK_BUCKET = "avatars";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 4.5 * 1024 * 1024;

const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

function getAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function parseCaption(raw: string) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { caption?: string };
    if (parsed.caption?.trim()) return parsed.caption.trim();
  } catch {
    // fall through
  }
  return cleaned.replace(/^["']|["']$/g, "").trim();
}

async function generateVisionCaption(
  bytes: Buffer,
  mimeType: string,
  styleHint?: string
): Promise<string> {
  const ai = getAi();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const styleClause = styleHint?.trim()
    ? `\nComedic direction / tone requested by the studio director: "${styleHint.trim()}".`
    : "";

  const prompt = `Look at this exact photograph. Write one caption that only works because of what is actually in the frame — a specific object, face, pose, setting, or accident of timing.${styleClause}

It must land as a joke or as painfully relatable humor. No generic lines that could sit on any photo. No hashtags, no quotation marks, no speaker labels.

Respond with JSON only:
{ "caption": "short caption, 12 words or fewer" }`;

  let responseText: string | null = null;
  let lastError: unknown = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: createUserContent([
          createPartFromBase64(bytes.toString("base64"), mimeType),
          prompt,
        ]),
        config: {
          responseMimeType: "application/json",
        },
      });
      if (res?.text) {
        responseText = res.text;
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!responseText) {
    const msg =
      lastError instanceof Error
        ? lastError.message
        : "Gemini could not inspect the image.";
    throw new Error(msg);
  }

  const caption = parseCaption(responseText).slice(0, 280);
  if (!caption) {
    throw new Error("Gemini returned an empty caption.");
  }
  return caption;
}

async function uploadToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
  bytes: Buffer,
  contentType: string
) {
  const first = await supabase.storage
    .from(CAPTION_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: true,
    });
  if (!first.error) {
    const { data } = supabase.storage.from(CAPTION_BUCKET).getPublicUrl(path);
    return { imageUrl: data.publicUrl, storagePath: path };
  }

  const fallbackPath = path.startsWith("captioned/")
    ? path
    : `captioned/${path}`;
  const second = await supabase.storage
    .from(FALLBACK_BUCKET)
    .upload(fallbackPath, bytes, {
      contentType,
      upsert: true,
    });
  if (second.error) {
    throw new Error(first.error.message || second.error.message);
  }
  const { data } = supabase.storage
    .from(FALLBACK_BUCKET)
    .getPublicUrl(fallbackPath);
  return { imageUrl: data.publicUrl, storagePath: fallbackPath };
}

function revalidateAllAdminRoutes() {
  revalidatePath("/");
  revalidatePath("/users");
  revalidatePath("/media");
  revalidatePath("/ratings");
}

export async function toggleUserSuperadminAction(
  targetUserId: string,
  nextValue: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await loadAdminContext();
    if (ctx.status !== "authorized" || !ctx.user || !ctx.data) {
      return { success: false, error: "Superadmin authorization required." };
    }

    if (!nextValue) {
      const remaining = ctx.data.profiles.filter(
        (p) => p.is_superadmin && p.id !== targetUserId
      ).length;
      if (remaining < 1) {
        return {
          success: false,
          error: "Keep at least one superadmin.",
        };
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        is_superadmin: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId)
      .select("id, is_superadmin")
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || "Could not update superadmin role.",
      };
    }

    if (data.is_superadmin !== nextValue) {
      return { success: false, error: "Role change was rejected." };
    }

    revalidateAllAdminRoutes();
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not update superadmin role.",
    };
  }
}

/**
 * CREATE AI Generated Media (`public.captioned_images`)
 * Supports uploading a new image file OR providing an image URL,
 * and either generating the caption via Gemini Vision AI or entering a custom caption.
 */
export async function createAdminMediaAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; caption?: string }> {
  try {
    const ctx = await loadAdminContext();
    if (ctx.status !== "authorized" || !ctx.user) {
      return { success: false, error: "Superadmin authorization required." };
    }

    const supabase = await createClient();
    const mode = String(formData.get("sourceMode") || "upload"); // "upload" | "url"
    const captionMode = String(formData.get("captionMode") || "ai"); // "ai" | "manual"
    const manualCaption = String(formData.get("caption") || "").trim();
    const styleHint = String(formData.get("styleHint") || "").trim();

    let imageUrl = "";
    let storagePath = "";
    let imageBytes: Buffer | null = null;
    let mimeType = "image/jpeg";

    if (mode === "upload") {
      const file = formData.get("image");
      if (!(file instanceof File) || file.size === 0) {
        return { success: false, error: "Select an image file to upload." };
      }
      if (!ALLOWED_TYPES.has(file.type)) {
        return {
          success: false,
          error: "Use a JPEG, PNG, WebP, or GIF image.",
        };
      }
      if (file.size > MAX_BYTES) {
        return {
          success: false,
          error: "Keep the image under 4.5 MB.",
        };
      }
      mimeType = file.type;
      imageBytes = Buffer.from(await file.arrayBuffer());
      const ext = file.type.split("/")[1] || "jpg";
      const path = `${ctx.user.id}/${Date.now()}.${ext}`;
      const uploaded = await uploadToStorage(supabase, path, imageBytes, file.type);
      imageUrl = uploaded.imageUrl;
      storagePath = uploaded.storagePath;
    } else {
      const rawUrl = String(formData.get("imageUrl") || "").trim();
      if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
        return {
          success: false,
          error: "Provide a valid http/https image URL.",
        };
      }
      imageUrl = rawUrl;
      storagePath =
        String(formData.get("storagePath") || "").trim() ||
        `external/${Date.now()}.jpg`;

      if (captionMode === "ai") {
        const res = await fetch(imageUrl);
        if (!res.ok) {
          return {
            success: false,
            error: `Could not fetch image from URL (${res.status}).`,
          };
        }
        const ct = res.headers.get("content-type") || "image/jpeg";
        mimeType = ct.split(";")[0].trim();
        imageBytes = Buffer.from(await res.arrayBuffer());
      }
    }

    let finalCaption = manualCaption;
    if (captionMode === "ai" || !finalCaption) {
      if (!imageBytes) {
        return {
          success: false,
          error: "Image bytes are required for Gemini Vision caption generation.",
        };
      }
      finalCaption = await generateVisionCaption(imageBytes, mimeType, styleHint);
    }

    finalCaption = finalCaption.slice(0, 280);
    if (!finalCaption) {
      return { success: false, error: "Caption cannot be empty." };
    }

    await supabase
      .from("profiles")
      .upsert({ id: ctx.user.id }, { onConflict: "id" });

    // Insert using the authenticated superadmin's user_id so standard RLS (`auth.uid() = user_id`) succeeds
    const { data: inserted, error: insertError } = await supabase
      .from("captioned_images")
      .insert({
        user_id: ctx.user.id,
        storage_path: storagePath,
        image_url: imageUrl,
        caption: finalCaption,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted) {
      const overlay = await readAdminOverlay(supabase);
      overlay.createdMediaFallback.unshift({
        id: crypto.randomUUID(),
        user_id: ctx.user.id,
        storage_path: storagePath,
        image_url: imageUrl,
        caption: finalCaption,
        created_at: new Date().toISOString(),
      });
      await writeAdminOverlay(supabase, overlay);
    }

    revalidateAllAdminRoutes();
    return { success: true, caption: finalCaption };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create AI media.",
    };
  }
}

/**
 * UPDATE AI Generated Media (`public.captioned_images`)
 */
export async function updateAdminMediaAction(input: {
  id: string;
  caption: string;
  image_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await loadAdminContext();
    if (ctx.status !== "authorized" || !ctx.user) {
      return { success: false, error: "Superadmin authorization required." };
    }

    const trimmedCaption = input.caption.trim().slice(0, 280);
    if (!trimmedCaption) {
      return {
        success: false,
        error: "Caption must be between 1 and 280 characters.",
      };
    }

    const supabase = await createClient();
    const updatePayload: { caption: string; image_url?: string } = {
      caption: trimmedCaption,
    };
    if (input.image_url?.trim()) {
      updatePayload.image_url = input.image_url.trim();
    }

    const { data: updatedRows } = await supabase
      .from("captioned_images")
      .update(updatePayload)
      .eq("id", input.id)
      .select("id");

    // Also persist in Admin Overlay so updates take effect even if `captioned_images_update_superadmin` RLS policy hasn't been added yet
    const overlay = await readAdminOverlay(supabase);
    overlay.mediaUpdates[input.id] = {
      caption: trimmedCaption,
      ...(input.image_url?.trim() ? { image_url: input.image_url.trim() } : {}),
      updated_at: new Date().toISOString(),
      updated_by: ctx.user.id,
    };
    const fbIdx = overlay.createdMediaFallback.findIndex((m) => m.id === input.id);
    if (fbIdx !== -1 && (!updatedRows || updatedRows.length === 0)) {
      overlay.createdMediaFallback[fbIdx].caption = trimmedCaption;
      if (input.image_url?.trim()) {
        overlay.createdMediaFallback[fbIdx].image_url = input.image_url.trim();
      }
    }
    await writeAdminOverlay(supabase, overlay);

    revalidateAllAdminRoutes();
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not update media.",
    };
  }
}

/**
 * Re-spin / Regenerate Caption for an existing AI Media item using Gemini Vision
 */
export async function regenerateMediaCaptionWithAiAction(input: {
  id: string;
  imageUrl: string;
  styleHint?: string;
}): Promise<{ success: boolean; caption?: string; error?: string }> {
  try {
    const ctx = await loadAdminContext();
    if (ctx.status !== "authorized" || !ctx.user) {
      return { success: false, error: "Superadmin authorization required." };
    }

    const res = await fetch(input.imageUrl);
    if (!res.ok) {
      return {
        success: false,
        error: `Could not fetch image for AI inspection (${res.status}).`,
      };
    }
    const contentType = (res.headers.get("content-type") || "image/jpeg")
      .split(";")[0]
      .trim();
    const bytes = Buffer.from(await res.arrayBuffer());

    const newCaption = await generateVisionCaption(
      bytes,
      ALLOWED_TYPES.has(contentType) ? contentType : "image/jpeg",
      input.styleHint
    );

    const updateRes = await updateAdminMediaAction({
      id: input.id,
      caption: newCaption,
    });
    if (!updateRes.success) {
      return { success: false, error: updateRes.error };
    }

    return { success: true, caption: newCaption };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "AI caption regeneration failed.",
    };
  }
}

/**
 * DELETE AI Generated Media (`public.captioned_images`)
 */
export async function deleteAdminMediaAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await loadAdminContext();
    if (ctx.status !== "authorized" || !ctx.user) {
      return { success: false, error: "Superadmin authorization required." };
    }

    const supabase = await createClient();

    await supabase.from("captioned_images").delete().eq("id", id);

    const overlay = await readAdminOverlay(supabase);
    if (!overlay.deletedMediaIds.includes(id)) {
      overlay.deletedMediaIds.push(id);
    }
    overlay.createdMediaFallback = overlay.createdMediaFallback.filter(
      (m) => m.id !== id
    );
    delete overlay.mediaUpdates[id];
    await writeAdminOverlay(supabase, overlay);

    revalidateAllAdminRoutes();
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete media.",
    };
  }
}
