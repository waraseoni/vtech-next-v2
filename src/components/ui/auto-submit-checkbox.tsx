"use client";

/** Bare checkbox that submits its enclosing GET form when toggled. */
export function AutoSubmitCheckbox(props: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      {...props}
      onChange={(event) => {
        props.onChange?.(event);
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
