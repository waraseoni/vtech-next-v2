"use client";

import { useReportWebVitals } from "next/web-vitals";

function report(metric: {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating: string;
  navigationType?: string;
}) {
  const body = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: window.location.pathname,
  });

  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/vitals", blob)) return;
  }

  void fetch("/api/vitals", {
    method: "POST",
    body,
    keepalive: true,
    headers: { "content-type": "application/json" },
  }).catch(() => undefined);
}

export function WebVitalsReporter() {
  useReportWebVitals((metric) => report(metric));
  return null;
}
