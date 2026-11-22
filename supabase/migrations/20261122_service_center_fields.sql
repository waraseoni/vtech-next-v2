-- ════════════════════════════════════════════════════════════════════════
-- 20261122_service_center_fields.sql
-- Service Center Data Model — P1 core (P1+P2+P3 batch)
-- Plan: docs/plans/service_center_data_model_plan_2026-11-21.md
--
-- Additive + non-breaking:
--   • `transaction_list.item` NOT CHANGE hota (legacy free-text safe).
--   • Har naya column NULLABLE — purana backup restore bhi chalta hai.
--   • Koi backfill nahi — purane jobs waise ke waise rehte hain.
--   • `brands` / `service_types` ko HARD DELETE nahi — sirf is_active=false.
--
-- Repo conventions: `rlslock_*_staff` (is_frontend_staff), audited grants,
-- touch trigger, idempotent guards, system_info KV mode, NOTIFY pgrst.
-- Apply: owner approval ke baad (yahan TEST DB par apply kiya gaya).
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ── 1) Master tables ────────────────────────────────────────────────────

create table if not exists public.brands (
  id             serial primary key,
  name           text not null unique,
  code           varchar(10) unique,
  is_authorized  boolean not null default false,
  authorized_no  text,
  logo_url       text,
  support_phone  text,
  support_email  text,
  is_active      boolean not null default true,
  date_created   timestamptz not null default now(),
  date_updated   timestamptz not null default now()
);

create table if not exists public.service_types (
  id          serial primary key,
  name        text not null unique,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true
);

-- ── 2) Seeds (ON CONFLICT DO NOTHING — baar baar run safe) ──────────────

insert into public.brands (name, code, is_authorized, is_active)
values ('General / Unbranded', 'GEN', false, true)
on conflict (name) do nothing;

insert into public.service_types (name, sort_order, is_active) values
  ('Repair / Service', 0, true),
  ('New Installation', 10, true),
  ('Warranty Claim', 20, true),
  ('AMC / Service Visit', 30, true),
  ('PDI / Delivery', 40, true),
  ('Inspection / Estimate', 50, true),
  ('Doorstep Visit', 60, true)
on conflict (name) do nothing;

-- ── 3) Additive columns on transaction_list ────────────────────────────

alter table public.transaction_list
  add column if not exists brand_id integer,
  add column if not exists item_category text,
  add column if not exists model text,
  add column if not exists serial_no text,
  add column if not exists service_type_id integer,
  add column if not exists warranty_status text,
  add column if not exists warranty_until date,
  add column if not exists warranty_claim_no text,
  add column if not exists warranty_claim_status text;

-- Named FKs with RESTRICT: master row delete nahi ho sakta jab tak history
-- usse reference kare (plan §7 / R16 — deactivate-only).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transaction_list_brand_id_fkey'
      and conrelid = 'public.transaction_list'::regclass
  ) then
    alter table public.transaction_list
      add constraint transaction_list_brand_id_fkey
      foreign key (brand_id) references public.brands(id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'transaction_list_service_type_id_fkey'
      and conrelid = 'public.transaction_list'::regclass
  ) then
    alter table public.transaction_list
      add constraint transaction_list_service_type_id_fkey
      foreign key (service_type_id) references public.service_types(id) on delete restrict;
  end if;
end $$;

create index if not exists transaction_list_brand_id_idx
  on public.transaction_list (brand_id);
create index if not exists transaction_list_service_type_id_idx
  on public.transaction_list (service_type_id);
create index if not exists transaction_list_serial_no_idx
  on public.transaction_list (serial_no)
  where serial_no is not null;

-- ── 4) Operating mode (system_info KV — koi naya settings table nahi) ──

insert into public.system_info (meta_field, meta_value)
select 'service_center_mode', 'autonomous'
where not exists (
  select 1 from public.system_info where meta_field = 'service_center_mode'
);

-- ── 5) Touch triggers ──────────────────────────────────────────────────

create or replace function public.touch_brands()
returns trigger language plpgsql as $$
begin
  new.date_updated = now();
  return new;
end;
$$;
revoke all on function public.touch_brands() from public, anon, authenticated;

drop trigger if exists brands_touch on public.brands;
create trigger brands_touch
  before update on public.brands
  for each row execute function public.touch_brands();

-- ── 6) RLS — is_frontend_staff() gate; anon ko koi policy nahi (deny) ──

alter table public.brands enable row level security;
alter table public.service_types enable row level security;

drop policy if exists rlslock_brands_staff on public.brands;
create policy rlslock_brands_staff on public.brands
  for all to authenticated
  using (public.is_frontend_staff())
  with check (public.is_frontend_staff());

drop policy if exists rlslock_service_types_staff on public.service_types;
create policy rlslock_service_types_staff on public.service_types
  for all to authenticated
  using (public.is_frontend_staff())
  with check (public.is_frontend_staff());

-- ── 7) Grants (repo pattern) ───────────────────────────────────────────

grant all on table public.brands to anon;
grant all on table public.brands to authenticated;
grant all on table public.brands to service_role;
grant usage, select on sequence public.brands_id_seq to anon, authenticated, service_role;

grant all on table public.service_types to anon;
grant all on table public.service_types to authenticated;
grant all on table public.service_types to service_role;
grant usage, select on sequence public.service_types_id_seq to anon, authenticated, service_role;

-- ── 8) PostgREST schema cache reload ───────────────────────────────────

notify pgrst, 'reload schema';

commit;

-- ── Verify (read-only) ────────────────────────────────────────────────
-- select table_name, column_name from information_schema.columns
-- where table_schema='public' and table_name='transaction_list'
--   and column_name in ('brand_id','model','serial_no','service_type_id',
--       'warranty_status','warranty_until','warranty_claim_no','warranty_claim_status');
-- select meta_value from system_info where meta_field='service_center_mode';
-- select name from service_types order by sort_order;
-- select name from brands where code='GEN';
