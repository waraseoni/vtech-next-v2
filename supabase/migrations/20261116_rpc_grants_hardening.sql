-- ============================================================================
-- 20261116_rpc_grants_hardening.sql
-- RPC Grants Hardening — SECURITY DEBT FIX (data-safe, function-level only)
--
-- Source plan: docs/plans/rpc_grants_hardening_plan.md
-- Created: 22 Nov 2026 (test DB apply)
--
-- Problem (live audit 16 Nov 2026):
--   * 28 public functions me se 26 anon-executable the (frontend anon key public).
--   * 8 staff-only SECURITY DEFINER RPCs me is_frontend_staff() guard nahi tha.
--   * reset_sequence(text) -> arbitrary setval() = INSERT DoS (CRITICAL).
--
-- Is migration ke 3 layers:
--   A) Grants: har staff-only / helper RPC se PUBLIC + anrevoke, authenticated +
--      service_role ko EXECUTE. Trigger functions se PUBLIC/anon/authenticated revoke.
--   B) Guard: 9 staff-only definer RPCs ka body bilkul same rakhte hue unhe
--      _impl_* par rename karo aur public naam par thin is_frontend_staff() wrapper.
--   C) Verify: neeche comment me SQL (grant matrix + role simulation).
--
-- Data/table/column kabhi touch nahi hota. Rollback: docs me diya gaya hai.
-- Idempotent: DO blocks rename skip karte hain, wrappers CREATE OR REPLACE hain.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Layer A1 — Grants: non-wrapped RPCs + already-hardened RPCs (uniform pattern)
-- ---------------------------------------------------------------------------
do $$
declare
  sig text;
begin
  foreach sig in array array[
    -- read-only staff RPCs (already anon-denied; yahan PUBLIC bhi hatate hain)
    'public.get_due_stats()',
    'public.get_jobs_stats(text, text, text, boolean, integer, text)',
    'public.get_stale_jobs(integer, integer)',
    'public.get_dashboard_low_stock()',
    'public.get_dashboard_recents()',
    'public.get_dashboard_waiting()',

    -- invoker / hygiene RPCs
    'public.save_direct_sale(integer, text, integer, integer, text, text, integer, text, jsonb)',
    'public.get_transactions_with_client_data(date, date)',

    -- portal helpers: anon nahi, authenticated (client role) theek
    'public.get_my_client_id()',
    'public.get_my_role()',

    -- RLS helper: policies authenticated role me chalte hain
    'public.is_frontend_staff()',

    -- guarded inventory writers: guard hai, par anon grant bhi nahi hona chahiye
    'public.receive_po_receipt(bigint, jsonb)',
    'public.receive_po_receipt(bigint, jsonb, numeric)',
    'public.record_stocktake(integer, integer, text, text, text, text)'
  ]::text[]
  loop
    execute format('revoke all on function %s from public', sig);
    execute format('revoke all on function %s from anon', sig);
    execute format('grant execute on function %s to authenticated', sig);
    execute format('grant execute on function %s to service_role', sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Layer A2 — Trigger functions: trigger execution grant par depend nahi karta.
--              PUBLIC/anon/authenticated se direct call band.
-- ---------------------------------------------------------------------------
do $$
declare
  sig text;
begin
  foreach sig in array array[
    'public.handle_new_user()',
    'public.prevent_role_escalation()',
    'public.update_date_updated()',
    'public.touch_bom_templates()',
    'public.touch_client_contacts()',
    'public.touch_purchase_orders()',
    'public.touch_push_subscriptions()',
    'public.touch_supplier_contact_persons()',
    'public.touch_user_passkeys()'
  ]::text[]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Layer B — Guard wrappers (9 staff-only definer RPCs)
--   Pattern: original -> _impl_* (body same), public naam -> thin guard wrapper.
--   Wrapper SECURITY DEFINER hai: _impl_* ko kisi role ko grant nahi chahiye.
-- ---------------------------------------------------------------------------

-- 1) get_dashboard_stats(text, text) -> jsonb
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_get_dashboard_stats'
  ) then
    alter function public.get_dashboard_stats(text, text) rename to _impl_get_dashboard_stats;
  end if;
end $$;
revoke all on function public._impl_get_dashboard_stats(text, text) from public, anon, authenticated, service_role;

create or replace function public.get_dashboard_stats(p_today_start text, p_today_end text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return public._impl_get_dashboard_stats(p_today_start, p_today_end);
end $$;
revoke all on function public.get_dashboard_stats(text, text) from public, anon;
grant execute on function public.get_dashboard_stats(text, text) to authenticated, service_role;

-- 2) get_clients_page_financials() -> jsonb
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_get_clients_page_financials'
  ) then
    alter function public.get_clients_page_financials() rename to _impl_get_clients_page_financials;
  end if;
end $$;
revoke all on function public._impl_get_clients_page_financials() from public, anon, authenticated, service_role;

create or replace function public.get_clients_page_financials()
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return public._impl_get_clients_page_financials();
end $$;
revoke all on function public.get_clients_page_financials() from public, anon;
grant execute on function public.get_clients_page_financials() to authenticated, service_role;

-- 3) get_monthly_revenue(integer) -> jsonb
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_get_monthly_revenue'
  ) then
    alter function public.get_monthly_revenue(integer) rename to _impl_get_monthly_revenue;
  end if;
