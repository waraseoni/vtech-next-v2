"use client";

import { Loader2, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";

type LiveSearchInputProps = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  ariaLabel: string;
  id?: string;
  delay?: number;
  autoFocus?: boolean;
};

/**
 * Search box that live-updates the current route's query string. Reads the
 * enclosing <form> so every other filter (dates, status, hidden fields) stays
 * intact while the page resets to page 1.
 */
export function LiveSearchInput({
  name = "q",
  defaultValue = "",
  placeholder,
  ariaLabel,
  id,
  delay = 400,
  autoFocus,
}: LiveSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(defaultValue);
    }
  }, [defaultValue]);

  function navigateTo(next: string, force = false) {
    if (!force && next.trim() === defaultValue.trim()) return;
    const form = inputRef.current?.form;
    if (!form) return;
    const params = new URLSearchParams();
    new FormData(form).forEach((entry, key) => {
      if (key === "page" || typeof entry !== "string") return;
      const trimmed = entry.trim();
      if (trimmed) params.set(key, trimmed);
    });
    if (next.trim()) params.set(name, next.trim());
    else params.delete(name);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        maxLength={60}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pr-9 pl-9"
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            navigateTo(next);
          }, delay);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setValue("");
            if (timer.current) clearTimeout(timer.current);
            navigateTo("", true);
          }
        }}
      />
      {pending ? (
        <Loader2
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
