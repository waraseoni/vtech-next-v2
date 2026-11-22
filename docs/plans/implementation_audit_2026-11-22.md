# Implementation Audit — saare plan files (22 Nov 2026)

> **Scope:** `docs/plans/*.md` = **70 files** + `docs/ATTENDANCE_DUTY_HOURS_PLAN.md`.
> 62 actionable plan docs spot-check kiye (61 in `docs/plans/` + 1 `docs/` root;
> code + migrations + `package.json`), 9 docs historical changelog/audit/reference hain (neeche §6).
> **Repo:** `vtech-next-v2` (fresh Next.js 16 server-first rebuild, 4 commits).
> **Key reality:** zyada tar plan docs **v1 app** (`C:\next-vtech\vtech-frontend`) ke liye likhe gaye the.
> Unke `✅ DONE` markers v1 me sach hain, **is repo ke `src/` par apply nahi hote**.
> Isliye "STALE-OR-REPLACED" ka matlab = plan purana hai, kaam doosare repo me hai —
> zaroori feature ho to v2 me dobara port karna padega.

---

## 1. Verdict summary

| Verdict | Count | Matlab |
|---|---:|---|
| ✅ FULL / core implemented in v2 | 4 | `v2-build-plan`, `clients-parity-plan`, `rls_hardening_plan`, `service_center_data_model_plan` (P1–P3) |
| ✅ APPLIED on TEST DB (prod pending) | 1 | `rpc_grants_hardening_plan` — aaj apply kiya |
| 🟡 PARTIAL | 7 | DB ya core code hai, app wiring / QA baaki |
| ⬜ NOT STARTED in v2 | 22 | active design ya v1-DONE feature jo v2 me nahi aaya |
| 🗄️ STALE-OR-REPLACED | 28 | v1/perf/architecture docs, v2 me naam ke artifacts nahi |
| 📚 REFERENCE / TRACKER | 9 | changelog, audit log, completed-tasks, live tracker |

**Sabse bada systemic gap:** 55+ tables par RLS ✅ aur kai DB migrations ✅ maujood hain,
lekin unke corresponding **v2 UI/lib/routes nahi** — DB-only implementation ko "feature done" nahi maana ja sakta.

---

## 2. ✅ Implemented / applied

| Doc | Verdict | Evidence |
|---|---|---|
| `v2-build-plan.md` | FULL (core) | `src/proxy.ts` getClaims, `src/lib/auth.ts` cache, RSC data layer, `api/vitals`, axe-in-e2e, LHCI. Stale tail: pins/counts, deploy secret, `useOptimistic`. |
| `clients-parity-plan.md` | FULL | `src/lib/domain/client-{ledger,loan}.ts`, `src/lib/data/client-{payments,loans,ledger,contacts}.ts`, tabs/filters/exports, ledger/loan/payment pages. |
| `rls_hardening_plan.md` | FULL | `20260910_rls_hardening.sql` + follow-up lockdown migrations + canonical schema. |
| `service_center_data_model_plan_2026-11-21.md` | FULL (core P1–P3) | `20261122_service_center_fields.sql` (+ canonical fold-in) apply on TEST DB; `brands`/`service_types` + 9 nullable cols + RLS + seeds; settings tab, intake device/service/warranty fields, list filters/Untagged/coverage, detail card; 77 tests green. P4/P5/P6 deferred by owner; prod apply pending. |
| `rpc_grants_hardening_plan.md` | APPLIED on TEST DB | `20261116_rpc_grants_hardening.sql`; 41 public functions se `PUBLIC`/`anon` hataaya; 9 `_impl_*` guard wrappers; anon REST 401; outsider role 42501; row counts same. Production apply baaki. |

---

## 3. 🟡 PARTIAL (key missing items)

