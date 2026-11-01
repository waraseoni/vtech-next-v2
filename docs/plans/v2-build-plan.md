# V-Tech Next.js v2 — Build Plan (Phase 1: 6 modules)

**Date:** 2026-11-01
**Repo:** `C:\next-vtech\vtech-next-v2` (naya git repo, Vercel deploy)
**DB:** Supabase (existing live project, schema `20260913000000_final_full_schema_idempotent.sql`)
**Status:** Phases 0–8 implemented (2026-11-01) — six modules + hardening. Verification: §3.1.

---

## 0. Locked decisions (user-confirmed)

| Decision | Choice |
| --- | --- |
| Build approach | **Fresh lean app** in `vtech-next-v2`; purane app ke proven patterns/libs reuse, bhaari components copy nahi |
| Hosting | **Git + Vercel Hobby (free)** — ToS caveat §3.4 dekho |
| UI | **Naya modern admin UI** (Tailwind v4 + shadcn/ui, light/dark, dense tables) |
| Auth | **Supabase Auth email/password** (existing `profiles.role`: admin/staff/client/developer) |
| Dependencies | **Sab npm latest + exact pinned**; sirf **MIT / Apache-2.0 / ISC / BSD / MPL-2.0 (dev-only)** OSS — koi paid service/subscription nahi |
| Keep-warm | **GitHub Actions free cron** (Vercel Pro cron nahi) |
| DB changes | **Zero DDL** — `vtech-frontend` ke saath shared DB; v1 me koi table/column/policy/function/index change nahi (§5) |
| New tech (adopted) | **React Compiler** (Next 16 stable), **Supabase asymmetric JWT + new publishable key**, **generated DB types**, `@date-fns/tz`, **axe** accessibility gate — detail §3.6 |

### 0.1 Why Next.js over Python (decision record)

**Decision:** Frontend + server layer **Next.js 16 + TypeScript**. Python (FastAPI/Django) v1 me **nahi**. (2026-11-01)

**Kyun:**

| Factor | Next.js + Supabase | Python + Supabase |
| --- | --- | --- |
| DB access | `@supabase/ssr` se seedha PostgREST/RPC — koi alag backend layer nahi | Python service alag; wahi queries wahan wrap karni padti |
| Auth | Supabase cookie session built-in | JWT/session bridge manually |
| Speed (round-trips) | Browser → Vercel function → Supabase = **1 hop** | Browser → frontend → FastAPI → Supabase = **2 hops** |
| Business logic | Pehle se SQL RPC me (language-agnostic) | Wahi logic Python me duplicate ya phir RPC hi call |
| UI | shadcn/ui + dense tables/forms ready | Django admin quick, par custom modern UI ke liye alag frontend |
| Free deploy | Vercel Hobby, ek project | Backend host alag (free tier cold start bura) + frontend alag |
| Maintenance | 1 language | 2 languages + 2 deploys + 2 CI |

**Python kab better hota:** heavy computation (ML/AI, pandas reporting, image processing), complex background queues, ya team ki existing Python expertise. Aapke 6 modules **CRUD + aggregate + role-gated UI** hain — inme ye koi case nahi.

**Revisit trigger:** agar future me AI/analytics/heavy reporting module aaye, tab **alag Python microservice** add karenge (Next.js use call karega). Poora app rewrite **kabhi nahi** — polyglot boundary clean rahegi.

---

## 1. Scope

### Phase 1 me banega (6 modules)

1. **Login + App shell** (sidebar, topbar, role gate, session)
2. **Dashboard** — KPIs, 12-month revenue, job status, recent jobs/payments, low stock, today's attendance
3. **System settings / System info** — business profile (KV `system_info`), geofence config, read-only system diagnostics
4. **Attendance** — daily marking + staff self check-in/out (geofence), monthly report + salary hours
5. **Clients** — list/search/financials, detail, add/edit
6. **Sales** (= Direct Sales) — list, create/edit with items, detail
7. **Jobsheet** (= repair jobs / `transaction_list`) — list/search/filter, create/edit, status flow, products/services, job images

### Phase 1 me NAHI (baad ke liye)

Inventory, suppliers/PO, mechanics master, reports/printing, loans/lenders, messages, AI, passkeys, client portal, estimates, bulk job entry, spot labels, required-parts workflow, WhatsApp, backup/sync, PWA/offline.

> Note: Sales ka matlab yahan **`direct_sales`** hai. Repair billing **jobsheet** ke andar hai. Client payments/loans v1 me sirf clients detail me read-only dikhenge, full payments module baad me.

---

## 2. DB reality check (honest findings)

Purane app (`..\vtech-frontend`) ke perf audit + fresh schema scan se:

**Data volume trivial hai** (indicative, 14-Oct-2026 audit): `transaction_list` ~2,229 · `client_list` ~531 · `activity_logs` ~4,016 · `transaction_services` ~1,618 · `client_payments` ~785 · `inventory_list` ~128 · `product_list` ~97 · `direct_sales` ~55 · `mechanic_list` ~4.

**Asli bottlenecks (priority order):**

1. **Middleware auth tax** — purane `proxy.ts` me har request (prefetch/API/public bhi) par `supabase.auth.getUser()` = Supabase Auth server RTT (~50–220ms warm, cold me seconds). Ye "sab pages slow" ka #1 reason tha.
2. **Client-side fetch waterfalls** — hydration ke baad `useEffect` → fetch → skeleton → data; 5–6 sequential batches.
3. **Zero app-layer cache** — har mount par refetch; `select('*')` 72 jagah; unbounded lists.
4. **Bhaari client components** — `JobsBody.tsx` 135KB, `ClientsBody.tsx` 67KB, `DashboardBody.tsx` 62KB; poora module client bundle me.
5. **Supabase free-tier cold start** — idle ke baad first hit **7.9s** observed.
6. **RPCs unbounded** — `get_transactions_with_client_data()` aur `get_clients_page_financials()` **saari rows** return karte hain; list pages ke liye unfit.

**Per-query warm latency:** 50–220ms (PostgREST + RTT baseline). 5 sequential tiny queries ≈ 270ms. Matlab **round-trip count** hi asli lever hai.

### 2.1 Schema quirks jo v2 data layer ko handle karne honge

| Quirk | Detail | Handling |
| --- | --- | --- |
| `transaction_list.client_name` | `text` me client **id** (integer ka string) | `case when client_name ~ '^\d+$' then client_name::int end`; central mapper |
| Mixed timestamps | `transaction_list` = `timestamptz`; `direct_sales`/`client_list` = `timestamp` (IST wall-clock) | SQL me explicit IST (`Asia/Kolkata`), JS me ek hi `dateUtils` |
| Status codes | Job: 0 pending, 1 in-progress, 2 finished, 3 paid, 4 cancelled, 5 delivered. Attendance: 0 unmarked, 1 present, 2 absent, 3 half-day | Single `constants/status.ts` |
| Soft deletes | `client_list.delete_flag`, `transaction_list.del_status`, `product_list.delete_flag` | Har query me explicit filter |
| `transaction_list.user_id` | Legacy numeric id = `profiles.mechanic_id` (old PHP `users.id`) | Server action me session → profile.mechanic_id; fallback 0 |
| `job_id` / `code` | `job_id` global counter (`job_id_counter` + `next_job_id()`); `code` = `YYYYMMDD` + daily 2-digit seq; **code unique nahi hai** (race) | `next_job_id()` + app-level seq + post-insert verify/retry |
| `sale_code` | `SALE######`, **unique index nahi** (old app me race documented) | App-level daily seq + post-insert verify/retry; unique index deferred |
| `system_info` | Key-value table; anon sirf public keys padh sakta hai; `ai_api_key`/`csrf_token` kabhi expose nahi | Typed allowlist mapper |
| No auto-profile trigger | `handle_new_user` trigger **drop** ho chuka hai → koi bhi naya auth user ki `profiles` row khud nahi banti | Admin-only user creation (server action + service role, explicit insert) |
| RLS role lookup | `is_frontend_staff()` har query me `profiles` lookup karta hai | Acceptable at this size; JWT-claim optimization Phase 2 |
| Storage | Buckets **public** (`client-photos`, `job-images`, `user-avatars`, `media`) | Direct CDN URL, signed URL ki zaroorat nahi |
| Settings write RLS | `hardening_sysinfo_staff` = admin **+ staff** write; `developer` write **blocked** | Decision chahiye (neeche §11) |

---

## 3. Target architecture

### 3.1 Stack — pinned latest versions (npm check: 2026-11-01)

Sab exact versions `package.json` me pin honge (`^`/`~` nahi) + `package-lock.json` commit. Sab **free/open-source** hain.

