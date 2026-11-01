import "server-only";

import { DataError } from "@/lib/data/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared zero-DDL upload bucket: `media` already grants staff INSERT/DELETE,
 * unlike `client-photos`.
 */
export const MEDIA_BUCKET = "media";
export const MAX_MEDIA_BYTES = 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadMediaImage(
  file: File,
  folder: string,
): Promise<{ url: string; path: string }> {
  const extension = EXTENSIONS[file.type];
  if (!extension) {
    throw new DataError("media.upload", "Sirf JPG, PNG ya WebP chalein.");
  }
  if (file.size > MAX_MEDIA_BYTES) {
    throw new DataError("media.upload", "Image 1 MB se choti honi chahiye.");
  }
  if (!/^[a-z0-9/_-]+$/i.test(folder)) {
    throw new DataError("media.upload", "Upload folder sahi nahi hai.");
  }

  const supabase = await createClient();
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new DataError("media.upload", error.message);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeMediaImages(paths: string[]) {
  if (!paths.length) return;
  const supabase = await createClient();
  await supabase.storage.from(MEDIA_BUCKET).remove(paths);
}

/** Full URLs pass through; legacy bucket-relative paths get the media host. */
export function resolveMediaUrl(
  value: string | null | undefined,
  supabaseUrl: string,
): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${path.replace(/^\/+/, "")}`;
}