end $$;
revoke all on function public._impl_get_monthly_revenue(integer) from public, anon, authenticated, service_role;

create or replace function public.get_monthly_revenue(p_months integer default 12)
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return public._impl_get_monthly_revenue(p_months);
end $$;
revoke all on function public.get_monthly_revenue(integer) from public, anon;
grant execute on function public.get_monthly_revenue(integer) to authenticated, service_role;

-- 4) get_financial_summary(text, text) -> jsonb
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_get_financial_summary'
  ) then
    alter function public.get_financial_summary(text, text) rename to _impl_get_financial_summary;
  end if;
end $$;
revoke all on function public._impl_get_financial_summary(text, text) from public, anon, authenticated, service_role;

create or replace function public.get_financial_summary(p_from text, p_to text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return public._impl_get_financial_summary(p_from, p_to);
end $$;
revoke all on function public.get_financial_summary(text, text) from public, anon;
grant execute on function public.get_financial_summary(text, text) to authenticated, service_role;

-- 5) get_technician_metrics(text, text) -> jsonb
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_get_technician_metrics'
  ) then
    alter function public.get_technician_metrics(text, text) rename to _impl_get_technician_metrics;
  end if;
end $$;
revoke all on function public._impl_get_technician_metrics(text, text) from public, anon, authenticated, service_role;

create or replace function public.get_technician_metrics(p_from text, p_to text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return public._impl_get_technician_metrics(p_from, p_to);
end $$;
revoke all on function public.get_technician_metrics(text, text) from public, anon;
grant execute on function public.get_technician_metrics(text, text) to authenticated, service_role;

-- 6) get_inventory_stock(bigint[]) -> TABLE(...)
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_get_inventory_stock'
  ) then
    alter function public.get_inventory_stock(bigint[]) rename to _impl_get_inventory_stock;
  end if;
end $$;
revoke all on function public._impl_get_inventory_stock(bigint[]) from public, anon, authenticated, service_role;

create or replace function public.get_inventory_stock(p_product_ids bigint[] default null::bigint[])
returns table(
  product_id bigint,
  total_in bigint,
  total_sold_job bigint,
  total_sold_sale bigint,
  total_sold bigint,
  available bigint,
  oversold bigint,
  avg_purchase_cost numeric,
  last_stock_date date,
  place text
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return query select * from public._impl_get_inventory_stock(p_product_ids);
end $$;
revoke all on function public.get_inventory_stock(bigint[]) from public, anon;
grant execute on function public.get_inventory_stock(bigint[]) to authenticated, service_role;

-- 7) next_job_id() -> integer (WRITE: counter increment)
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_next_job_id'
  ) then
    alter function public.next_job_id() rename to _impl_next_job_id;
  end if;
end $$;
revoke all on function public._impl_next_job_id() from public, anon, authenticated, service_role;

create or replace function public.next_job_id()
returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return public._impl_next_job_id();
end $$;
revoke all on function public.next_job_id() from public, anon;
grant execute on function public.next_job_id() to authenticated, service_role;

-- 8) peek_next_job_id() -> integer (read-only preview)
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_peek_next_job_id'
  ) then
    alter function public.peek_next_job_id() rename to _impl_peek_next_job_id;
  end if;
end $$;
revoke all on function public._impl_peek_next_job_id() from public, anon, authenticated, service_role;

create or replace function public.peek_next_job_id()
returns integer language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return public._impl_peek_next_job_id();
end $$;
revoke all on function public.peek_next_job_id() from public, anon;
grant execute on function public.peek_next_job_id() to authenticated, service_role;

-- 9) reset_sequence(text) -> text (CRITICAL: arbitrary setval = DoS)
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_impl_reset_sequence'
  ) then
    alter function public.reset_sequence(text) rename to _impl_reset_sequence;
  end if;
end $$;
revoke all on function public._impl_reset_sequence(text) from public, anon, authenticated, service_role;

create or replace function public.reset_sequence(p_table_name text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_frontend_staff() then
    raise exception 'permission denied for staff-only function' using errcode = '42501';
  end if;
  return public._impl_reset_sequence(p_table_name);
end $$;
revoke all on function public.reset_sequence(text) from public, anon;
grant execute on function public.reset_sequence(text) to authenticated, service_role;

-- PostgREST schema cache: naye wrappers/signatures turant dikhein.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Verify (SQL editor / psql ke liye — migration ka hissa nahi):
--
-- 1) Koi function anon ya PUBLIC execute-able nahi hona chahiye:
--    select p.proname, p.proacl
--    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname not like '\_impl\_%'
--    order by 1;
--    -- expected: kisi bhi proacl me '=X' ya 'anon=X' nahi
--
-- 2) Wrappers ka guard test (read-only transaction):
--    begin;
--    set local role authenticated;
--    set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
--    select public.get_dashboard_stats('2026-11-01','2026-11-22'); -- 42501 chahiye
--    rollback;
--
--    begin;
--    set local role authenticated;
--    set local request.jwt.claims = '{"sub":"<staff-uuid>","role":"authenticated"}';
--    select public.get_dashboard_stats('2026-11-01','2026-11-22'); -- data chahiye
--    rollback;
--
-- 3) anon REST: 9 RPCs -> 401; staff login -> dashboard/clients/jobs OK.
-- ---------------------------------------------------------------------------
