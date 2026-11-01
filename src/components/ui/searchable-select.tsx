"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  hint?: string;
  keywords?: string;
  disabled?: boolean;
};

type SearchableSelectProps = {
  options: SearchableOption[];
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

function filterOptions(
  options: SearchableOption[],
  query: string,
  selectedLabel: string,
): SearchableOption[] {
  const term = query.trim().toLowerCase();
  if (!term || term === selectedLabel.trim().toLowerCase()) return options;
  return options.filter((option) =>
    `${option.label} ${option.hint ?? ""} ${option.keywords ?? ""}`
      .toLowerCase()
      .includes(term),
  );
}

/**
 * Form-compatible combobox: type to filter, arrow keys to move, Enter to
 * pick. Submits the chosen value through a hidden input, so it can replace a
 * native <select> inside server-action forms.
 */
export function SearchableSelect({
  options,
  id,
  name,
  defaultValue = "",
  value,
  onChange,
  placeholder = "Search…",
  className,
  required,
  disabled,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: SearchableSelectProps) {
  const reactId = useId();
  const inputId = id ?? `combobox-${reactId}`;
  const listboxId = `${inputId}-listbox`;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [query, setQuery] = useState(
    () =>
      options.find((option) => option.value === (value ?? defaultValue))
        ?.label ?? "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedValue = isControlled ? value : internalValue;
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );
  const selectedLabel = selectedOption?.label ?? "";
  const filtered = filterOptions(options, query, selectedLabel);

  const lastDefault = useRef(defaultValue);
  const lastSelected = useRef(selectedValue);

  useEffect(() => {
    if (isControlled || lastDefault.current === defaultValue) return;
    lastDefault.current = defaultValue;
    if (document.activeElement === inputRef.current) return;
    setInternalValue(defaultValue);
    setQuery(
      options.find((option) => option.value === defaultValue)?.label ?? "",
    );
  }, [defaultValue, isControlled, options]);

  useEffect(() => {
    if (!isControlled || lastSelected.current === selectedValue) return;
    lastSelected.current = selectedValue;
    setQuery(selectedLabel);
  }, [isControlled, selectedLabel, selectedValue]);

  function optionId(index: number) {
    return `${inputId}-option-${index}`;
  }

  function openList() {
    setOpen(true);
    const index = filtered.findIndex(
      (option) => option.value === selectedValue,
    );
    setActiveIndex(index >= 0 ? index : 0);
  }

  function commit(next: string) {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setQuery(
      options.find((option) => option.value === next)?.label ?? selectedLabel,
    );
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (filtered.length) {
        setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (filtered.length) {
        setActiveIndex((index) => Math.max(0, index - 1));
      }
      return;
    }
    if (event.key === "Enter") {
      if (open) {
        event.preventDefault();
        const option = filtered[activeIndex];
        if (option) commit(option.value);
      }
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setQuery(selectedLabel);
      }
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      setQuery(selectedLabel);
    }
  }

  return (
    <div className="relative min-w-0">
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[activeIndex] ? optionId(activeIndex) : undefined
        }
        aria-required={required || undefined}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        maxLength={120}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={(event) => {
          event.currentTarget.select();
          openList();
        }}
        onBlur={() => {
          setOpen(false);
          setQuery(selectedLabel);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-input selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent py-1 pr-8 pl-3 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          className,
        )}
      />
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />

      {open ? (
        <div className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border p-1 shadow-md">
          {filtered.length ? (
            <ul role="listbox" id={listboxId} aria-label="Options">
              {filtered.map((option, index) => {
                const isSelected = option.value === selectedValue;
                return (
                  <li
                    key={option.value || "__empty"}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onPointerDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      if (!option.disabled) commit(option.value);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-sm",
                      index === activeIndex &&
                        "bg-accent text-accent-foreground",
                      isSelected && "font-medium",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {option.hint}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground px-2.5 py-2 text-sm">
              Koi option nahi mila.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
