"use client";

import Image from "next/image";
import { useState } from "react";

import { clientInitials } from "@/lib/domain/client";
import { cn } from "@/lib/utils";

type ClientAvatarProps = {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
};

export function ClientAvatar({
  name,
  src,
  size = 48,
  className,
}: ClientAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "bg-primary/10 text-primary grid shrink-0 place-items-center rounded-full font-semibold",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      >
        {clientInitials(name)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
