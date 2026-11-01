export const MAX_CLIENT_PHOTO_BYTES = 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Client-side compress before upload: long edge ≤1200px, WebP q0.82.
 * Small/unsupported files are returned untouched so the server can validate.
 */
export async function compressPhoto(file: File): Promise<File> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Sirf JPG, PNG ya WebP photo chalein.");
  }
  if (file.size <= 300 * 1024) return file;
  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  if (!blob) return file;

  const compressed = new File(
    [blob],
    `${file.name.replace(/\.[^.]+$/, "") || "photo"}.webp`,
    { type: "image/webp" },
  );
  return compressed.size < file.size ? compressed : file;
}
