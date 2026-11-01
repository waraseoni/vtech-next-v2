"use client";

import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";

import {
  saveSettingsAction,
  type SettingsActionState,
} from "@/app/(app)/settings/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { compressPhoto } from "@/lib/images";

const initialState: SettingsActionState = { error: null };

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

function ImageField({
  id,
  name,
  label,
  current,
  disabled,
}: {
  id: string;
  name: string;
  label: string;
  current: string | null;
  disabled: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  async function prepare(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressPhoto(file);
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      input.files = transfer.files;
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(compressed);
      });
    } catch {
      input.value = "";
    }
  }

  const src = preview ?? current;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="border-input bg-muted/30 grid h-28 w-full place-items-center overflow-hidden rounded-lg border border-dashed">
        {src ? (
          <Image
            src={src}
            alt={label}
            width={480}
            height={160}
            unoptimized
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <ImagePlus className="size-4" aria-hidden />
            Abhi koi image nahi
          </span>
        )}
      </div>
      <Input
        id={id}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        onChange={prepare}
        disabled={disabled}
        className="h-auto py-1.5"
      />
      <p className="text-muted-foreground text-xs">
        JPG/PNG/WebP · auto-compress · max 1 MB
      </p>
    </div>
  );
}

export function SettingsForm({
  tab,
  settings,
  canEdit,
  logoUrl,
  coverUrl,
}: {
  tab: "profile" | "attendance";
  settings: Record<string, string>;
  canEdit: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveSettingsAction,
    initialState,
  );
  const value = (name: string) => settings[name] ?? "";
  const disabled = !canEdit;
  const geofenceEnabled = /^(1|true|yes|on)$/i.test(
    settings.geofence_enabled ?? "",
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tab" value={tab} />

      {!canEdit ? (
        <p className="border-warning/30 bg-warning/10 text-warning rounded-md border px-3 py-2 text-sm">
          Read-only: settings save karne ka access sirf admin/developer ke paas
          hai.
        </p>
      ) : null}
      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="border-success/30 bg-success/10 text-success rounded-md border px-3 py-2 text-sm">
          {state.message}
        </p>
      ) : null}

      {tab === "profile" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Business profile</CardTitle>
              <CardDescription>
                Ye details invoice, dashboard aur app shell me dikhti hain.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="settings-name" label="Business name">
                <Input
                  id="settings-name"
                  name="name"
                  defaultValue={value("name")}
                  maxLength={80}
                  required
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-short-name" label="Short name">
                <Input
                  id="settings-short-name"
                  name="short_name"
                  defaultValue={value("short_name")}
                  maxLength={30}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-owner" label="Owner">
                <Input
                  id="settings-owner"
                  name="owner"
                  defaultValue={value("owner")}
                  maxLength={80}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-contact" label="Contact number">
                <Input
                  id="settings-contact"
                  name="contact"
                  defaultValue={value("contact")}
                  maxLength={30}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-email" label="Email">
                <Input
                  id="settings-email"
                  name="email"
                  type="email"
                  defaultValue={value("email")}
                  maxLength={120}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-gst" label="GSTIN">
                <Input
                  id="settings-gst"
                  name="gst_no"
                  defaultValue={value("gst_no")}
                  maxLength={20}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-upi" label="UPI ID">
                <Input
                  id="settings-upi"
                  name="upi_id"
                  defaultValue={value("upi_id")}
                  maxLength={80}
                  disabled={disabled}
                />
              </Field>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="settings-address">Address</Label>
                <Textarea
                  id="settings-address"
                  name="address"
                  defaultValue={value("address")}
                  maxLength={300}
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="settings-announcement">Announcement</Label>
                <Textarea
                  id="settings-announcement"
                  name="announcement"
                  defaultValue={value("announcement")}
                  maxLength={300}
                  disabled={disabled}
                />
              </div>
              <Field
                id="settings-footer"
                label="Footer text"
                hint="Invoice ke neeche chhota text."
              >
                <Input
                  id="settings-footer"
                  name="footer_text"
                  defaultValue={value("footer_text")}
                  maxLength={200}
                  disabled={disabled}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand & media</CardTitle>
              <CardDescription>
                Uploads `media` bucket me jaate hain aur turant public URL milta
                hai.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ImageField
                id="settings-logo"
                name="logo_file"
                label="Logo"
                current={logoUrl}
                disabled={disabled}
              />
              <ImageField
                id="settings-cover"
                name="cover_file"
                label="Cover image"
                current={coverUrl}
                disabled={disabled}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Online presence</CardTitle>
              <CardDescription>Optional links aur WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="settings-whatsapp" label="WhatsApp">
                <Input
                  id="settings-whatsapp"
                  name="whatsapp"
                  defaultValue={value("whatsapp")}
                  maxLength={200}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-facebook" label="Facebook">
                <Input
                  id="settings-facebook"
                  name="facebook"
                  defaultValue={value("facebook")}
                  maxLength={200}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-instagram" label="Instagram">
                <Input
                  id="settings-instagram"
                  name="instagram"
                  defaultValue={value("instagram")}
                  maxLength={200}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-youtube" label="YouTube">
                <Input
                  id="settings-youtube"
                  name="youtube"
                  defaultValue={value("youtube")}
                  maxLength={200}
                  disabled={disabled}
                />
              </Field>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="settings-map">Map link</Label>
                <Input
                  id="settings-map"
                  name="map_url"
                  defaultValue={value("map_url")}
                  maxLength={500}
                  disabled={disabled}
                />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Business hours</CardTitle>
              <CardDescription>
                Duty schedule na hone par attendance isi window se calculate
                hoti hai.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field id="settings-biz-open" label="Open">
                <Input
                  id="settings-biz-open"
                  type="time"
                  name="biz_open"
                  defaultValue={value("biz_open")}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-biz-close" label="Close">
                <Input
                  id="settings-biz-close"
                  type="time"
                  name="biz_close"
                  defaultValue={value("biz_close")}
                  disabled={disabled}
                />
              </Field>
              <Field
                id="settings-biz-days"
                label="Working days"
                hint="Jaise: Mon,Tue,Wed,Thu,Fri,Sat"
              >
                <Input
                  id="settings-biz-days"
                  name="biz_days"
                  defaultValue={value("biz_days")}
                  maxLength={50}
                  disabled={disabled}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Self punch geofence</CardTitle>
              <CardDescription>
                On hone par staff ko shop ke radius ke andar hona hoga. Off ya
                coordinates khaali hone par punch fail-open rehta hai.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  name="geofence_enabled"
                  defaultChecked={geofenceEnabled}
                  disabled={disabled}
                  className="accent-primary size-4"
                />
                Geofence check enabled
              </label>
              <Field id="settings-geo-lat" label="Latitude">
                <Input
                  id="settings-geo-lat"
                  name="geofence_lat"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  defaultValue={value("geofence_lat")}
                  disabled={disabled}
                />
              </Field>
              <Field id="settings-geo-lng" label="Longitude">
                <Input
                  id="settings-geo-lng"
                  name="geofence_lng"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  defaultValue={value("geofence_lng")}
                  disabled={disabled}
                />
              </Field>
              <Field
                id="settings-geo-radius"
                label="Radius (metres)"
                hint="Allowed: 20–5000 m"
              >
                <Input
                  id="settings-geo-radius"
                  name="geofence_radius_m"
                  type="number"
                  min={20}
                  max={5000}
                  step={10}
                  defaultValue={value("geofence_radius_m") || "200"}
                  disabled={disabled}
                />
              </Field>
            </CardContent>
          </Card>
        </>
      )}

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : tab === "profile"
                ? "Save profile"
                : "Save attendance settings"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
