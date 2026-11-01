"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { saveSaleAction, type SaleFormState } from "@/app/(app)/sales/actions";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_MODES } from "@/lib/data/sale-input";
import { formatINR, lineTotal, roundMoney } from "@/lib/money";

export type SaleFormValues = {
  id?: number;
  clientId: number;
  mechanicId: number | null;
  paymentMode: string;
  remarks: string;
  items: Array<{ productId: number; qty: number; price: number }>;
};

type ItemRow = { key: string; productId: number; qty: number; price: number };

const initialState: SaleFormState = { error: null };

export function SaleForm({
  options,
  initial,
}: {
  options: {
    clients: Array<{ id: number; name: string; contact: string }>;
    mechanics: Array<{ id: number; name: string }>;
    products: Array<{ id: number; name: string; price: number }>;
  };
  initial?: SaleFormValues;
}) {
  const [state, formAction, pending] = useActionState(
    saveSaleAction,
    initialState,
  );
  const productById = new Map(options.products.map((p) => [p.id, p]));
  const [rows, setRows] = useState<ItemRow[]>(() =>
    (initial?.items ?? [{ productId: -1, qty: 1, price: 0 }]).map((line) => ({
      key: crypto.randomUUID(),
      productId: line.productId,
      qty: line.qty,
      price: line.price,
    })),
  );

  const total = roundMoney(
    rows.reduce((sum, row) => sum + lineTotal(row.qty, row.price), 0),
  );
  const items = rows
    .filter((row) => row.productId >= 0 && row.qty > 0)
    .map((row) => ({
      productId: row.productId,
      qty: row.qty,
      price: row.price,
    }));

  const editing = Boolean(initial?.id);
  const cancelHref = editing ? `/sales/${initial?.id}` : "/sales";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

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
          <CardTitle>Sale details</CardTitle>
          <CardDescription>
            Total server par recompute hota hai (RPC), client par sirf preview.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="client_id">Client *</Label>
            <Select
              id="client_id"
              name="client_id"
              required
              defaultValue={String(initial?.clientId ?? "")}
            >
              <option value="">Client chuniye…</option>
              {options.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.contact ? ` · ${client.contact}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mechanic_id">Mechanic</Label>
            <Select
              id="mechanic_id"
              name="mechanic_id"
              defaultValue={String(initial?.mechanicId ?? "")}
            >
              <option value="">Unassigned</option>
              {options.mechanics.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>
                  {mechanic.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment_mode">Payment mode *</Label>
            <Select
              id="payment_mode"
              name="payment_mode"
              required
              defaultValue={initial?.paymentMode ?? "Cash"}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={2}
              maxLength={300}
              defaultValue={initial?.remarks ?? ""}
              placeholder="Optional note"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="flex-row items-center justify-between px-5">
          <div>
            <CardTitle>Items</CardTitle>
            <CardDescription>Product, qty aur selling price.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((current) => [
                ...current,
                { key: crypto.randomUUID(), productId: -1, qty: 1, price: 0 },
              ])
            }
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-wrap items-end gap-2 sm:flex-nowrap"
            >
              <div className="grid w-full min-w-0 gap-2 sm:flex-1">
                <Label>Product</Label>
                <Select
                  value={row.productId >= 0 ? String(row.productId) : ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const productId = raw === "" ? -1 : Number(raw);
                    const price = productById.get(productId)?.price ?? 0;
                    setRows((current) =>
                      current.map((item) =>
                        item.key === row.key
                          ? {
                              ...item,
                              productId,
                              ...(productId > 0 ? { price } : {}),
                            }
                          : item,
                      ),
                    );
                  }}
                >
                  <option value="">Select product…</option>
                  <option value="0">Free-text item (price only)</option>
                  {options.products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {formatINR(product.price)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-20 shrink-0">
                <Label className="mb-2">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={row.qty}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.key === row.key
                          ? { ...item, qty: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="w-28 shrink-0">
                <Label className="mb-2">Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
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
                aria-label="Remove item"
                disabled={rows.length === 1}
                onClick={() =>
                  setRows((current) =>
                    current.filter((item) => item.key !== row.key),
                  )
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-3 border-t px-5 pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create sale"}
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
