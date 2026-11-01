"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";

import {
  addJobImagesAction,
  deleteJobImageAction,
  type JobActionState,
} from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressPhoto } from "@/lib/images";

const initialState: JobActionState = { error: null };

export function JobImages({
  jobId,
  images,
}: {
  jobId: number;
  images: Array<{ id: number; url: string }>;
}) {
  const [addState, addAction, adding] = useActionState(
    addJobImagesAction,
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteJobImageAction,
    initialState,
  );

  async function prepareFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []).slice(0, 5);
    if (!files.length) return;
    try {
      const transfer = new DataTransfer();
      for (const file of files) transfer.items.add(await compressPhoto(file));
      input.files = transfer.files;
    } catch {
      input.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {images.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <li
              key={image.id}
              className="group relative overflow-hidden rounded-lg border"
            >
              <a href={image.url} target="_blank" rel="noreferrer">
                <Image
                  src={image.url}
                  alt="Job photo"
                  width={320}
                  height={240}
                  unoptimized
                  className="h-32 w-full object-cover"
                />
              </a>
              <form
                action={deleteAction}
                className="absolute top-1.5 right-1.5"
              >
                <input type="hidden" name="id" value={jobId} />
                <input type="hidden" name="image_id" value={image.id} />
                <Button
                  type="submit"
                  variant="destructive"
                  size="icon"
                  className="size-7"
                  aria-label="Delete photo"
                  disabled={deleting}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Abhi koi photo nahi.</p>
      )}

      <form action={addAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={jobId} />
        <Input
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={prepareFiles}
          className="h-auto max-w-72 py-1.5"
          aria-label="Add job photos"
        />
        <Button type="submit" variant="outline" size="sm" disabled={adding}>
          <ImagePlus className="size-4" aria-hidden />
          {adding ? "Uploading…" : "Add photos"}
        </Button>
      </form>

      {(addState.error ?? deleteState.error) ? (
        <p role="alert" className="text-destructive text-xs">
          {addState.error ?? deleteState.error}
        </p>
      ) : null}
    </div>
  );
}