| Layer | Package | Version | License |
| --- | --- | --- | --- |
| Framework | `next` | **16.4.3** | MIT |
| UI runtime | `react` / `react-dom` | **19.3.1** | MIT |
| Language | `typescript` | **6.0.3** | Apache-2.0 |
| Types (Node 24 runtime) | `@types/node` | **24.19.2** | MIT |
| Types | `@types/react` / `@types/react-dom` | **19.3.0** | MIT |
| Styling | `tailwindcss` + `@tailwindcss/turbopack` | **4.3.3** | MIT |
| CSS pipeline | Tailwind Turbopack loader (`next.config.ts` rule) | 4.3.3 | MIT |
| UI primitives | `radix-ui` | **1.8.1** | MIT |
| shadcn helpers | `class-variance-authority` / `clsx` / `tailwind-merge` | **0.7.1** / **2.1.1** / **3.7.0** | MIT |
| Theme | `next-themes` | **0.4.6** | MIT |
| DB | `@supabase/supabase-js` | **2.118.0** | MIT |
| SSR auth | `@supabase/ssr` | **0.12.7** | MIT |
| Client cache | `@tanstack/react-query` | **5.105.1** | MIT |
| Forms | `react-hook-form` | **7.91.0** | MIT |
| Validation | `zod` | **4.6.7** | MIT |
| Form resolver | `@hookform/resolvers` | **7.0.1** | MIT |
| Dates | `date-fns` | **4.4.0** | MIT |
| IST timezone safety | `@date-fns/tz` | **1.5.0** | MIT |
| RUM (optional) | `web-vitals` | **6.2.3** | Apache-2.0 |
| Icons | `lucide-react` | **1.66.0** | ISC |
| Toasts | `sonner` | **2.0.8** | MIT |
| Server guard | `server-only` | **0.0.1** | MIT |
| Image optimization | `sharp` | **0.35.5** | Apache-2.0 |
| Test runner | `vitest` + `@vitest/coverage-v8` | **5.0.5** | MIT |
| Test bundler | `vite` + `@vitejs/plugin-react` | **8.3.5** / **6.1.2** | MIT |
| DOM env | `jsdom` | **30.1.3** | MIT |
| React testing | `@testing-library/react` / `jest-dom` | **16.3.3** / **7.0.1** | MIT |
| E2E | `@playwright/test` | **1.64.1** | Apache-2.0 |
| Lint | `eslint` + `eslint-config-next` | **10.14.0** / **16.4.3** | MIT |
| Format | `prettier` | **3.9.10** | MIT |
| Tailwind class sort (dev) | `prettier-plugin-tailwindcss` | **0.8.1** | MIT |
| License gate (dev) | `license-checker` | **25.0.1** | BSD-3-Clause |
| React Compiler (dev) | `babel-plugin-react-compiler` | **1.0.0** | MIT |
| Supabase CLI (dev) | `supabase` | **2.122.0** | MIT |
| E2E accessibility (dev) | `@axe-core/playwright` | **4.14.0** | MPL-2.0 |
| Bundle analyzer (dev) | `@next/bundle-analyzer` | **16.4.3** | MIT |
| Perf gate (dev) | `@lhci/cli` | **0.15.1** | Apache-2.0 |
| Bundle gate (dev) | `size-limit` + `@size-limit/preset-app` | **14.3.0** | MIT |

**Compatibility notes (honest):**
- Node runtime **24** (local **24.13.0**; target **≥24.15.0** — jsdom 30 transitive requirement). `.nvmrc` + `engines` me `24` pin.
- **TypeScript 6.0.3** (not 7.0.2): TS 7 build/typecheck pass karta hai, par `typescript-eslint` (jo `eslint-config-next` ke andar hai) TS 7 ko **explicitly reject** karta hai — `npm run lint` fail hota hai (2026-11-01 verify). Isliye lint gate ke liye latest TS 6 pin. TS 7 support aane par bump karenge.
- `@types/node` **24.x** (26.x nahi) — runtime Node 24 se match.
- `radix-ui` unified package use hoga; shadcn CLI jo bhi transitive deps laaye, wahi pinned lockfile me jayenge.

**Compatibility smoke test (2026-11-01, temp project):**

| Check | Result |
| --- | --- |
| `tsc --noEmit` (TypeScript **7.0.2**) | ✅ pass |
| `next build` (Next **16.4.3** Turbopack + React **19.3.1**) | ✅ pass |
| Vitest **5.0.5** + jsdom **30.1.3** (1 test) | ✅ pass |
| Tailwind **4.3.3** + `@tailwindcss/postcss` + postcss **8.5.32** | ✅ pass (temp test only; final project Turbopack loader use karta hai) |
| `@supabase/ssr` **0.12.7** + `@supabase/supabase-js` **2.118.0** import | ✅ pass |

**Phase 0 real-project verification (2026-11-01):**

| Check | Result |
| --- | --- |
| `npm run typecheck` (Next typegen + TS **6.0.3**) | ✅ pass |
| `npm run lint` (ESLint **10.14.0** + TS 6.0.3) | ✅ pass |
| `npm run test` (Vitest 5, 4 tests) | ✅ pass |
| `npm run build` (React Compiler **on**, 11 routes) | ✅ pass, 7.6s compile |
| `/api/health` (live Supabase read) | ✅ `{ok:true, dbMs:416}` |
| `/dashboard` logged-out | ✅ 307 → `/login?next=%2Fdashboard` |
| Login submit (invalid creds) | ✅ generic error, no enumeration |
| Login submit (real admin) | ✅ → `/dashboard`, profile + role load (RLS `profiles` self read) |
| `/settings` protected route | ✅ shell + admin role gate |
| Logout | ✅ session clear → `/login` |

**Findings (v2 me apply honge):**
1. `package.json` me **`"type": "module"` mandatory** — npm 11 ka `init -y` `"commonjs"` set karta hai, jisse Next 16 Turbopack build fail hota hai (verified).
2. Next build khud `tsconfig.json` adjust karta hai: `allowJs: true`, `jsx: "react-jsx"`, `.next/dev/types/**/*.ts` include. Isko commit karenge.

**Phase 1 real-data verification (2026-11-01, zero DDL):**

| Check | Result |
| --- | --- |
| DB writes/migrations | ✅ **zero** — sirf read-only REST/RPC calls |
| Scoped schema types | ✅ hand-pinned (tables + enums + 13 RPCs), `tsc` pass |
| Live RPC shapes | ✅ `get_dashboard_stats`, `get_monthly_revenue`, `get_clients_page_financials` match zod schemas |
| Read smoke (columns) | ✅ `attendance_list`, `mechanic_list`, `transaction_list`, `staff_duty_schedule` |
| Unit tests (Vitest) | ✅ **34 pass** — dates, money, duty/hours, codes, clients, RPC schemas |
| `npm run typecheck` / `lint` / `build` | ✅ pass — 11 routes |

Notes: `direct_sales` empty (sale code `SALE000001` se shuru); legacy jobs `client_name` numeric id → `Client #id` fallback; `system_info.meta_field` par unique index nahi hai, isliye save = update-existing + insert-missing (no `upsert`).
3. Local Node **24.13.0** par sab chala, par jsdom 30 ka transitive `w3c-xmlserializer@6` `^24.15.0` maangta hai (npm warning). **Node latest 24 LTS (≥24.15) par upgrade** karenge; Vercel Node 24 use karega.
4. shadcn/Radix components Phase 0 me add honge (stable MIT); unka per-component smoke test scaffold par hoga.

**Phase 2 dashboard verification (2026-11-01, zero DDL, live login):**

| Check | Result |
| --- | --- |
| Live `/dashboard` (admin) | ✅ KPI ₹2,500 aaj; 545 clients; 3 mechanics; 2,266 jobs |
| 12-month revenue chart | ✅ 12 bars, live `get_monthly_revenue` (total ₹21,09,485) |
| Job-status mix + recent jobs | ✅ 6 statuses; 8 rows, real client names resolve |
| Attendance strip + payments | ✅ 2/3 present; 6 latest payments |
| Mobile 390px | ✅ no page overflow; chart last 6 months; table `table-fixed` |
| Dark theme | ✅ tokens + chart legible |
| Console errors (Playwright) | ✅ none |
| `typecheck` / `lint` / `test` / `build` | ✅ pass — **35 tests**, 11 routes |

Note: low-stock aur receivables widgets deferred (`2b`) — warm load aur round-trip budget safe rakhne ke liye.

**Phase 3 Clients verification (2026-11-01, zero DDL, live login, reads only):**

| Check | Result |
| --- | --- |
| List `/clients` | ✅ 545 clients, 25/page, 65 due, due total ₹2,75,330 (one `get_clients_page_financials` RPC + one rows query) |
| Search + due filter | ✅ `q=Ajay` → 7 rows; due-only filter me sabhi due > 0 |
| Detail `/clients/300` | ✅ KPI (billed/paid/due/active loan), jobs, payments, direct sales, contacts, loans, financial breakdown |
| Edit prefill `/clients/[id]/edit` | ✅ name/contact/balance/photo prefill |
| New `/clients/new` | ✅ 16 fields + photo; canvas compression 2.59 MB JPEG → 805 KB WebP with preview |
| Mobile 390px | ✅ list cards + detail, no horizontal overflow |
| 404 for missing id | ✅ error page render |
| Console errors (Playwright) | ✅ none |
| `typecheck` / `lint` / `test` / `build` | ✅ pass — **41 tests**, 12 routes |

Honest notes:
1. **Photo bucket:** client photo upload feature 2026-11-01 ko hata diya gaya (§6.5). Us waqt naye photos public **`media`** bucket me jaate the (`clients/{ts}-{uuid}.webp`, `Cache-Control: 1 year`), kyunki `client-photos` par staff INSERT policy nahi thi — policy add karna DB change hota. Legacy `client-photos` files untouched hain.
2. **Contacts** detail page par read-only hain (v1); create/edit UI sirf primary client fields manage karta hai.
3. **Mutations live DB par submit nahi kiye gaye** — shared production data safety ke liye. Create/update/delete code paths unit-tested + build-verified hain; pehla real client tab banega jab aap kahenge.
4. Pagination page size doc me 50 tha, implementation me **25** (mobile-first, screenshot-verified).
5. Loans module abhi read-only hai (status 1 = Active) — dedicated loans UI future phase.

**Phase 4 Jobsheet verification (2026-11-01, zero DDL, reads only):**

| Check | Result |
| --- | --- |
| List `/jobs` | ✅ status chips, search (job id/code/item/fault), mechanic + date filters, 25/page, mobile cards + desktop table |
| Detail `/jobs/[id]` | ✅ header, status badges, services/parts, photos, timeline, print layout (`print:hidden` shell) |
| New / edit | ✅ `peek_next_job_id` preview, dynamic service/product rows, legacy free-text product support, 5-image upload |
| Status flow | ✅ `JOB_STATUS_TRANSITIONS` (0→1→2→3→5, cancel 4 until delivered) + unit tests |
| Images | ✅ `media` bucket, canvas compress ≤1 MB WebP, delete per image |
| Soft delete | ✅ admin/developer only (`del_status=1`) |
| `typecheck` / `lint` / `test` / `build` | ✅ pass — **45 tests / 9 files**, 16 routes |

