"use client";

import { Grid3X3, MapPin, Printer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { JobSpot } from "@/lib/data/job-operations";

type Paper = "a4" | "a5" | "letter";
type Orientation = "portrait" | "landscape";

const PAPER_MM: Record<Paper, Record<Orientation, { w: number; h: number }>> = {
  a4: { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } },
  a5: { portrait: { w: 148, h: 210 }, landscape: { w: 210, h: 148 } },
  letter: { portrait: { w: 216, h: 279 }, landscape: { w: 279, h: 216 } },
};

export function SpotLabelsSheet({ spots }: { spots: JobSpot[] }) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(spots.map((spot) => spot.id)),
  );
  const [paper, setPaper] = useState<Paper>("a4");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(4);
  const [qrUrls, setQrUrls] = useState<Record<number, string>>({});

  const selectedSpots = spots.filter((spot) => selected.has(spot.id));
  const origin = useMemo(
    () => (typeof window === "undefined" ? "" : window.location.origin),
    [],
  );

  useEffect(() => {
    if (!selectedSpots.length || !origin) return;
    let cancelled = false;
    void import("qrcode").then(async ({ default: QRCode }) => {
      const entries = await Promise.all(
        selectedSpots.map(async (spot) => {
          const url = `${origin}/jobs?spot=${spot.id}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 220,
            margin: 1,
            errorCorrectionLevel: "M",
            color: { dark: "#0d1117", light: "#ffffff" },
          });
          return [spot.id, dataUrl] as const;
        }),
      );
      if (!cancelled) setQrUrls(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSpots, origin]);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const size = PAPER_MM[paper][orientation];
  const sheetStyle = {
    width: `${size.w}mm`,
    minHeight: `${size.h}mm`,
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  };

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="grid gap-2">
            <Label htmlFor="spot-paper">Paper</Label>
            <Select
              id="spot-paper"
              value={paper}
              onChange={(event) => setPaper(event.target.value as Paper)}
            >
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="letter">Letter</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="spot-orientation">Orientation</Label>
            <Select
              id="spot-orientation"
              value={orientation}
              onChange={(event) =>
                setOrientation(event.target.value as Orientation)
              }
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="spot-cols">Columns</Label>
            <Input
              id="spot-cols"
              type="number"
              min={1}
              max={8}
              value={cols}
              onChange={(event) =>
                setCols(
                  Math.max(1, Math.min(8, Number(event.target.value) || 1)),
                )
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="spot-rows">Rows</Label>
            <Input
              id="spot-rows"
              type="number"
              min={1}
              max={10}
              value={rows}
              onChange={(event) =>
                setRows(
                  Math.max(1, Math.min(10, Number(event.target.value) || 1)),
                )
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              onClick={() => window.print()}
              disabled={!selectedSpots.length}
            >
              <Printer className="size-4" aria-hidden />
              Print sheet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardContent className="space-y-2 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set(spots.map((spot) => spot.id)))}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Badge variant="secondary">{selected.size} spots</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
              <label
                key={spot.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(spot.id)}
                  onChange={() => toggle(spot.id)}
                  className="accent-primary size-4"
                />
                <MapPin className="text-muted-foreground size-4" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{spot.label}</span>
                <Badge variant="outline">{spot.occupied} jobs</Badge>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/jobs?spot=${spot.id}`}>View</Link>
                </Button>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSpots.length > 0 ? (
        <div className="bg-background hidden print:block">
          <div className="mx-auto grid gap-2 p-4" style={sheetStyle}>
            {selectedSpots.slice(0, cols * rows).map((spot) => (
              <div
                key={spot.id}
                className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed p-2 text-center"
              >
                {qrUrls[spot.id] ? (
                  <Image
                    src={qrUrls[spot.id]}
                    alt={`QR for ${spot.label}`}
                    width={96}
                    height={96}
                    unoptimized
                  />
                ) : (
                  <Grid3X3 className="size-16 animate-pulse" aria-hidden />
                )}
                <p className="text-sm font-semibold">{spot.label}</p>
                <p className="text-[10px]">/jobs?spot={spot.id}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
