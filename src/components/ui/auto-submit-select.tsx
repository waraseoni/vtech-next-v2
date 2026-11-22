"use client";

import { Select } from "@/components/ui/select";

/**
 * Native select that submits its enclosing GET form as soon as the choice
 * changes. Used by the jobs list filters so every dropdown is immediately
 * actionable instead of waiting for a separate Filter click.
 */
export function AutoSubmitSelect(props: React.ComponentProps<typeof Select>) {
  return (
    <Select
      {...props}
      onChange={(event) => {
        props.onChange?.(event);
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