Honest notes:
1. **Legacy product lines** (`product_id` NULL) edit par preserve hote hain — form me "Legacy / free text" option + name input.
2. **Job `code` race:** DB par unique index nahi hai; app-side sequence + retry (purane app jaisa hi accepted risk).
3. **Mutations live DB par submit nahi kiye gaye** (shared production safety) — code paths unit-tested/build-verified.

**Phase 5 Sales verification (2026-11-01, zero DDL, reads only):**

| Check | Result |
| --- | --- |
| List `/sales` | ✅ summary cards + page total, search (client pre-query), date filter, 25/page, mobile + desktop |
| Detail `/sales/[id]` | ✅ items, totals, mechanic, audit fields (`last_edited_by_name/date`) |
| New / edit | ✅ client/mechanic/payment mode, dynamic item rows, free-text item, total preview |
| RPC contract | ✅ `save_direct_sale` — snake_case `product_id` (nullable), integer qty, price; total server par recompute |
| `typecheck` / `lint` / `test` | ✅ pass — **49 tests / 10 files** |

Honest notes:
1. **Stock deduct nahi hota** — RPC sirf header + items atomic save karta hai (existing DB behaviour).
2. **Sale delete** v1 me nahi (existing app me bhi hard-delete flow nahi) — edit se correction.
3. `direct_sales` header par unique `sale_code` index nahi; sequence race accepted (documented §5.2).
4. **Mutations live DB par submit nahi kiye gaye.**

**Phase 6 Attendance verification (2026-11-01, zero DDL, reads only):**

| Check | Result |
| --- | --- |
| Daily `/attendance` | ✅ date nav/picker, per-mechanic cards, status + time in/out, live worked/OT/auto-close preview, mark-all-present |
| Monthly `/attendance?view=month` | ✅ day matrix (P/H/A colors), totals, worked/OT, salary earned, prev/next month |
| Self punch | ✅ geolocation → hidden lat/lng → `selfPunchAction` (mechanic-linked profiles only) |
| Geofence | ✅ haversine + radius 20–5000 m; disabled/unconfigured → fail-open |
| Hours engine | ✅ duty schedule → biz hours → 10:00–20:00 fallback, overnight support, auto-close duty end + 15 min, <6h half-day |
| `typecheck` / `lint` / `test` | ✅ pass — **52 tests / 11 files** |

Honest notes:
1. **Self punch ke liye `profiles.mechanic_id` linked hona zaroori hai**; warna action friendly error deta hai.
2. Weekly-off/holiday calendar DB me nahi hai — salary = daily salary × (present + half ÷ 2).
3. Admin ki manual save **auto-derived columns** (worked/OT/auto-close) compute karke likhti hai; previous open days ka auto-close self check-in par chalta hai.
4. **Mutations live DB par submit nahi kiye gaye.**

**Attendance month-view fixes (2026-11-01, zero DDL, reads only):**

| Check | Result |
| --- | --- |
| Month range | ✅ `istMonthDays` first–last day; October query poore 31 din (pehle sirf last day aata tha); `getAttendanceMonth` active mechanics + optional `mechanic_id` scope |
| Calendar data | ✅ 2026-10 grid me multiple dates par P/H/A dots + initials render (live read) |
| Inline edit | ✅ admin day cell click → `?view=month&month=…&date=…`, selected highlight + `AttendanceDayForm` same page par (save gated by `saveAttendanceAction`) |
| Staff month view | ✅ Monthly toggle sabhi staff roles ko; staff query `mechanic_id` scoped, calendar cells non-clickable, "view only" note |
| Day/month nav | ✅ prev/next + date/month picker URL change karte hain; uncontrolled inputs `key` se reset hote hain (stale value fix), form state bhi date key se remount |
| Dark select options | ✅ native `<option>/<optgroup>` popover tokens (`--popover`/`--popover-foreground`) + inherited `color-scheme: dark` |
| `typecheck` / `lint` / `test` | ✅ pass — **61 tests / 12 files**; smoke + mobile Playwright ✅ |

Honest notes:
1. Staff month view read-only hai (calendar cells link nahi); staff ke liye edit form kabhi render nahi hota.
2. Live verification admin login se kiya gaya; staff login ke credentials `.env.local` me nahi hain, isliye staff screen code path + role helpers/tests se verify hua.
3. **Koi DB write/migration nahi** — sirf reads aur UI/date-helper changes.

**Phase 7 Settings verification (2026-11-01, zero DDL, reads only):**

| Check | Result |
| --- | --- |
| Tabs | ✅ Business profile, Attendance & geofence, System info (`?tab=`) |
| Business profile | ✅ name/short name/owner/contact/email/GSTIN/UPI/address/announcement/footer + logo/cover |
| Attendance settings | ✅ biz hours + working days + geofence enabled/lat/lng/radius (validated) |
| Uploads | ✅ `media/settings/*` (compress + 1 MB guard), `next/image` `unoptimized` |
| Access | ✅ save sirf admin/developer; baaki staff read-only banner |
| Cache | ✅ `updateTag("system-info")` + `revalidatePath("/", "layout")`; sidebar logo/name cached public settings se |
| Secrets | ✅ `ai_api_key` / `csrf_token` kabhi render nahi |
| `typecheck` / `lint` | ✅ pass |

Honest notes:
1. `system_info.meta_field` par unique index nahi — save = update-existing + insert-missing (no `upsert`).
2. `gstin`, `map_iframe` whitelist me hain par UI v1 me `gst_no`/`map_url` edit karta hai (legacy fields intact rehte hain).
3. **Settings writes live DB par submit nahi kiye gaye.**

**Phase 8 Hardening verification (2026-11-01):**

| Check | Result |
| --- | --- |
| `npm run typecheck` / `lint` / `test` | ✅ pass — **52 tests / 11 files** |
| `npm run build` | ✅ pass — **19 routes**, Turbopack, React Compiler |
| Route loading states | ✅ `jobs`/`sales`/`attendance`/`settings` per-route skeletons + shared `PageSkeleton` |
| Playwright smoke | ✅ `e2e/smoke.spec.ts` — live admin login + 8 routes (dashboard, jobs, sales, clients, attendance daily/monthly, settings 3 tabs), **1 passed (25.1s)** |
| E2E config | ✅ `playwright.config.ts`, `npm run test:e2e`; env absent → test skip (credentials repo me nahi) |
| Mobile layouts | ⚠️ desktop smoke only — attendance matrix `overflow-x-auto`, mobile screenshot verification pending |

Honest notes:
1. **Lighthouse/axe/web-vitals gates Phase 8 scope me hain par abhi run nahi kiye** — free tooling installed hai (`@axe-core/playwright`, `@lhci/cli`, `web-vitals`), CI wiring pending.
2. **Vercel deploy nahi hua** — user approval + env vars ke baad.
3. E2E smoke read-only hai; create/update/delete live DB par verify nahi kiye.
4. GitHub Actions workflow me e2e job abhi nahi (credentials CI secret chahiye).
5. `useOptimistic` (§3.1 plan) use nahi hua — server action + `useActionState` pending states + `revalidatePath` shipped; instant optimistic UI future polish.

### 3.2 Rendering + data flow (speed ka core)

```
Browser request
  └─ proxy.ts            → static/asset/public early-return (ZERO auth cost)
                           protected: getClaims() local JWT verify (no network)
  └─ (app)/layout.tsx    → requireSession() [React.cache: 1× per request]
  └─ page.tsx (RSC)      → template + Suspense
        └─ data fn       → Promise.all([ RPC, profile ])   ← 1–2 round-trips max
        └─ HydrationBoundary (TanStack) → client island ko cached data
  └─ client island       → sirf interactive parts (filters, modals, tables)
```

Rules:

- **RSC-first.** Default server component; `"use client"` sirf interactive leaf par.
- **Ek page = existing RPC(s) + parallel PostgREST queries** — koi naya DB function nahi (§5). Dashboard `get_dashboard_stats` + `get_monthly_revenue` + 2–4 list queries `Promise.all` me.
- **Koi `useEffect` fetch nahi.** Data server se aata hai; client refetch sirf mutation/invalidate par.
- **Streaming:** slow widgets `<Suspense>` ke andar; above-the-fold KPI shell pehle paint.
- **`force-dynamic`** authed routes par (cookies) — speed round-trip count aur JS size se aayegi, route cache se nahi.
- **Mutations = Server Actions** (zod validate → Supabase server client with user cookies → RLS). Service role sirf user creation / system-level tasks me.
- **React Compiler ON** (`reactCompiler: true`, Next 16 top-level) — automatic memoization; manual `useMemo`/`useCallback`/`React.memo` **add nahi karenge** jab tak profiler kuch aur na kahe.
- **Cache layers:**

| Layer | Kya | TTL |
| --- | --- | --- |
| Browser HTTP | `_next/static` immutable, Storage images (`cacheControl: 31536000`) | 1 year |
| React `cache()` | session/profile, per request dedupe | request |
| Vercel Data Cache (`unstable_cache`) | **sirf public `system_info`** (anon-readable) — serverless par cross-request persist | 5 min + tag |
| TanStack Query | list/detail snapshots in client | staleTime 30s, gc 5m |
| Postgres | trgm GIN + composite btree + RPC | — |

