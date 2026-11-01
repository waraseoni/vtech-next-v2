# V-Tech Next.js v2

V-Tech service management admin — Next.js 16 (App Router, RSC), React 19, TypeScript 6.0.3, Tailwind CSS v4, Supabase (Postgres + Auth + Storage).

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

| Script              | What                                  |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Next dev server (Turbopack)           |
| `npm run build`     | Production build                      |
| `npm run start`     | Serve production build                |
| `npm run typecheck` | `next typegen` + `tsc --noEmit`       |
| `npm run lint`      | ESLint (bans `select('*')`)           |
| `npm run test`      | Vitest + jsdom                        |
| `npm run test:e2e`  | Playwright smoke + axe + mobile       |
| `npm run test:lhci` | Lighthouse CI (`lighthouserc.cjs`)    |
| `npm run size`      | size-limit JS/CSS budgets             |
| `npm run analyze`   | Production build with bundle analyzer |
| `npm run format`    | Prettier + Tailwind class sort        |

## Structure

```
src/
  app/(auth)/login/     # public sign-in
  app/(app)/            # protected shell (session + role gate)
  app/(app)/profile/    # account details + self password change
  app/api/health/       # keep-warm endpoint (publishable key only)
  app/api/vitals/       # web-vitals RUM beacon sink
  components/           # shell, providers, ui primitives
  lib/supabase/         # browser / server / admin clients
  lib/auth.ts           # cached session + role helpers
  lib/roles.ts          # pure role policy (tested)
  proxy.ts              # auth redirect + per-request nonce CSP
e2e/                    # Playwright smoke, axe, mobile, profile, gated CRUD
scripts/                # LHCI auth hook, analyzer wrapper
```

## Verification

Read-only live checks (dev server 3000, credentials from `.env.local`):

```bash
npm run check                     # typecheck + lint + unit
npm run test:e2e                  # smoke (10 routes + axe) + mobile + profile
npm run build && npm run start -- -p 3100
CHROME_PATH=<chromium>/chrome.exe LHCI_BASE_URL=http://localhost:3100 LHCI_AUTHED=1 npm run test:lhci
npm run size                      # set PUPPETEER_EXECUTABLE_PATH if estimo flakes
```

CRUD e2e writes to the shared DB, so it stays skipped unless both `E2E_MUTATIONS=1` and `E2E_ALLOW_LIVE_DB_WRITES=1` are set.

## Deploy

Vercel (Node 24, region `bom1`). GitHub Actions: `ci.yml` (typecheck, lint, test, licenses, audit, build) and `keep-warm.yml` (ping `/api/health` every 10 min during business hours).