| Doc | Kya hai | Kya baaki |
|---|---|---|
| `login_throttle_plan.md` | `20260810_login_throttle.sql` (table + RLS) | `src/lib/login-throttle.ts`, `/api/auth/login`, admin unlock page; v2 login direct Supabase call karta hai. |
| `speed_wins_nov13_2026.md` | 6 RPC/index migrations + web-vitals sink | `src/lib/data/dashboard.ts` sirf 2 purane RPC use karta hai; `get_due_stats`/`get_jobs_stats`/`get_stale_jobs`/low-stock/recents/waiting unwired; v2 re-measure. |
| `ui_ux_architecture_complete_plan.md` | `sonner` Toaster, status badge, WhatsApp href | `DataTable`, `EmptyState`, `ConfirmDialog`, `status-colors.ts`, keyboard shortcuts, mobile CSS hooks missing. |
| `ledger_billing_audit_2026.md` | ledger core + loan/discount handling | `ledger-print`, `api/client/ledger`, `client-due.ts`, "delivered-only" filter labels missing. |
| `login_page_friendly_ux_plan.md` | last-email/last-login cookies, `?next=`, password toggle | 20-Nov plan ke extras (passkey/app-version/externalLink) nahi; visual QA pending. |
| `staff_geofence_viewonly_plan.md` | `staff_geofence_permit` DB + geofence settings | `viewOnly.tsx`, `writeGuard.ts`, API permit check, `/settings/geofence-permits` nahi. |
| `docs/ATTENDANCE_DUTY_HOURS_PLAN.md` | duty schedule + derived cols + `attendance-hours.ts` engine + tests | duty-schedule editor UI, break input, lazy batch-close UI nahi. |

---

## 4. ⬜ NOT STARTED in v2

### 4.1 Active / forward-looking (owner decision ya naya kaam)

| Doc | Status |
|---|---|
| `multi_brand_service_architecture_plan.md` | Design blueprint, `brands`/`mechanic_brand_map` kuch bhi nahi. Service-center plan iska schema reference hai — stale nahi, unimplemented. |
| `multi_brand_job_id_sequencing_plan.md` | "Vikalp B" decide, par `brand_job_counters`/`brand_job_no`/settings UI nahi. |
| `multilanguage_plan.md` | `src/lib/i18n/**`, glossary, switcher, `vtech_lang` — kuch nahi. |
| `free_ai_providers_plan.md` | AI layer hi nahi (v2-build-plan §1 me out-of-scope). |
| `local_supabase_docker_setup_plan.md` | `supabase/config.toml`, seed, offline scripts nahi (CLI dependency hai). |
| `offline_local_supabase_sync_plan.md` | Offline clone/sync workflow nahi. |
| `offline_localhost_master_plan.md` | Decisions materialize nahi hue; scripts/config nahi. |

### 4.2 v1 me DONE, v2 me port nahi hua

`client_portal_plan.md` · `module_selection_plan.md` · `salary_hours_mode_plan.md` ·
`job_custom_services_and_quick_master_plan.md` · `suppliers_module_plan.md` ·
`bom_checker_plan.md` · `estimate_builder_plan_oct31_2026.md` ·
`inventory_improvements_plan.md` (DB migrations maujood, UI nahi) ·
`job_required_parts_waiting_tracking.md` (DB table maujood, `JobRequiredParts`/parts-pending report nahi) ·
`crop_editor_best_practices_plan.md` aur `image_crop_edit_plan.md` (koi crop dependency/code nahi) ·
`public_site_db_content_plan_nov08_2026.md` (`site_content` table/public routes nahi) ·
`login_page_next_improvements_2026-11-20.md` · `clear_cache_button_2026-11-20.md` ·
`balancesheet_chittha_ux_plan_oct31_2026.md`.

---

## 5. 🗄️ STALE-OR-REPLACED (v1 / purane perf docs)

In docs ke kaam v1 repo me ho chuke hain ya v2 architecture ne replace kar diya:

`implementation_plan.md` · `improvements_phased_plan.md` · `findings_sprint_plan.md` ·
`tech_adoption_sprint_plan.md` · `nextjs_updates_plan.md` ·
`react_modernization_plan_oct27_2026.md` · `ultimate_performance_fastest_plan.md` ·
`lightning_fast_plan.md` · `perf_baseline.md` · `perf_fastest_plan_2026.md` ·
`performance_plan.md` · `frontend_performance_plan.md` · `frontend_speed_plan_nov01_2026.md` ·
`production_hardening_plan_oct28_2026.md` · `server_migration_gate_plan.md` ·
`passkey_biometric_login_plan.md` (sirf DB migration v2 me hai, WebAuthn code nahi) ·
`passkey_sprint_plan.md` · `backup_tooling_fix_plan.md` · `backup_schema_fix_plan.md` ·
`season_backup_health.md` · `ssr_boot_gate_plan.md` ·
`speed_findings_implementation_plan_nov03_2026.md` · `speed_baseline_nov2026.md` ·
`clients_server_first_plan_nov02_2026.md` · `jobs_server_first_plan_nov02_2026.md` ·
`staff_server_first_plan_nov03_2026.md` · `rsc_implementation_best_plan_2026.md` ·
`rsc_phase4_plan.md`.