> User-specific ya staff-only data cross-request cache **nahi** karenge (leak risk). Sirf public system info cacheable hai.
> Next 16 **Cache Components/`use cache`** v1 me **off** rahega (reason §3.6 Deferred) — `unstable_cache` + `force-dynamic` wala simple model.

### 3.3 Performance budgets (CI-enforced)

| Metric | Target (p75, warm) |
| --- | --- |
| TTFB (authed, Vercel `bom1` ↔ Supabase Mumbai) | **< 400ms** |
| LCP | **< 1.8s** |
| INP | **< 200ms** |
| CLS | **< 0.05** |
| First-load JS per route (gzip) | **< 180KB** (dashboard < 210KB) |
| DB round-trips per page load | **≤ 2** (sequential), parallel unrestricted |
| Dashboard RPC | **< 150ms** warm |
| List page (50 rows) | **< 200ms** warm |
| Cold start | cron keep-warm (neeche) |

### 3.4 Free-only stack (koi paid/subscription nahi)

| Need | Chosen (free) | Paid alternative **nahi** use karenge |
| --- | --- | --- |
| Hosting | Vercel **Hobby** free | Vercel Pro |
| DB/Auth/Storage | Supabase **Free** tier | Supabase Pro |
| CI | GitHub **Actions** free | CircleCI paid |
| Keep-warm cron | **GitHub Actions schedule** (5–10 min) | Vercel Pro cron |
| Error logs | Vercel function logs + `console` (server) | Sentry (paid tier) |
| Analytics | Lighthouse CI (GitHub Actions) | Vercel Speed Insights paid / GA360 |
| Charts | Custom SVG/CSS | Recharts is OSS but bundle-heavy — still avoid |
| Fonts | System font stack | Google Fonts network / Adobe Fonts |
| Images | Supabase public Storage + `next/image` | Cloudinary |
| Email (reset) | Supabase Auth built-in SMTP free quota | Resend/SendGrid paid |
| UI kit | shadcn/ui + Radix (MIT) | MUI Pro / Ant Design Pro |
| Auth | Supabase Auth | Clerk/Auth0 |
| E2E | Playwright (Apache-2.0) | BrowserStack |

**Free-tier limits aur mitigation:**

| Limit | Value | Mitigation |
| --- | --- | --- |
| Supabase DB size | 500MB | Abhi data ~10MB; monthly `pg_dump` (free) |
| Supabase storage | 1GB | Client-side image compression (≤1MB, WebP) |
| Supabase egress | 5GB/month | Public CDN caching + `next/image` sizes |
| Supabase project pause | 7 days inactivity | GitHub Actions keep-warm ping |
| Supabase Auth emails | ~3–4/hour free SMTP | Password reset admin-triggered; low volume |
| Vercel bandwidth | 100GB/month | Image optimization + static assets |
| Vercel build minutes (Hobby) | 6,000 min/month | 1–2 builds/day expected |
| GitHub Actions (private repo) | 2,000 min/month | Warm ping 5-min during 09:30–20:30 IST ≈ 1,080 min/month; public repo unlimited |
| Supabase free cold start | ~7.9s observed idle ke baad | Warm ping + first-load skeleton (LCP budget exempt for first hit) |

> **Honest ToS note:** Vercel Hobby plan "personal, non-commercial use" ke liye hai. Internal business tool bhi technically commercial ho sakta hai. Agar ToS strictly follow karna hai to free alternatives: **Cloudflare Workers/Pages free** (OpenNext adapter) ya **Netlify free** — dono commercial use allow karte hain, par setup/risk zyada. Decision §11 me.

### 3.5 Dependency update policy (max updated)

- Scaffold ke waqt sab **exact latest** pin (`npm view` 2026-11-01 se upar table).
- `package-lock.json` commit; `npm ci` CI/deploy me.
- **Dependabot** (GitHub built-in, free) — weekly npm updates + grouped PRs; major bump manually review.
- CI gate (blocking):
  - **Production deps:** `license-checker --production --excludePrivatePackages --onlyAllow "MIT;Apache-2.0;ISC;BSD-2-Clause;BSD-3-Clause;0BSD;Unlicense;CC0-1.0;CC-BY-4.0"` — runtime me koi MPL/copyleft/paid nahi. (`CC-BY-4.0` = `caniuse-lite` data, permissive.)
  - **Dev deps:** same + `BSD;CC-BY-3.0;MPL-2.0;Python-2.0;BlueOak-1.0.0` — `MPL-2.0` sirf `@axe-core/playwright` ke liye (dev-only, shipped nahi); baaki transitive metadata/data licenses hain.
  - **Known exception:** `sharp` ke prebuilt `@img/sharp-libvips-*` binaries (Linux/macOS, dynamically linked) `LGPL-3.0-or-later` hain. `ci.yml` me sirf yehi artifacts `--excludePackages` se gate ke bahar hain (exact `package@version` list). Sharp/libvips bump par list update karni hoti hai — gate jaan-boojh kar red hota hai taaki exception review ho.
  - `npm audit --omit=dev --audit-level=high` (currently **0 production vulnerabilities**) + `npm outdated` **report** (non-blocking, review ke liye).
- Node `.nvmrc` = `24`; `engines.node >= 24.15.0` (jsdom 30 transitive requirement); Vercel project Node 24.

### 3.6 New technology decisions (2026-11-01)

Sirf wahi tech adopt kar rahe hain jo **free/OSS**, **stable**, aur is app ke speed/accuracy me measurable farq de. Hype-driven additions nahi.

#### Adopted

| Tech | Version | Kya fayda | Kahan |
| --- | --- | --- | --- |
| **React Compiler** | 1.0.0 (Next `reactCompiler: true`) | Auto memoization — `useMemo`/`useCallback` manual nahi; fewer re-renders. Next 16 me stable (v16.0.0 se top-level). Build thoda slow, runtime fast. | Phase 0 config |
| **Supabase asymmetric JWT signing keys** + `getClaims()` | project setting | JWT **locally JWKS verify** — auth server round-trip 0. Legacy symmetric keys par `getClaims()` network call karta hai, isliye keys switch zaroori. | Phase 0 auth |
| **Supabase new API keys** (`sb_publishable_…` / `sb_secret_…`) | platform | Legacy anon/service_role 2026 me deprecated. Publishable browser-safe; secret server-only. Env names update. | Phase 0 env |
| **Supabase CLI + generated DB types** | 2.122.0 | `supabase gen types typescript` → typed tables/RPCs; token ho to regen. Abhi scoped `database.types.ts` (6 modules, live PostgREST se verified). | Phase 1 |
| **`@date-fns/tz` (TZDate)** | 1.5.0 | Mixed `timestamp`/`timestamptz` + IST wall-clock quirks ke liye reliable timezone math (manual offset code khatam). | Phase 1 |
| **React 19 `useActionState` + `useOptimistic`** | built-in | Attendance mark / job status toggle **instant UI**, server action background me; client fetch nahi. | Phase 4–6 |
| **Upload-time image compression + immutable cache** | browser canvas + Storage `cacheControl` | `next/image` optimizer quota bachao; uuid filename + `Cache-Control: 1 year` → repeat views CDN/browser cache hit. | Phase 3–6 |
| **axe accessibility gate** | `@axe-core/playwright` 4.14.0 | Har e2e page par critical a11y violations fail. Dev-only MPL-2.0. | Phase 8 |
| **`web-vitals` → `/api/vitals`** | 6.2.3 | Free RUM (LCP/INP/CLS) Vercel logs me; koi paid analytics nahi. | Phase 8 |
| **`pg_stat_statements`** | Postgres extension | Slow query ranking; `EXPLAIN` se RPC verify. Free. | Phase 1 |
| **Second free Supabase project = staging** | Free plan 2 projects | Future optional DDL pack test karne ke liye; v1 zero-DDL hai isliye abhi zaroorat nahi. | Deferred |
| **Bundle analyzer + size-limit** | 16.4.3 / 14.3.0 | Route JS budget CI me enforce. | Phase 0 |

#### Deferred (v2 ke baad, reason ke saath)

| Tech | Kyun abhi nahi |
| --- | --- |
| **Next 16 Cache Components / `use cache`** | Stable hai, par serverless par default in-memory cache requests ke beech persist nahi karta; authed pages dynamic hain. Static shell ka limited fayda, poora rendering model badalna padega. Public `system_info` ke liye **`unstable_cache` (Vercel Data Cache)** use karenge, jo free aur cross-request persistent hai. v1 ke baad revisit. |
| **TanStack Table v9** | Dense tables ke liye accha, par ~15–20KB aur API churn; v1 me server-paginated hand-rolled table kaafi. |
| **Supabase Realtime** | Live attendance/dashboard achha lagega, par v1 me extra complexity; TanStack refetch + server actions se kaam chalega. |
| **Materialized views + pg_cron** | Abhi 2.2k jobs par zaroorat nahi. 50k+ rows par dashboard/client financials ke liye. |
| **Passkeys (`@simplewebauthn`)** | DB ready hai; auth v1 email/password. |
| **PWA / Serwist / offline** | Cache freshness aur auth complexity; admin app ke liye v1 me nahi. |
| **Temporal API** | Baseline support abhi universal nahi; `@date-fns/tz` sufficient. |

#### Rejected (deliberate)

| Tech | Kyun nahi |
| --- | --- |
| Drizzle / Prisma / tRPC | Supabase RPC + generated types + Server Actions kaafi; extra layer = extra bundle/maintenance. |
| Redux / Zustand | Server state RSC + TanStack Query se solve; global client store ki zaroorat nahi. |
| Biome (ESLint/Prettier replace) | Fast hai, par Next-specific lint rules (`eslint-config-next`) nahi deta. |
| Base UI (Radix alternative) | Promising, par Radix zyada mature; UI churn avoid. |
| Recharts / Chart.js | 2 simple charts ke liye 60–90KB unnecessary; custom SVG. |
| Sentry / Umami / PostHog | Paid ya self-host infra; Vercel logs + web-vitals free. |
| Cloudinary | Supabase public Storage + compression kaafi. |
| Auth0 / Clerk | Supabase Auth already. |
| Vercel Edge runtime for DB pages | Edge se Supabase RTT zyada; `bom1` Node runtime better. |
| `next/image` optimizer for every upload | Free-tier quota; uploads pre-compressed + `unoptimized`. |

