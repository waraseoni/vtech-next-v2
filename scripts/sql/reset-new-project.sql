-- ============================================================================
-- V-Tech — full reset for a BRAND-NEW Supabase project
--
-- WHAT THIS DOES (destructive):
--   1. TRUNCATEs every ordinary table in the `public` schema
--      (identity sequences restart, dependent tables cascade).
--   2. DELETEs every row from `auth.users` (sessions, identities and
--      refresh tokens go with it).
--
-- WHAT IT KEEPS:
--   schema, columns, constraints, RLS policies, functions, triggers,
--   enums, extensions, storage buckets, Edge Functions, project settings.
--
-- NEVER run this against the shared v1/v2 database. It works on whatever
-- project the SQL Editor is pointed at.
--
-- HOW TO RUN:
--   1. Change v_confirm below from 'NO' to 'YES'.
--   2. Open the target (new) project -> SQL Editor -> paste this whole file.
--   3. Run it once, top to bottom, in a single session.
--
-- AFTER RUNNING:
--   - Recreate the admin user (Dashboard -> Authentication -> Add user) and
--     its public.profiles row; db par profile trigger nahi hai
--     (20260809_drop_auth_profile_trigger.sql).
--   - Schema ke kuch seed rows truncate ho jaate hain. Zarurat ho to re-run:
--       job_id_counter  -> supabase/migrations/20260815_seed_job_id_counter.sql
--       ai_providers    -> final_full_schema_idempotent.sql ka default rows block
--     Neeche commented inserts copy-ready hain.
--   - Storage files are NOT touched. If buckets also need clearing, empty
--     them from Dashboard -> Storage (SQL-deleting storage.objects only
--     removes metadata and leaves orphan files behind).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Guard — the literal below must be changed before anything runs.
-- ---------------------------------------------------------------------------
do $$
declare
  v_confirm text := 'NO';
begin
  if v_confirm <> 'YES' then
    raise exception
      'Reset guard: edit this file and set v_confirm := ''YES'' before running.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 0b. Pre-check: auth.users rows are referenced by storage.objects in some
--     Supabase versions. Empty the buckets (Dashboard -> Storage) first;
--     SQL-deleting only metadata would leave orphan files behind.
-- ---------------------------------------------------------------------------
do $$
declare
  v_count bigint;
begin
  if to_regclass('storage.objects') is not null then
    execute 'select count(*) from storage.objects' into v_count;
    if v_count > 0 then
      raise exception
        'storage.objects still has % row(s). Empty the buckets from Dashboard -> Storage first.', v_count;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Truncate all public tables.
--    - Extension-owned tables (e.g. postgis spatial_ref_sys) are skipped.
--    - Migration bookkeeping tables are skipped, in case they live in public.
--    - CASCADE covers tables that are only linked by foreign keys.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p') -- ordinary + partitioned tables
      and c.relname not in ('schema_migrations', 'migrations')
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
  loop
    execute format('truncate table %s restart identity cascade', r.rel);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Remove auth users.
--    Run after step 1 so no public row can block the delete.
--    If this fails with a foreign-key error, some non-public table still
--    references auth.users; empty that table and re-run just this statement.
-- ---------------------------------------------------------------------------
delete from auth.users;

-- ---------------------------------------------------------------------------
-- 3. Optional re-seed (uncomment what the app needs after a blank start).
-- ---------------------------------------------------------------------------
-- insert into public.job_id_counter (id, last_job_id)
-- values (1, 28101)
-- on conflict (id) do nothing;

-- insert into public.ai_providers (provider, label, model, is_active)
-- values
--   ('groq', 'Groq (Free)', 'openai/gpt-oss-120b', false),
--   ('gemini', 'Google Gemini', 'gemini-2.5-flash', false)
-- on conflict (provider) do nothing;

-- insert into public.profiles (id, full_name, email, role)
-- select u.id, 'Admin', u.email, 'admin'
-- from auth.users u
-- where u.email = 'admin@example.com'
-- on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Verify — every count should be 0 (the notice reports leftovers).
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  n bigint;
begin
  for r in
    select c.oid::regclass as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname not in ('schema_migrations', 'migrations')
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
  loop
    execute format('select count(*) from %s', r.rel) into n;
    if n > 0 then
      raise warning 'leftover rows: % in %', n, r.rel;
    end if;
  end loop;
  raise notice 'public tables reset; auth.users = %', (select count(*) from auth.users);
end $$;

commit;
