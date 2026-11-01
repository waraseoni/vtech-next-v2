# V-Tech Next.js v2

V-Tech service management admin — Next.js 16 (App Router, RSC), React 19, TypeScript 7, Tailwind CSS v4, Supabase (Postgres + Auth + Storage).

Full plan: [docs/plans/v2-build-plan.md](docs/plans/v2-build-plan.md).

## Setup

```bash
# Node 24 (see .nvmrc)
nvm use 24

npm install
cp .env.example .env.local   # fill Supabase keys
npm run dev                  # http://localhost:3000
```

Required env (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Legacy anon/service-role names are still read during the key migration window.

## Scripts

| Script | What |
| --- | --- |
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint (bans `select('*')`) |
| `npm run test` | Vitest + jsdom |
| `npm run format` | Prettier + Tailwind class sort |

## Structure

```
src/
  app/(auth)/login/     # public sign-in
  app/(app)/            # protected shell (session + role gate)
  app/api/health/       # keep-warm endpoint (publishable key only)
  components/           # shell, providers, ui primitives
  lib/supabase/         # browser / server / admin clients
  lib/auth.ts           # cached session + role helpers
  proxy.ts              # optimistic auth redirect (getClaims)
```

## Deploy

Vercel (Node 24, region `bom1`). GitHub Actions: `ci.yml` (typecheck, lint, test, licenses, audit, build) and `keep-warm.yml` (ping `/api/health` every 10 min during business hours).
