import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { AutoSubmitCheckbox } from "./auto-submit-checkbox";
import { AutoSubmitSelect } from "./auto-submit-select";
import { SearchableSelect } from "./searchable-select";

beforeAll(() => {
  // jsdom versions without requestSubmit still need the native fallback that
  // browsers provide for these wrappers.
  if (!HTMLFormElement.prototype.requestSubmit) {
    HTMLFormElement.prototype.requestSubmit = function requestSubmit() {
      this.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    };
  }
});

describe("jobs list auto-submit filters", () => {
  it("submits a native select on change", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <AutoSubmitSelect name="brand" defaultValue="">
          <option value="">All</option>
          <option value="7">Acme</option>
        </AutoSubmitSelect>
      </form>,
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("submits a checkbox on toggle", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <AutoSubmitCheckbox name="hide_delivered" value="1" />
      </form>,
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("falls back to click when pointer events are skipped", () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        value=""
        onChange={onChange}
        options={[{ value: "9", label: "Suresh" }]}
      />,
    );

    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Suresh" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("9");
  });

  it("commits a searchable option on pointer-down with the hidden value set", () => {
    let submitted: FormData | null = null;
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitted = new FormData(event.currentTarget);
    });
    render(
      <form onSubmit={onSubmit}>
        <SearchableSelect
          name="mechanic"
          submitOnChange
          options={[
            { value: "1", label: "Ramesh" },
            { value: "2", label: "Suresh" },
          ]}
        />
      </form>,
    );

    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.pointerDown(screen.getByRole("option", { name: "Suresh" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(submitted).not.toBeNull();
    expect(submitted!.get("mechanic")).toBe("2");
  });
});
