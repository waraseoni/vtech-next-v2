"use client";

import { ImagePlus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { saveJobAction, type JobFormState } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CLIENT_PHOTO_BYTES, compressPhoto } from "@/lib/images";
import { formatINR, lineTotal, roundMoney } from "@/lib/money";

export type JobFormOption = { id: number; name: string; contact?: string };
export type JobFormService = { id: number; name: string; price: number };
export type JobFormProduct = { id: number; name: string; price: number };

export type JobFormValues = {
  id?: number;
  clientId: number;
  mechanicId: number | null;
  item: string;
  fault: string;
  remark: string;
  spot: string;
  commissionAmount: number;
  services: Array<{ serviceId: number; price: number }>;
  products: Array<{
    productId: number;
    name?: string;
    qty: number;
    price: number;
  }>;
};

type ServiceRow = { key: string; serviceId: number; price: number };
type ProductRow = {
  key: string;
  productId: number;
  name: string;
  qty: number;
  price: number;
};

const initialState: JobFormState = { error: null };

function rowKey() {
  return crypto.randomUUID();
}

export function JobForm({
  options,
  initial,
  nextJobId,
}: {
  options: {
    clients: JobFormOption[];
    mechanics: JobFormOption[];
    services: JobFormService[];
    products: JobFormProduct[];
  };
  initial?: JobFormValues;
  nextJobId?: number;
}) {
  const [state, formAction, pending] = useActionState(
    saveJobAction,
    initialState,
  );
  const serviceById = new Map(options.services.map((s) => [s.id, s]));
  const productById = new Map(options.products.map((p) => [p.id, p]));

  const [serviceRows, setServiceRows] = useState<ServiceRow[]>(() =>
    (initial?.services ?? []).map((line) => ({
      key: rowKey(),
      serviceId: line.serviceId,
      price: line.price,
    })),
  );
  const [productRows, setProductRows] = useState<ProductRow[]>(() =>
    (initial?.products ?? []).map((line) => ({
      key: rowKey(),
      productId: line.productId,
      name: line.name ?? "",
      qty: line.qty,
      price: line.price,
    })),
  );
  const [previews, setPreviews] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const previewUrls = useRef<string[]>([]);

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const total = roundMoney(
    serviceRows.reduce((sum, row) => sum + row.price, 0) +
      productRows.reduce((sum, row) => sum + lineTotal(row.qty, row.price), 0),
  );

  async function handleImages(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []).slice(0, 5);
    setImageError(null);
    if (!files.length) return;

    try {
      const transfer = new DataTransfer();
      const nextPreviews: Array<{ name: string; url: string }> = [];
      for (const file of files) {
        const compressed = await compressPhoto(file);
        if (compressed.size > MAX_CLIENT_PHOTO_BYTES) {
          throw new Error("Har image 1 MB se choti honi chahiye.");
        }
        transfer.items.add(compressed);
        const url = URL.createObjectURL(compressed);
        previewUrls.current.push(url);
        nextPreviews.push({ name: compressed.name, url });
      }
      input.files = transfer.files;
      previewUrls.current
        .splice(0, previewUrls.current.length - nextPreviews.length)
        .forEach((url) => URL.revokeObjectURL(url));
      setPreviews(nextPreviews);
    } catch (error) {
      input.value = "";
      setPreviews([]);
      setImageError(
        error instanceof Error ? error.message : "Images sahi nahi hain.",
      );
    }
  }

  const servicePayload = serviceRows
    .filter((row) => row.serviceId > 0)
    .map((row) => ({
      serviceId: row.serviceId,
      name: serviceById.get(row.serviceId)?.name ?? `Service #${row.serviceId}`,
      price: row.price,
    }));
  const productPayload = productRows
    .filter((row) => (row.productId > 0 || row.name.trim()) && row.qty > 0)
    .map((row) => ({
      productId: Math.max(row.productId, 0),
      name:
        productById.get(row.productId)?.name ??
        row.name.trim() ??
        `Product #${row.productId}`,
      qty: row.qty,
      price: row.price,
    }));

  const editing = Boolean(initial?.id);
  const cancelHref = editing ? `/jobs/${initial?.id}` : "/jobs";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      <input
        type="hidden"
        name="services"
        value={JSON.stringify(servicePayload)}
      />
      <input
        type="hidden"
        name="products"
        value={JSON.stringify(productPayload)}
      />

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <Card className="gap-5 py-5">
        <CardHeader className="px-5">
          <CardTitle>Job details</CardTitle>
          <CardDescription>
            {editing
              ? "Header edit karein. Items replace ho jaate hain."
              : nextJobId
                ? `Save par job id ~#${nextJobId} milega (atomic counter).`
                : "Naya repair job banayein."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="client_id">Client *</Label>
            <SearchableSelect
              id="client_id"
              name="client_id"
              required
              defaultValue={String(initial?.clientId ?? "")}
              placeholder="Client chuniye…"
              options={options.clients.map((client) => ({
                value: String(client.id),
                label: client.name,
                hint: client.contact,
                keywords: client.contact,
              }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mechanic_id">Mechanic</Label>
            <SearchableSelect
              id="mechanic_id"
              name="mechanic_id"
              defaultValue={String(initial?.mechanicId ?? "")}
              placeholder="Unassigned"
              options={[
                { value: "", label: "Unassigned" },
                ...options.mechanics.map((mechanic) => ({
                  value: String(mechanic.id),
                  label: mechanic.name,
                })),
              ]}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="spot">Spot / tag</Label>
            <Input
              id="spot"
              name="spot"
              maxLength={120}
              defaultValue={initial?.spot ?? ""}
              placeholder="e.g. Shop counter / Rack A"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item">Item *</Label>
            <Input
              id="item"
              name="item"
              required
              maxLength={200}
              defaultValue={initial?.item ?? ""}
              placeholder="e.g. Samsung 1.5T AC"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="commission_amount">Mechanic commission (₹)</Label>
            <Input
              id="commission_amount"
              name="commission_amount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={String(initial?.commissionAmount ?? 0)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="fault">Fault *</Label>
            <Textarea
              id="fault"
              name="fault"
              required
              rows={2}
              maxLength={400}
              defaultValue={initial?.fault ?? ""}
              placeholder="Customer ne kya problem batayi"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="remark">Remark</Label>
            <Textarea
              id="remark"
              name="remark"
              rows={2}
              maxLength={400}
              defaultValue={initial?.remark ?? ""}
              placeholder="Internal note (optional)"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="flex-row items-center justify-between px-5">
          <div>
            <CardTitle>Services</CardTitle>
            <CardDescription>Labour / service charges.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setServiceRows((rows) => [
                ...rows,
                { key: rowKey(), serviceId: 0, price: 0 },
              ])
            }
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          {serviceRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Abhi koi service nahi. Add dabayein.
            </p>
          ) : null}
          {serviceRows.map((row) => (
            <div key={row.key} className="flex items-end gap-2">
              <div className="grid min-w-0 flex-1 gap-2">
                <Label htmlFor={`service_${row.key}`}>Service</Label>
                <SearchableSelect
                  id={`service_${row.key}`}
                  value={row.serviceId ? String(row.serviceId) : ""}
                  placeholder="Select service…"
                  options={options.services.map((service) => ({
                    value: String(service.id),
                    label: service.name,
                    hint: formatINR(service.price),
                  }))}
                  onChange={(next) => {
                    const serviceId = next ? Number(next) : 0;
                    const price = serviceById.get(serviceId)?.price ?? 0;
                    setServiceRows((rows) =>
                      rows.map((item) =>
                        item.key === row.key
                          ? { ...item, serviceId, price }
                          : item,
                      ),
                    );
                  }}
                />
              </div>
              <div className="w-28 shrink-0">
                <Label htmlFor={`service_price_${row.key}`} className="mb-2">
                  Price
                </Label>
                <Input
                  id={`service_price_${row.key}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(event) =>
                    setServiceRows((rows) =>
                      rows.map((item) =>
                        item.key === row.key
                          ? { ...item, price: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove service"
                onClick={() =>
                  setServiceRows((rows) =>
                    rows.filter((item) => item.key !== row.key),
                  )
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="flex-row items-center justify-between px-5">
          <div>
            <CardTitle>Products / parts</CardTitle>
            <CardDescription>Parts ka qty × price.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setProductRows((rows) => [
                ...rows,
                { key: rowKey(), productId: -1, name: "", qty: 1, price: 0 },
              ])
            }
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          {productRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Abhi koi product nahi. Add dabayein.
            </p>
          ) : null}
          {productRows.map((row) => (
            <div
              key={row.key}
              className="flex flex-wrap items-end gap-2 sm:flex-nowrap"
            >
              <div className="grid w-full min-w-0 gap-2 sm:flex-1">
                <Label htmlFor={`product_${row.key}`}>Product</Label>
                <SearchableSelect
                  id={`product_${row.key}`}
                  value={row.productId >= 0 ? String(row.productId) : ""}
                  placeholder="Select product…"
                  options={[
                    { value: "0", label: "Legacy / free text" },
                    ...options.products.map((product) => ({
                      value: String(product.id),
                      label: product.name,
                      hint: formatINR(product.price),
                    })),
                  ]}
                  onChange={(next) => {
                    const productId = next === "" ? -1 : Number(next);
                    const product = productById.get(productId);
                    setProductRows((rows) =>
                      rows.map((item) =>
                        item.key === row.key
                          ? {
                              ...item,
                              productId,
                              price: product?.price ?? 0,
                              name: product?.name ?? "",
                            }
                          : item,
                      ),
                    );
                  }}
                />
                {row.productId === 0 ? (
                  <Input
                    aria-label="Legacy item ka naam"
                    value={row.name}
                    placeholder="Item ka naam likhein"
                    maxLength={200}
                    onChange={(event) =>
                      setProductRows((rows) =>
                        rows.map((item) =>
                          item.key === row.key
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                ) : null}
              </div>
              <div className="w-20 shrink-0">
                <Label htmlFor={`product_qty_${row.key}`} className="mb-2">
                  Qty
                </Label>
                <Input
                  id={`product_qty_${row.key}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.qty}
                  onChange={(event) =>
                    setProductRows((rows) =>
                      rows.map((item) =>
                        item.key === row.key
                          ? { ...item, qty: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="w-28 shrink-0">
                <Label htmlFor={`product_price_${row.key}`} className="mb-2">
                  Price
                </Label>
                <Input
                  id={`product_price_${row.key}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(event) =>
                    setProductRows((rows) =>
                      rows.map((item) =>
                        item.key === row.key
                          ? { ...item, price: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove product"
                onClick={() =>
                  setProductRows((rows) =>
                    rows.filter((item) => item.key !== row.key),
                  )
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Job photos</CardTitle>
          <CardDescription>
            Max 5 images, har ek 1 MB tak. Browser me compress hoti hain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          <Label
            htmlFor="images"
            className="border-input hover:bg-muted/50 flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <ImagePlus className="size-4" aria-hidden />
            Images chuniye
          </Label>
          <div className="sr-only">
            <Input
              id="images"
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImages}
            />
          </div>
          {imageError ? (
            <p className="text-destructive text-xs">{imageError}</p>
          ) : null}
          {previews.length ? (
            <div className="flex flex-wrap gap-2">
              {previews.map((preview) => (
                <Image
                  key={preview.url}
                  src={preview.url}
                  alt={preview.name}
                  width={72}
                  height={72}
                  unoptimized
                  className="size-18 rounded-md border object-cover"
                />
              ))}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-3 border-t px-5 pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create job"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <p className="text-muted-foreground ml-auto text-sm">
            Total:{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {formatINR(total)}
            </span>
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