---

## 4. Proposed folder structure

```
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx                 # shell + requireSession + role gate
    (app)/dashboard/page.tsx
    (app)/clients/page.tsx
    (app)/clients/[id]/page.tsx
    (app)/jobs/page.tsx              # jobsheet list
    (app)/jobs/new/page.tsx
    (app)/jobs/[id]/page.tsx
    (app)/sales/page.tsx
    (app)/sales/new/page.tsx
    (app)/sales/[id]/page.tsx
    (app)/attendance/page.tsx
    (app)/settings/page.tsx
    api/health/route.ts              # keep-warm ping (GitHub Actions)
  components/
    layout/{AppShell,Sidebar,Topbar,UserMenu}.tsx
    ui/                              # shadcn primitives
    data/{DataTable,Pagination,FilterBar,StatCard,EmptyState,ConfirmDialog}.tsx
    charts/{RevenueBars,StatusDonut,TrendSpark}.tsx
    forms/{ClientForm,JobForm,SaleForm,AttendanceGrid,SettingsForm}.tsx
  lib/
    supabase/{server,client,admin}.ts
    auth/{session,require}.ts        # getClaims + React.cache profile
    db/queries/{dashboard,clients,jobs,sales,attendance,system}.ts
    actions/{clients,jobs,sales,attendance,settings,auth}.ts
    domain/{status,client-name,money,dates,duty,attendance-hours}.ts
    cache/{system-info,keys}.ts
    validation/{client,job,sale,settings}.ts
  proxy.ts
  styles/globals.css
```

---

## 5. Database work — v1: ZERO changes (shared DB policy)

**Decision (2026-11-01, user-locked):** DB `vtech-frontend` ke saath **shared** hai. v1 me **koi DDL nahi** — na table/column, na policy, na function, na index. Sirf **existing** objects read/write honge. Isi liye `supabase/migrations` me koi nayi file nahi banti.

### 5.1 Existing objects jo reuse honge (repo migrations me verified)

| Need | Existing object |
| --- | --- |
| Dashboard counts + today revenue | `get_dashboard_stats(p_today_start, p_today_end)` |
| 12-month revenue | `get_monthly_revenue(p_months)` |
| Client financials (531 clients) | `get_clients_page_financials()` |
| Financial summary | `get_financial_summary(p_from, p_to)` |
| Job id claim (atomic) | `next_job_id()` |
| Job id preview (read-only) | `peek_next_job_id()` |
| Sale header + items atomic save | `save_direct_sale(...)` — `sale_code` caller deta hai |
| List/filter/search + pagination | PostgREST `select` + `count: exact` + `range` + **existing** trgm GIN indexes |
| Attendance upsert | PostgREST upsert on unique `(mechanic_id, curr_date)` |
| Settings upsert | PostgREST upsert on `system_info` |
| Indexes | `20261018_perf_indexes.sql` ke trgm + hot btree indexes **already applied** |

### 5.2 Tradeoffs (honest)

- **Dashboard** 1 RPC ki jagah **3–6 parallel PostgREST calls** lega. Parallel = 1 RTT, isliye latency lagbhag same; thoda zyada function overhead.
- **Jobsheet create** = 3 writes (`next_job_id()` → header insert → items insert). `job_id` atomic hai; beech me fail hone par retry/cleanup server action handle karega.
- **Daily `code`** (`YYYYMMDD` + seq) generation me race possible — **wahi race jo purane app me documented hai**. Concurrency 2–4 staff hai, isliye practical risk kam; server action insert ke baad code verify + retry karega. DB guarantee nahi (unique index nahi hai).
- **`sale_code`** race bhi same; `save_direct_sale()` header+items atomic karta hai, par code caller generate karta hai.
- **Shared-DB safety:** koi unique index nahi lagayenge — warna purana app duplicate `sale_code` insert kare to uski write fail ho jayegi.
- **RLS change nahi:** settings write abhi bhi staff ko allowed hai; v2 me **app-level gate** (admin/developer) lagega. DB-level enforcement nahi hoga — ye accepted risk hai.

### 5.3 Optional future pack (deferred — v1 me nahi)

Sirf tab jab `pg_stat_statements`/profiling bottleneck dikhaye, aur old app idle ho; rollback = `DROP FUNCTION`/`DROP INDEX`. Sab **additive + `v2_`-namespaced**:

- Read: `v2_dashboard`, `v2_jobsheet_list`, `v2_clients_list`, `v2_sales_list`
- Write: `v2_create_jobsheet` (job_id + code + header + items ek transaction), `v2_create_direct_sale`
- Index: `attendance_list(curr_date, mechanic_id)`
- Unique `direct_sales(sale_code)` — **sirf duplicate audit ke baad**

### 5.4 Read-only verification (v1)

1. `supabase gen types typescript --linked > src/types/database.ts` — generated types, **koi schema change nahi**.
2. `EXPLAIN (ANALYZE, BUFFERS)` se existing RPCs/list queries verify (read-only).
3. `pg_stat_statements` (already available) se slow query ranking.
4. Future unique index se pehle duplicate audit:
   `select sale_code, count(*) from direct_sales group by 1 having count(*) > 1;`

---

## 6. Module specs

### 6.1 Login + shell

- `/login`: email + password server action (`signInWithPassword`), error messages generic, redirect to `?next=` (validated same-origin).
- `proxy.ts`: static/asset/public early-return **before** Supabase client; protected par `getClaims()`; expired par refresh fallback. `getUser()` har request par **kabhi nahi**.
- `src/proxy.ts` matcher: `/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)`.
- `(app)/layout.tsx`: `React.cache` session+profile; no profile row → access denied screen (fail-closed).
- Sidebar: Dashboard, Jobsheet, Sales, Clients, Attendance, Profile; Settings sirf admin/developer ko. Staff ke liye Settings nav me nahi aata aur direct URL `/dashboard` par redirect hota hai (`canViewSettings`). Client role: Phase 2.
- Logout server action. Session cookie `httpOnly`, sameSite=lax.
- User creation: admin-only server action (`admin` client + `profiles` explicit insert) — no public signup.

**Acceptance:** logged-out protected route → 307 login; warm nav me auth RTT 0 (asymmetric keys) ya 1 cached call; login → dashboard 1 redirect.

### 6.2 Dashboard (`/dashboard`)

- Data: `get_dashboard_stats` + `get_monthly_revenue` + 4 list queries **parallel** `Promise.all` me, phir ek batched `client_list` name lookup (2 sequential round-trips).
- UI: 4 KPI cards (today revenue, in-progress, completed, clients/mechanics), 12-month revenue bars, job-status mix, today's attendance strip, recent jobs table (8), recent payments (6), greeting + IST date, quick actions.
- Low stock + receivables widgets `2b` me — abhi ke liye deferred, kyunki inventory RPC poora catalog scan karta hai aur receivables `get_clients_page_financials` par depend karta hai; dashboard ki warm load fast rakhne ke liye.
- Charts: custom SVG/CSS; **recharts bundle nahi**.
- Staff variant (`canViewFinancials` false): "Aaj ki kamai" KPI, 12-month revenue chart, payments panel aur recent-jobs amount column **nahi** render hote; revenue/payments queries bhi skip hoti hain. Sirf operational counts + attendance dikhte hain.
- States: single `<Suspense>` skeleton (KPI shell pehle paint), per-widget empty states.
- Responsive: mobile par chart last 6 months dikhata hai; jobs table `table-fixed` (no page overflow); 390px par verified.
- **Acceptance:** warm load < 1.8s LCP, ≤ 2 **sequential** round-trips (parallel queries free), route JS < 210KB gzip.

### 6.3 Settings / System info (`/settings`)

Tabs:

1. **Business profile** — `name, short_name, logo, cover, email, contact, address, owner, biz_days, biz_open, biz_close, gst_no, gstin, map_url, map_iframe, whatsapp, facebook, instagram, youtube, footer_text, announcement`.
2. **Attendance** — `geofence_enabled, geofence_lat, geofence_lng, geofence_radius_m` + office hours.
3. **System info** (read-only) — app version/commit, environment, DB latency (server-measured), key table counts, storage bucket list, Supabase region, last migration time.

- Read: `system_info` select (single row); public subset `unstable_cache` (tag `system-info`, 5 min).
- Write: `system_info` **upsert** (PostgREST); server action **admin/developer only**; `revalidateTag('system-info')`.
- Uploads: logo/cover → `media` bucket, client-side compress (≤1MB, WebP/JPEG), `next/image` se render.
- Never render or send `ai_api_key`, `csrf_token`.

**Acceptance:** save → 1 RPC, cache invalidated, sidebar name/logo turant update; staff ke liye poora module hidden (nav + route redirect) aur writes server par rejected.

### 6.4 Attendance (`/attendance`)

