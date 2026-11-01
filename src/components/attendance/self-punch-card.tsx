"use client";

import { MapPin } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  selfPunchAction,
  type AttendanceActionState,
} from "@/app/(app)/attendance/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const initialState: AttendanceActionState = { error: null };

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

function useISTClock() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(new Date()),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return clock;
}

export function SelfPunchCard({
  mechanicName,
  timeIn,
  timeOut,
  geofenceEnabled,
}: {
  mechanicName: string;
  timeIn: string | null;
  timeOut: string | null;
  geofenceEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (previous: AttendanceActionState, formData: FormData) => {
      const point = await getPosition();
      if (point) {
        formData.set("lat", String(point.lat));
        formData.set("lng", String(point.lng));
      }
      return selfPunchAction(previous, formData);
    },
    initialState,
  );
  const clock = useISTClock();

  return (
    <Card className="border-primary/30 from-primary/5 bg-gradient-to-br to-transparent">
      <CardContent className="space-y-3 px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs">Self attendance</p>
            <p className="mt-0.5 font-medium">{mechanicName}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">
              {clock || "--:--:--"}
            </p>
            <p className="text-muted-foreground text-xs">IST</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={timeIn ? "success" : "outline"}>
            In {timeIn?.slice(0, 5) ?? "—"}
          </Badge>
          <Badge variant={timeOut ? "secondary" : "outline"}>
            Out {timeOut?.slice(0, 5) ?? "—"}
          </Badge>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <MapPin className="size-3.5" aria-hidden />
            {geofenceEnabled
              ? "Location check on — permission dein"
              : "Geofence off — location optional"}
          </span>
        </div>

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

        <form action={formAction} className="flex flex-wrap gap-2">
          <Button
            type="submit"
            name="direction"
            value="in"
            size="sm"
            disabled={pending || Boolean(timeIn)}
          >
            {pending ? "Please wait…" : "Check in"}
          </Button>
          <Button
            type="submit"
            name="direction"
            value="out"
            variant="secondary"
            size="sm"
            disabled={pending || !timeIn || Boolean(timeOut)}
          >
            Check out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
