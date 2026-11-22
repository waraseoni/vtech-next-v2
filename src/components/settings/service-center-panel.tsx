"use client";

import { useActionState } from "react";

import {
  saveBrandAction,
  saveServiceCenterModeAction,
  saveServiceTypeAction,
  setBrandActiveAction,
  setServiceTypeActiveAction,
  type SettingsActionState,
} from "@/app/(app)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  BrandRow,
  ServiceCenterMode,
  ServiceTypeRow,
} from "@/lib/data/service-center";

const initial: SettingsActionState = { error: null };

const MODES: Array<{ value: ServiceCenterMode; label: string; hint: string }> =
  [
    {
      value: "autonomous",
      label: "Autonomous",
      hint: "Kisi brand se associate nahi — brand optional, global job numbers.",
    },
    {
      value: "single_brand",
      label: "Single brand",
      hint: "Ek authorized brand auto-fill, claim UI on.",
    },
    {
      value: "multi_brand",
      label: "Multi brand",
      hint: "Brand required, switcher + per-brand numbering (P4).",
    },
  ];

function Feedback({ state }: { state: SettingsActionState }) {
  if (!state.error && !state.message) return null;
  const tone = state.error ? "destructive" : "success";
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-sm ${
        tone === "destructive"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success"
      }`}
    >
      {state.error ?? state.message}
    </p>
  );
}

function ModeForm({
  mode,
  canEdit,
}: {
  mode: ServiceCenterMode;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveServiceCenterModeAction,
    initial,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operating mode</CardTitle>
        <CardDescription>
          Mode sirf defaults set karta hai — history kabhi nahi badalti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="sc-mode">Service center mode</Label>
            <Select
              id="sc-mode"
              name="mode"
              defaultValue={mode}
              disabled={!canEdit}
            >
              {MODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} — {item.hint}
                </option>
              ))}
            </Select>
          </div>
          <Feedback state={state} />
          {canEdit ? (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save mode"}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function BrandForm({ brand, canEdit }: { brand?: BrandRow; canEdit: boolean }) {
  const [state, action, pending] = useActionState(saveBrandAction, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={brand?.id ?? ""} />
      <div className="grid gap-1.5">
        <Label htmlFor={`brand-name-${brand?.id ?? "new"}`}>Name *</Label>
        <Input
          id={`brand-name-${brand?.id ?? "new"}`}
          name="name"
          required
          maxLength={80}
          defaultValue={brand?.name ?? ""}
          placeholder="e.g. Komaki"
          disabled={!canEdit}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`brand-code-${brand?.id ?? "new"}`}>Code</Label>
        <Input
          id={`brand-code-${brand?.id ?? "new"}`}
          name="code"
          maxLength={10}
          defaultValue={brand?.code ?? ""}
          placeholder="KMK"
          disabled={!canEdit}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`brand-no-${brand?.id ?? "new"}`}>
          Authorized service no
        </Label>
        <Input
          id={`brand-no-${brand?.id ?? "new"}`}
          name="authorized_no"
          maxLength={60}
          defaultValue={brand?.authorized_no ?? ""}
          disabled={!canEdit}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`brand-phone-${brand?.id ?? "new"}`}>
          Support phone
        </Label>
        <Input
          id={`brand-phone-${brand?.id ?? "new"}`}
          name="support_phone"
          maxLength={30}
          defaultValue={brand?.support_phone ?? ""}
          disabled={!canEdit}
        />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`brand-email-${brand?.id ?? "new"}`}>
          Support email
        </Label>
        <Input
          id={`brand-email-${brand?.id ?? "new"}`}
          name="support_email"
          type="email"
          maxLength={120}
          defaultValue={brand?.support_email ?? ""}
          disabled={!canEdit}
        />
      </div>
      <label className="text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="is_authorized"
          defaultChecked={brand?.is_authorized ?? false}
          disabled={!canEdit}
          className="accent-primary mr-2 size-4"
        />
        Authorized brand (claim + numbering ke liye)
      </label>
      <div className="sm:col-span-2">
        <Feedback state={state} />
        {canEdit ? (
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : brand ? "Save brand" : "Add brand"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function BrandToggle({
  brand,
  canEdit,
}: {
  brand: BrandRow;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(
    setBrandActiveAction,
    initial,
  );
  return (
    <form action={action}>
      <input type="hidden" name="id" value={brand.id} />
      <input
        type="hidden"
        name="is_active"
        value={brand.is_active ? "0" : "1"}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={!canEdit || pending}
      >
        {brand.is_active ? "Deactivate" : "Reactivate"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

function ServiceTypeForm({
  type,
  canEdit,
}: {
  type: ServiceTypeRow;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(
    setServiceTypeActiveAction,
    initial,
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className={type.is_active ? "" : "text-muted-foreground line-through"}
        >
          {type.name}
        </span>
        <Badge variant={type.is_active ? "success" : "outline"}>
          {type.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
      <form action={action}>
        <input type="hidden" name="id" value={type.id} />
        <input
          type="hidden"
          name="is_active"
          value={type.is_active ? "0" : "1"}
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={!canEdit || pending}
        >
          {type.is_active ? "Deactivate" : "Reactivate"}
        </Button>
      </form>
      <Feedback state={state} />
    </div>
  );
}

function AddServiceType({ canEdit }: { canEdit: boolean }) {
  const [state, action, pending] = useActionState(
    saveServiceTypeAction,
    initial,
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 pt-3">
      <div className="grid min-w-40 flex-1 gap-1.5">
        <Label htmlFor="new-type-name">New service type</Label>
        <Input
          id="new-type-name"
          name="name"
          required
          maxLength={60}
          placeholder="e.g. Doorstep Visit"
          disabled={!canEdit}
        />
      </div>
      <div className="grid w-24 gap-1.5">
        <Label htmlFor="new-type-order">Order</Label>
        <Input
          id="new-type-order"
          name="sort_order"
          type="number"
          min={0}
          max={1000}
          defaultValue={100}
          disabled={!canEdit}
        />
      </div>
      {canEdit ? (
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      ) : null}
      <Feedback state={state} />
    </form>
  );
}

export function ServiceCenterPanel({
  mode,
  brands,
  serviceTypes,
  canEdit,
}: {
  mode: ServiceCenterMode;
  brands: BrandRow[];
  serviceTypes: ServiceTypeRow[];
  canEdit: boolean;
}) {
  const authorizedCount = brands.filter(
    (brand) => brand.is_authorized && brand.is_active,
  ).length;

  return (
    <div className="space-y-4">
      <ModeForm mode={mode} canEdit={canEdit} />

      {mode === "single_brand" && authorizedCount >= 2 ? (
        <p className="border-warning/40 bg-warning/10 text-warning rounded-md border px-3 py-2 text-sm">
          ⚠️ {authorizedCount} authorized brands hain — single_brand mode me
          behavior inconsistent ho sakta hai. Multi_brand mode consider karein.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Brands</CardTitle>
          <CardDescription>
            Deactivate-only — delete nahi, warna purane jobs ke reports se brand
            gayab ho jayega.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {brands.map((brand) => (
            <details key={brand.id} className="rounded-md border px-3 py-2">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-medium">
                <span className="flex items-center gap-2">
                  {brand.name}
                  {brand.code ? (
                    <Badge variant="outline">{brand.code}</Badge>
                  ) : null}
                  {brand.is_authorized ? (
                    <Badge variant="success">Authorized</Badge>
                  ) : null}
                  {!brand.is_active ? (
                    <Badge variant="warning">Inactive</Badge>
                  ) : null}
                </span>
                <BrandToggle brand={brand} canEdit={canEdit} />
              </summary>
              <div className="pt-3">
                <BrandForm brand={brand} canEdit={canEdit} />
              </div>
            </details>
          ))}
          {canEdit ? (
            <details className="rounded-md border px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">
                + Naya brand
              </summary>
              <div className="pt-3">
                <BrandForm canEdit={canEdit} />
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service types</CardTitle>
          <CardDescription>
            Job-level type (repair / installation / claim…). Purane types ko
            deactivate karein, delete nahi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceTypes.map((type) => (
            <ServiceTypeForm key={type.id} type={type} canEdit={canEdit} />
          ))}
          <AddServiceType canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