- **Daily tab:** date picker (IST), active mechanics (`mechanic_list.delete_flag=0`, `status=1`), status buttons 1/2/3 + unmarked, `time_in/time_out`, worked hours/OT (derived), geofence badge.
- **Role rules (UI + server action):** admin/developer kisi bhi date ki attendance edit kar sakte hain (past included). Staff (`isSelfServiceAttendance`) day view me sirf aaj ka din dekhta hai — data query `mechanic_id` se scoped, times read-only, aur edit form sirf `canManageAttendance` par render hota hai. Staff ka check-in/out server timestamp (`nowISTTime`) se hota hai, client time nahi bhej sakta; `saveAttendanceAction` staff ke liye rejected.
- **Staff self check-in/out:** browser geolocation → geofence config; distance + lat/lng audit columns; denied location → friendly error. Admin "Mark all present" bulk.
- **Monthly tab (all staff roles):** calendar-style month grid (Sun–Sat), har din cell me mechanics ke status dots + initials, today highlight. Month query poore mahine ka date range cover karta hai (`istMonthDays`), aur staff ke liye `mechanic_id` scoped + read-only hota hai (calendar cells non-clickable). Admin/developer ke liye day cell click → usi page par daily edit form (selected day highlight), niche per-mechanic summary (present/half/absent, worked hours, OT, salary earned using `mechanic_list.daily_salary`). Salary sirf `canViewFinancials` par.
- Rules (purane tested libs reuse): status 1 present, 2 absent, 3 half-day; no checkout + past duty end → effective out = duty end (auto-closed, 0 OT); <6h = half-day; duty from `staff_duty_schedule` else `biz_open/biz_close` else 10:00–20:00, overnight supported, 15-min grace.
- Writes: PostgREST upsert on unique `(mechanic_id, curr_date)` (bulk); derived cols server-side.
- **Acceptance:** day view 1 query; month view 1 date-range query; duplicate row impossible (unique constraint); reload par marked state correct.

### 6.5 Clients (`/clients`)

- List: server pagination (25), search by name/contact/email/address (`q`), due-only toggle, columns: name, contact, total billed, paid, **due**, advance/last txn; mobile pe card layout.
- Financial formula: `billed = opening_balance + repair(status=5) + direct_sales`; `paid = Σ(client_payments.amount + discount)`; `due = billed − paid`; loans alag (`active_loan_given`, `loan_repaid`). Sab kuch `get_clients_page_financials` RPC se — client JS me aggregation nahi.
- Detail `/clients/[id]`: profile (initials avatar), KPIs, jobs list, direct sales, payments (read-only, net + discount), loans (read-only), contacts (read-only), WhatsApp/tel links.
- Add/edit: `client_list` insert/update (existing `client_list_id_seq`); zod validation; empty strings → null; `delete_flag=1` soft delete (admin/developer only, confirm dialog).
- Staff variant: client list ka billed/paid/due aur "Total due" card, detail ka due badge, payments ledger, financials breakdown aur loans **staff ko bhi dikhte hain** (due follow-up ke liye zaroori). Company-wide totals (dashboard revenue, sales page total, attendance salary) staff se hidden rehte hain.
- **Acceptance:** list warm load fast; due numbers RPC se; detail 2 round-trips max.
- **Client photo removed (2026-11-01):** add/edit form se photo upload option hata diya; detail page initials avatar dikhata hai. `client_list.image_path` column shared DB me untouched hai (zero-DDL), aur pehle se uploaded files delete nahi ki gayi.

### 6.6 Sales (`/sales`, direct sales)

- List: paginated, search `sale_code`/remarks/client, date range, totals, payment mode badge; row → detail.
- Create/edit: client (searchable), mechanic optional, payment mode, remarks, product line items (qty × price), live total (server recomputes).
- Save via `save_direct_sale` RPC (atomic header+items, total server-recomputed); `sale_code` app-generated daily seq + post-insert verify/retry.
- Detail: header, items, total, audit (last edited by/date).
- Stock: v1 me sale creation **stock deduct nahi** karta (old behavior bhi direct sale stock ledger se alag tha) — inventory module ke saath aayega. Isko UI me note karenge.
- **Acceptance:** create 1 RPC; duplicate `sale_code` max 1 retry (no unique index — zero-DDL); concurrent save par totals consistent.

### 6.7 Jobsheet (`/jobs`)

- List: paginated, filters (status chips, date range, mechanic), search `job_id`/`item`/`fault`/`code` (trgm), columns: job_id, client, item, mechanic, amount, status, created/updated.
- Create: client (inline add optional), mechanic, item, fault, remark, location/spot, services + products line items, commission (mechanic % or manual), job images. `job_id` preview via `peek_next_job_id()` (read-only, no waste); actual claim on save.
- Edit: header update + items replace (multi-write; verify after write).
- Status flow: 0 → 1 → 2 → 3 → 5 with cancel 4; `date_completed` set on finish/deliver. Status change = small dedicated RPC/update (1 round-trip).
- Detail: full job card, items, images, client link, status timeline, print-friendly layout (print CSS; PDF/print module baad me).
- `user_id` = session profile → `mechanic_id` fallback 0.
- **Acceptance:** create 3 writes (`next_job_id` claim → header insert → items insert); no duplicate `job_id` (atomic counter); 2,229 jobs list < 200ms; edit items consistent with verify/retry.

### 6.8 Profile (`/profile`)

- Sabhi team roles ke liye: name, email, role, mechanic link, account created, last sign-in (Supabase Auth user se).
- Self password change: purana password throwaway client se verify, phir cookie-bound `updateUser`; naya password 8–72 chars; optional "baaki devices sign out" (`signOut({ scope: "others" })`). Best-effort audit (`Team/update`, "Password changed (self)").
- Shared Supabase login hai, isliye password change dono apps par lagu hota hai — UI me note.
- **Acceptance:** galat purana password friendly error; success par form reset + message; current session valid rehta hai.

---

## 7. Performance playbook (non-negotiable rules)

### Do

1. `proxy.ts` me **early-return pehle**, phir `getClaims()`; `getUser()` sirf refresh fallback.
2. Har page ka data **RSC me**; `Promise.all`; max 2 sequential round-trips.
3. List = **server pagination** (keyset ya limit/offset) + server filters; client-side "fetch all → filter" banned.
4. Explicit columns; **`select('*')` banned** (lint rule).
5. Reference data (mechanics/products/services) ek call; client cache 5 min.
6. Mutations → Server Action → RPC; success par `revalidatePath`/`invalidateQueries`.
7. **Generated DB types** (`src/types/database.ts`) — RPC args/returns compile-time checked; `as any` banned.
8. Charts custom SVG; heavy libs `dynamic()` + below-fold only.
9. Images: uploads par browser canvas compression (≤1MB, WebP) + uuid filename + Storage `cacheControl` 1 year; render `next/image` `sizes` ke saath, **`unoptimized`** (already compressed — optimizer quota bachao).
10. Skeleton `loading.tsx` har route; above-fold shell static.
11. System font stack (no Google Fonts network); `tabular-nums` for money.
12. `vercel.json` region = Supabase ke closest (Mumbai `bom1` ↔ `ap-south-1`); Node runtime (Edge nahi).
13. **React Compiler** on — manual memo only jab `web-vitals`/profiler issue dikhaye.
14. **Keep-warm (free):** `/api/health` ko **GitHub Actions schedule** se ping karo — har 5–10 min, 04:00–15:30 UTC (09:30–20:30 IST), Mon–Sat. Vercel Hobby cron daily-only hai, isliye GH Actions. Free-tier 7.9s cold start ko directly hit karta hai.

### Don't

- Middleware me `getUser()` per request.
- `useEffect` fetch waterfalls.
- `select('*')` / unbounded queries.
- Service role browser bundle me (kabhi nahi).
- User-specific data cross-request cache.
- Realtime/polling loops v1 me.
- Bhaari UI kit / icon barrel imports.
- Client-side money aggregation (SQL kare).

---

## 8. Security

- **RLS hi primary gate.** Browser me sirf **publishable key** (`sb_publishable_…`); **secret key** (`sb_secret_…` / legacy `service_role`) sirf `lib/supabase/admin.ts` (server-only, `import 'server-only'`). Legacy anon/service_role env names v1 me **replace** karenge (2026 me deprecated).
- **Auth verification:** project par asymmetric signing keys (RS256/ES256) already hain to `getClaims()` JWKS se **locally** verify karega (RTT 0). Ye **DB change nahi**, Supabase Auth setting hai; par shared project par key rotation old app ko affect kar sakta hai, isliye v1 me setting **jaisi hai waisi** rahegi — asymmetric ho to `getClaims()`, warna `getUser()` (1 cached auth call). Keys switch alag approval ke baad.
- Writes: server action me role check **+** RLS (defence in depth). `profile` absent → fail closed.
- Settings: **admin only** (server check). Asli DB policy `hardening_sysinfo_staff` admin + staff deti hai aur `developer` ko block karti hai — isliye app gate admin-only rakha (developer ko UI se settings write nahi; DB-level staff write accepted risk, zero-DDL). `ai_*`/`csrf_token` kabhi client ko nahi.
- **Staff financial visibility (UI-level):** `canViewFinancials` se dashboard revenue, sales page total aur attendance salary hide hote hain. Client-level dues/billed/paid/ledger staff ko visible hain (follow-up ke liye). Ye **security boundary nahi hai** — RLS unchanged (zero-DDL) hone ki wajah se staff apne JWT se Supabase API par wohi tables directly padh sakta hai. Real enforcement ke liye shared DB me policy/view change chahiye (vtech-frontend ke saath coordinate karna hoga).
- Storage: public read buckets; upload/delete policies already `is_frontend_staff()`.
- Input validation: zod at boundary; SQL RPCs parameterized (injection-safe).
- Headers: CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS (Vercel).
- Login: Supabase Auth rate limits; no custom `users` password path. `login_throttle` v2 me use nahi.
- Audit: `activity_logs` writes for create/update/delete (module names old convention: `Jobs`/`Sales`/`Clients`/`Attendance`).
- Secrets: `.env.local` gitignored; Vercel env vars (Production/Preview alag); secret key **kabhi** `NEXT_PUBLIC_*` me nahi. Staging project ki keys live se alag.

---

## 9. Implementation phases (estimates for 1 dev)