> `clients_server_first` / `jobs_server_first` **functionally achieve** ho gaye — v2 native RSC se.
> Named `SeedProvider`/`initialData` artifacts maujood nahi, isliye "architecturally replaced".

---

## 6. 📚 Reference / tracker docs (actionable plan nahi)

`changelog_aug2026.md` · `changelog_sep04_2026.md` · `changelog_sep13_2026.md` ·
`codebase_audit_sep06_2026.md` · `completed_tasks.md` ·
`perf_db_fetch_audit_oct14_2026.md` · `php_updates_todo.md` · `project_review.md` ·
`pending_work_2026-11-20.md` (live tracker — aaj section C update kiya).

---

## 7. Aaj ki DB / migration update (test project `gzopjezdrnarplfcijyv`)

### 7.1 Migration catch-up

Direct Postgres se object-level gap nikala gaya:

| Object | Pehle test DB me | Ab |
|---|---|---|
| `get_dashboard_low_stock()` | ❌ missing | ✅ applied (canonical full-schema lines 4849–4910) |
| `get_dashboard_recents()` | ❌ missing | ✅ applied (lines 4922–5051) |
| `get_dashboard_waiting()` | ❌ missing | ✅ applied (lines 4984–5058) |
| `client_payments_date_id_idx` | ❌ missing | ✅ applied |
| `transaction_list_del_status_job_id_idx` | ✅ pehle se tha | ✅ |
| `inventory_sync_place_path()` / `*_place_zone_idx` | ❌ | **Expected absence** — I6 Phase 2 (`20260925_i6_phase2_place_drop.sql`) ne columns + trigger drop kiye. Gap nahi. |

### 7.2 RPC hardening (sabse zaroori security feature)

- Naya migration: `supabase/migrations/20261116_rpc_grants_hardening.sql`
- Canonical `20260913000000_final_full_schema_idempotent.sql` me bhi fold-in.
- Test DB par **transaction me apply** (failure par rollback tha), success.
- Verify:
  - `pg_proc.proacl`: kisi bhi public function par `=X` (PUBLIC) ya `anon=X` nahi.
  - 9 `_impl_*` functions sirf `postgres=X` — directly call nahi ho sakte.
  - Role simulation: staff UUID → data ✅; outsider UUID → `42501` ✅ (apply se pehle data milta tha).
  - anon REST: 11 sensitive RPCs → `401 / 42501` ✅. `reset_sequence` bhi ab blocked.
  - Row counts unchanged; `job_id_counter = 28104` (anon se counter burn nahi hua).
- **Production DB untouched** — wahan apply owner approval ke baad karna hai.

### 7.3 Repo gates (post-change)

`typecheck` ✅ · `lint` ✅ · `test` 15 files / **71 tests** ✅ · `build` ✅.
Koi commit/push nahi kiya gaya.

---

## 8. Agla recommended order

1. ~~**Service Center Data Model P0 → P3**~~ ✅ **DONE (22 Nov)** — P0 decisions lock, P1–P3 core implemented + TEST DB verified. Baaki: P4/P5/P6 owner ke faisle se defer; prod apply pending.
2. **Production apply (RPC hardening + Service Center)** — dono test DB par proof ready; prod window me yahi migrations apply karo (owner approval).
3. **Baaki DB-only features** — jinke migrations maujood hain (low-stock widget RPCs, required parts, geofence permits) unhe v2 UI se wire karo; ye "naya feature" se pehle security/data integrity ka kaam hai.
4. **v1 feature porting** — sirf woh cheezein jo business ko chahiye (estimate, balance sheet, public site, AI, portal). Har ek ke liye alag plan + QA chahiye; sab ek saath port karna risky hai.
5. **Perf docs** — purane numbers v1 ke hain; v2 me dobara measure karke naya baseline banayo.

> Audit details groups A–D ke subagent reports se aaye; koi bhi source file modify nahi kiya gaya
> (sirf `rpc_grants_hardening_plan.md`, `pending_work_2026-11-20.md`, migrations aur ye audit doc).
