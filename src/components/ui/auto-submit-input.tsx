"use client";

import { Input } from "@/components/ui/input";

/** Input/checkbox that submits its enclosing GET form on change. */
export function AutoSubmitInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      onChange={(event) => {
        props.onChange?.(event);
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