| Phase | Deliverable | Est. |
| --- | --- | --- |
| **0. Foundation** | git init, Node 24 pin, **exact latest deps (§3.1)**, Next 16 + **React Compiler** + TS 6.0.3 + Tailwind v4 + shadcn, env validation (publishable/secret keys), **existing JWT mode ke hisaab se `getClaims()`/`getUser()`**, Supabase clients, proxy, login, shell, `/api/health`, GitHub Actions (typecheck/lint/test/build + license/audit + keep-warm cron), **bundle analyzer + size-limit**, Dependabot | 2–3 days |
| **1. Data layer (zero DDL)** | scoped `database.types.ts` (hand-pinned; CLI token ke bina), typed mappers over **existing** RPCs + PostgREST, domain constants, `@date-fns/tz` date utils, Vitest for mappers/attendance rules, read-only live smoke | 2–3 days |
| **2. Dashboard** | `get_dashboard_stats` + parallel queries + UI + charts + skeletons + perf gate | 3–4 days |
| **3. Clients** | list/detail/create/edit + financials + e2e (photo upload baad me hata diya) | 4–5 days |
| **4. Jobsheet** | list/create/edit/detail/status/images + 3-write create (`next_job_id` → header → items) + e2e | 5–7 days |
| **5. Sales** | list/create/edit/detail + `save_direct_sale` + e2e | 3–4 days |
| **6. Attendance** | daily + self check-in/geofence + monthly + salary hours + `useOptimistic` states + e2e | 4–5 days |
| **7. Settings** | business profile + geofence + system info + uploads + cache tags | 2–3 days |
| **8. Hardening** | Lighthouse budgets, **axe a11y gate**, `web-vitals` RUM, query plans, security review, Vercel deploy, cron, monitoring | 3–4 days |

**Total ≈ 4.5–5.5 weeks.** Har phase ke baad deploy-able build + merge.

---

## 10. Testing / QA

- **Unit (Vitest):** status maps, client-name cast, money/date IST (`@date-fns/tz`), attendance derive/OT, zod schemas, RPC payload builders.
- **E2E (Playwright):** login → dashboard; client CRUD (**double-gated**: `E2E_MUTATIONS=1` + `E2E_ALLOW_LIVE_DB_WRITES=1`); job create → status flow; sale create; attendance mark/self-checkin; settings save. Mobile 390px overflow check (`e2e/mobile.spec.ts`).
- **Accessibility (axe):** har e2e page par `@axe-core/playwright` — critical/serious violations fail (login, dashboard, har list/detail).
- **Perf:** Lighthouse CI budgets (§3.3); `size-limit` route JS budgets; `web-vitals` beacons (`/api/vitals` logs) se real p75; `EXPLAIN ANALYZE` for 6 RPCs.
- **Supply chain (free):** `license-checker` allowlist (production strict — sirf permissive; dev me MPL-2.0 sirf axe + data licenses CC-BY), `npm audit --omit=dev` (0 prod vulns), `npm outdated` report, Dependabot weekly PRs.
- **Data safety:** v1 **zero DDL** — koi migration nahi. Writes existing constraints par; e2e se pehle read-only audit queries, phir non-peak me ek test client/job. Staging project sirf future optional pack ke liye.
- **Regression:** role matrix (admin/developer/staff) — staff ko settings write nahi, developer ko nahi (jab tak policy fix na ho).

---

## 11. Decisions needed / risks

| # | Item | Recommendation |
| --- | --- | --- |
| 1 | **Settings write access** — current RLS allows admin **+ staff**, blocks `developer` | **DB policy nahi badlegi (zero DDL).** v2 me server-action role gate **admin only** (`canManageSettings`); developer ka app-level write band, kyunki DB policy use pehle hi reject karti hai. DB-level staff write abhi bhi possible rahega — accepted risk, old app compatibility ke liye. |
| 18 | **Shared DB with `vtech-frontend`** | **Zero DDL in v1** (user-locked). Sirf existing RPCs + PostgREST. Future perf/correctness pack optional (§5.3), old app idle hone par. |
| 2 | **Hosting** — Vercel Hobby free, lekin Hobby ToS "non-commercial" | Internal business tool bhi commercial maana ja sakta hai. Strict rehna ho to **Cloudflare Workers/Pages free** ya **Netlify free** (commercial allowed). Default: Vercel Hobby (fastest), ToS risk aapka call. |
| 3 | **Supabase free tier** cold start 7.9s | Free keep-warm: GitHub Actions ping every 5–10 min (§3.4). Pehla hit phir bhi thoda slow ho sakta hai — skeleton se mask karenge. |
| 10 | **TypeScript version** | **6.0.3 pinned** — TS 7.0.2 par build/typecheck pass, lekin `typescript-eslint` (ESLint config ke andar) TS 7 reject karta hai. TS 7 support aane par bump. |
| 13 | **Local Node 24.13.0** (jsdom 30 wants ≥24.15) | Node latest 24 LTS par upgrade karo (free). Tab tak sab chalta hai, sirf npm engine warning. |
| 11 | **Dependency updates** | Exact latest pins + Dependabot weekly; major bumps manually tested. Koi paid dep kabhi nahi. |
| 12 | **Vercel free build minutes** | 6,000 min/month; 1–2 builds/day assumed. CI heavy e2e sirf PR par. |
| 4 | **Supabase region** | Vercel `bom1` ke saath `ap-south-1` (Mumbai) best. Verify karke region lock karenge. |
| 5 | **Attendance v1 scope** — self check-in + geofence included | Haan (attendance ka core). Agar sirf admin marking chahiye to 1–2 din bach jayenge. |
| 6 | **Print/invoice** | v1 se bahar; job/sale detail print-friendly CSS milega. |
| 7 | **Legacy `transaction_list.code` duplicates** | Koi DB index nahi. Naye codes server action me `job_id`-based daily seq + post-insert verify/retry se banenge; theoretical race accepted (zero-DDL constraint). |
| 8 | **Admin se role profile** | New auth users ke liye explicit profile creation zaroori (trigger dropped). Admin-only user creation flow Phase 0 me. |
| 9 | **`users` table** | v2 session/profile use karega; legacy `users` sirf `user_id` mapping ke liye. |
| 14 | **React Compiler** enable karna | Haan — Next 16 me stable, runtime re-render kam. Build time thoda badhega; `next build` smoke test Pass. |
| 15 | **Supabase JWT keys asymmetric + new publishable/secret keys** | Haan — Phase 0 me project settings se switch. Purane clients/environment variables ko update karna hoga (koi downtime nahi, Supabase dono keys parallel support karta hai). |
| 16 | **Staging Supabase project (free 2nd project)** | **Deferred** — v1 zero-DDL hai, isliye abhi zaroorat nahi. Future optional pack test ke liye. |
| 17 | **Cache Components / `use cache`** | **Nahi v1 me** — serverless par in-memory cache persist nahi karta; `unstable_cache` (public system info) + `force-dynamic` sufficient. Baad me revisit. |

### Honest risks

- **Agar purana app production me chalu hai**, dono apps ek hi DB par likhenge → job/sale **code** races aur data conventions drift. `job_id` safe hai (`next_job_id()` atomic), par daily `code`/`sale_code` me theoretical race hai — post-insert verify/retry se handle karenge. Recommendation: v2 writes pehle non-peak hours me try karo, ya cutover plan banao (ek app read-only).
- **Attendance geofence** browser permissions par depend karta hai; desktop par GPS weak ho sakta hai — manual override (admin) rakhenge.
- **Supabase RLS role lookup** per query hai; scale (10k+ rows, many users) par JWT-claim hook + policy rewrite lagega. Abhi data chhota hai.
- **Legacy data edge cases** (non-numeric `client_name`, mixed timezones) — mappers me guard, par kuch purane rows UI me "unknown client" dikh sakte hain. Pehle read-only audit query chalayenge.

---

## 12. Definition of done (Phase 1)

- [x] 6 modules production build par, role matrix correct (settings admin/developer read + admin write, staff hidden; financial totals admin/developer only; team creation admin-only; delete admin+developer; audit write admin+staff — DB RLS ke mutabik).
- [x] Authed perf budgets: Lighthouse desktop (prod build) — dashboard 86, jobs 100, clients 100; a11y 99/99/99; size-limit JS 260.4 kB ≤ 320 kB, CSS 7.3 kB ≤ 60 kB.
- [x] Har page ≤ 2 sequential DB round-trips; koi `select('*')`/waterfall nahi (ESLint ban).
- [x] Create flows existing objects par: `next_job_id()` + insert, `save_direct_sale` RPC, attendance unique-day upsert; `code`/`sale_code` post-insert verify + retry.
- [ ] RLS write paths live-tested (staff/developer/admin) — code aur policy review complete; live mutation tests user approval ke bina pending.
- [x] **Zero DDL verified**: koi migration/table/column/policy/function/index change nahi; sirf read-only queries chali.
- [x] CI: typecheck + lint + unit (59) + e2e (smoke + axe + mobile + team + login + profile) + Lighthouse budgets + size-limit + license allowlist + `npm audit` green.
- [ ] Vercel (free) deploy + GitHub Actions keep-warm cron — deploy user approval ke bina pending.
- [x] Koi paid service/subscription integrate nahi hui (deps 100% OSS).

---

## 13. Appendix A — pinned `package.json` (initial)

