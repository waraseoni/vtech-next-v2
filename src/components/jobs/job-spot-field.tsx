"use client";

import { Loader2, MapPin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createJobSpotAction,
  setJobSpotAction,
} from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { JobSpot } from "@/lib/data/job-operations";

export function JobSpotField({
  spots: initialSpots,
  initialLocationId = null,
  initialSpot = "",
  jobId,
}: {
  spots: JobSpot[];
  initialLocationId?: number | null;
  initialSpot?: string;
  /** Detail page: save immediately. Form: submit hidden inputs with the job. */
  jobId?: number;
}) {
  const router = useRouter();
  const [spots, setSpots] = useState(initialSpots);
  const [locationId, setLocationId] = useState(
    initialLocationId ? String(initialLocationId) : "",
  );
  /** Legacy `uniq_id` text survives until the operator picks a real spot. */
  const [legacySpot, setLegacySpot] = useState(
    initialLocationId ? "" : initialSpot,
  );
  const [newSpot, setNewSpot] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = spots.find((spot) => String(spot.id) === locationId);
  const spotLabel = selected?.label ?? legacySpot;

  function select(next: string) {
    setLocationId(next);
    setLegacySpot("");
    if (!jobId) return;
    const chosen = spots.find((spot) => String(spot.id) === next);
    startTransition(async () => {
      const result = await setJobSpotAction({
        id: jobId,
        locationId: chosen?.id ?? null,
        spot: chosen?.label ?? "",
      });
      if (result.ok) {
        toast.success(chosen ? "Spot update ho gaya." : "Spot hata diya.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function create() {
    if (!newSpot.trim()) return;
    startTransition(async () => {
      const result = await createJobSpotAction(newSpot);
      if (!result.ok || !result.spot) {
        toast.error(result.error);
        return;
      }
      setSpots((current) =>
        [...current, { ...result.spot!, occupied: 0 }].sort(
          (a, b) => a.occupied - b.occupied || a.label.localeCompare(b.label),
        ),
      );
      setLocationId(String(result.spot.id));
      setLegacySpot("");
      setNewSpot("");
      toast.success("Naya spot ban gaya.");
      if (jobId) {
        await setJobSpotAction({
          id: jobId,
          locationId: result.spot.id,
          spot: result.spot.label,
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="job-spot-picker">Spot / location</Label>
      <SearchableSelect
        id="job-spot-picker"
        value={locationId}
        onChange={select}
        placeholder="Khali spot pehle"
        options={[
          { value: "", label: "No spot" },
          ...spots.map((spot) => ({
            value: String(spot.id),
            label: `${spot.label}${spot.occupied ? ` (${spot.occupied} job)` : " (khali)"}`,
            hint: spot.occupied ? `${spot.occupied} occupied` : "available",
          })),
        ]}
      />
      <input type="hidden" name="location_id" value={locationId} />
      <input type="hidden" name="spot" value={spotLabel} />
      <div className="flex gap-2">
        <Input
          aria-label="Naya spot naam"
          value={newSpot}
          maxLength={120}
          placeholder="Naya spot naam"
          onChange={(event) => setNewSpot(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              create();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={create}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          New spot
        </Button>
      </div>
      <p className="text-muted-foreground flex items-center gap-1 text-xs">
        <MapPin className="size-3" aria-hidden />
        Occupancy ke hisaab se khali spot upar dikhate hain.
      </p>
    </div>
  );
}
