import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2048;

const metricSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.enum(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]),
  value: z.number().finite(),
  delta: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  navigationType: z.string().max(40).optional(),
  path: z.string().max(200),
});

function noContent() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Real-user Core Web Vitals sink. Logs one JSON line per metric so Vercel log
 * drains / `vercel logs` can compute p75 without any paid RUM service.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (!body || body.length > MAX_BODY_BYTES) {
    return Response.json({ ok: false }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const parsed = metricSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { name, value, rating, path, navigationType } = parsed.data;
  console.log(
    JSON.stringify({
      kind: "web-vital",
      name,
      value: Math.round(value * 1000) / 1000,
      rating,
      path,
      navigationType: navigationType ?? null,
      ts: new Date().toISOString(),
    }),
  );

  return noContent();
}