```json
{
  "type": "module",
  "engines": { "node": ">=24.15.0" },
  "dependencies": {
    "@date-fns/tz": "1.5.0",
    "@hookform/resolvers": "7.0.1",
    "@supabase/ssr": "0.12.7",
    "@supabase/supabase-js": "2.118.0",
    "@tanstack/react-query": "5.105.1",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "date-fns": "4.4.0",
    "lucide-react": "1.66.0",
    "next": "16.4.3",
    "next-themes": "0.4.6",
    "radix-ui": "1.8.1",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "react-hook-form": "7.91.0",
    "server-only": "0.0.1",
    "sharp": "0.35.5",
    "sonner": "2.0.8",
    "tailwind-merge": "3.7.0",
    "tw-animate-css": "1.4.0",
    "web-vitals": "6.2.3",
    "zod": "4.6.7"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.14.0",
    "@lhci/cli": "0.15.1",
    "@next/bundle-analyzer": "16.4.3",
    "@playwright/test": "1.64.1",
    "@size-limit/preset-app": "14.3.0",
    "@tailwindcss/turbopack": "4.3.3",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@types/node": "24.19.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "@vitest/coverage-v8": "5.0.5",
    "babel-plugin-react-compiler": "1.0.0",
    "eslint": "10.14.0",
    "eslint-config-next": "16.4.3",
    "jsdom": "30.1.3",
    "license-checker": "25.0.1",
    "prettier": "3.9.10",
    "prettier-plugin-tailwindcss": "0.8.1",
    "size-limit": "14.3.0",
    "supabase": "2.122.0",
    "tailwindcss": "4.3.3",
    "typescript": "6.0.3",
    "vite": "8.3.5",
    "vitest": "5.0.5"
  }
}
```

> UI primitives shadcn conventions par hand-written hain (`src/components/ui/*`, cva + radix-ui + `cn`), koi CLI-generated dependency drift nahi. Naye components isi pattern par add honge. `package.json` me koi `^`/`~` nahi; CI check karega.

## 14. Appendix B — free keep-warm workflow (GitHub Actions)

`.github/workflows/keep-warm.yml`:

```yaml
name: keep-warm
on:
  schedule:
    - cron: "*/10 4-15 * * 1-6"   # 09:30–20:30 IST, Mon–Sat
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS --max-time 20 "${{ secrets.APP_HEALTH_URL }}"
```

- `/api/health` khud ek tiny **publishable-key** Supabase query (`system_info` public key) chalata hai — ek ping se Vercel function + Supabase DB dono warm. Secret key workflow me **kabhi nahi**.
- Private repo: ~540 min/month (2,000 free) — limit ke andar.

---

## 15. Appendix C — `next.config.ts` + env names (new tech ke saath)

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,                  // Next 16 top-level (stable)
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "<project-ref>.supabase.co", pathname: "/storage/v1/object/public/**" }],
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
      ]},
    ];
  },
};

export default nextConfig;
```

> `cacheComponents` **off** (reason §3.6). Bundle analyzer sirf `ANALYZE=1 npm run build` par `dynamic()` import hoga — normal build me load nahi.

Env names (Phase 0 final):

| Var | Scope | Note |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser | project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser | `sb_publishable_…` (legacy anon ki jagah) |
| `SUPABASE_SECRET_KEY` | server only | `sb_secret_…` (legacy service_role ki jagah) |
| `NEXT_PUBLIC_SITE_URL` | browser | login redirect allowlist |
| `HEALTH_CHECK_TOKEN` | server only | `/api/health` abuse guard (optional) |

---

## 16. Next step

Approval ke baad **Phase 0**: repo init → Next 16 scaffold → design tokens/shell → auth → first deploy. Uske turant baad **Phase 1 data layer (zero DDL)**, phir Dashboard.

Is plan me jo bhi change chahiye (scope, phase order, plan tier, attendance depth), bata do — doc update kar dunga.

---

## 17. Implementation status — 2026-11-01

Sabhi audit findings implement + debug ho chuke hain. **Zero DDL** intact: sirf existing tables/RPCs/policies use hui hain.

### Kya ship hua

| Area | Implementation |
| --- | --- |
| Role gates | `src/lib/roles.ts` (pure helpers) + tests. Settings view admin/developer, write **admin only**; financial totals (`canViewFinancials`) admin/developer; attendance edit (`canManageAttendance`) admin/developer, staff self-service (`isSelfServiceAttendance`) sirf aaj + apni row; deletes admin/developer; team creation admin; audit write admin/staff (DB RLS ke mutabik). |
| Staff privacy | Staff nav se Settings gayab + `/settings` redirect; dashboard revenue KPI/chart/payments/amounts, sales page total aur attendance salary hidden. Attendance day view me staff sirf apni aaj ki row dekhta hai (check-in/out server-stamped, time edit nahi); month view read-only (sirf apni rows, non-clickable calendar). Client list/detail ka financial data staff ko visible hai. |
| Profile | `/profile`: account details + last sign-in; self password change with current-password verify, optional sign-out-others, best-effort audit. Sidebar user chip bhi profile link hai. |
| Audit | `recordActivity()` → `activity_logs` inserts for clients, jobs (create/update/status/delete/images), sales, attendance (bulk + self punch with geo), settings. Best-effort — failure user flow nahi todta. |
| Admin user management | `/settings?tab=team`: list + create + **edit** (name/role/mechanic) + **password reset** + **delete**, sab admin-only. Create/edit `profiles` row explicitly (profile trigger dropped); password reset aur delete Supabase Auth admin API se. Guards: self role change/delete blocked, last admin delete/demote blocked, target team-role validate. Delete auth user first, phir profile row cleanup. |
| Security headers | Per-request nonce CSP (Next 16 pattern), HSTS 2 years + `includeSubDomains`, `Permissions-Policy` camera/mic off + geolocation self, `X-DNS-Prefetch-Control: off`, existing `nosniff`/`DENY`/`strict-origin-when-cross-origin`. |
| RUM | `useReportWebVitals` → `sendBeacon` → `/api/vitals` (zod-validated, 204, structured JSON logs, 2 kB cap). |
| A11y | axe gate har smoke route par (critical/serious fail); light-theme contrast tokens darken kiye; month matrix scroll region `role="region"` + `tabIndex`. |
| Perf tooling | `@lhci/cli` (desktop preset, authed runs via puppeteer login hook), `size-limit` budgets, `@next/bundle-analyzer` (`npm run analyze`). |
| E2E | smoke (12 routes + axe + CSP watch), mobile 390px (overflow ≤1px, includes `/search` aur `/jobs/new`), team panels, login memory, profile, CRUD spec (double-gated — live DB writes sirf explicit opt-in par). |

### Search round (2026-11-01)

Search/filter UX, zero DDL (sirf existing `ilike`/PostgREST queries):

| Area | Implementation |
| --- | --- |
| Combobox | `src/components/ui/searchable-select.tsx` — type-to-filter dropdown, arrow/Enter/Escape/Tab keys, ARIA combobox + listbox, hidden input se native form submit compatible. |
| Live list search | `src/components/ui/live-search-input.tsx` — debounced (400 ms) URL update via enclosing form (`router.replace`), status/date/due filters preserve, `page` reset. Wired into `/clients`, `/jobs`, `/sales`. |
| Dropdown rollout | Job form (client/mechanic/service/product rows), sale form (client/mechanic/product), settings team (mechanic link) — native `<select>` sirf fixed enums (status, payment mode) par bacha. |
| Universal search | `/search` page + header entry (desktop input, mobile icon) — clients, jobs aur sales grouped results (`getGlobalSearch`, 8 per section), "Sab dekhein" deep links to module lists. |
| Job search match | Job search ab client name/contact se bhi match karta hai (client ids pre-query → `client_name.in.(…)`), list aur universal search dono me. |
| Form a11y fix | Row editors ke qty/price/service/product controls labeled (unique `htmlFor`/`id`), job photo file input `sr-only` wrapper me — 390px overflow aur axe `label` violation fix. |

### Shell round (2026-11-01)

- Desktop sidebar ab `fixed` hai (content `lg:pl-60`, nav internal scroll) — page scroll par nav nahi khisakta; header sticky hi rehta hai.
- Logged user top bar me: avatar + naam/role (mobile par sirf avatar) se dropdown — **My profile** aur **Logout** wahin se. Sidebar footer ka duplicate user chip hataya; sidebar nav me Profile link bacha hai.
- Menu: outside click / Escape close, `aria-expanded` + `aria-controls`, axe clean (desktop + 390px).

### Verification (2026-11-01)

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run test` | 60 tests / 12 files pass |
| `npm run build` | pass (22 routes + proxy, incl. `/profile`, `/search`) |
| `npm run test:e2e` (smoke + mobile + team + login + profile) | 5 passed / 1 skipped (gated CRUD); axe 0 serious/critical; 0 CSP/console errors |
| Search round e2e (smoke 12 routes + mobile incl. `/search`, `/jobs/new`) | 2 passed; axe 0 serious/critical; 390px overflow 0 |
| `npm run size` | JS 266.84 kB / 320 kB, CSS 7.36 kB / 60 kB |
| `npm run test:lhci` (authed, prod build) | assertions pass — perf 86/100/100 (dashboard/jobs/clients), a11y 99, best-practices 100 |
| `/api/vitals` | 204 valid, 400 invalid enum, 400 oversize |
| Security headers | CSP nonce + HSTS + Permissions-Policy live verified |
| CRUD e2e | skipped by design (`E2E_MUTATIONS=1` **and** `E2E_ALLOW_LIVE_DB_WRITES=1` chahiye) |

### Local caveats

- `test:lhci` ko Chrome path chahiye: `CHROME_PATH=<chromium>/chrome.exe` (LHCI khud Chrome install nahi karta).
- `npm run size` ka time measurement puppeteer Chrome use karta hai; flake aaye to `PUPPETEER_EXECUTABLE_PATH` same chromium par set karo.
- Dev server par pehli navigation slow ho sakti hai (Turbopack compile) — e2e timeout transient hota hai, retry pass.
- LHCI auth hook idempotent hai: shared browser me session already ho to `/login` → `/dashboard` redirect detect karke skip karta hai.
