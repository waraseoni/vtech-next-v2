-- ============================================================================
-- 20260817_product_level_location.sql
-- Move location from per-stock-entry (inventory_list) to per-product (product_list).
-- Rationale: ek product ki ek hi location honi chahiye. Stock-out location
-- select nahi karta — sirf product ki quantity减 hoti hai.
--
-- Idempotent: baar baar run karne se error nahi aayega.
-- ============================================================================

-- 1. Add location columns to product_list
alter table public.product_list
  add column if not exists place_zone text;
alter table public.product_list
  add column if not exists place_rack text;
alter table public.product_list
  add column if not exists place_bin  text;
alter table public.product_list
  add column if not exists place_box  text;

-- 2. Index for Spare Finder tree browsing
create index if not exists product_list_place_zone_idx
  on public.product_list (place_zone);

-- 3. Migrate data: copy most recent location from inventory_list to product_list
--    (only for products that don't already have a location set)
update public.product_list pl
  inner join (
    select il.product_id,
           il.place_zone, il.place_rack, il.place_bin, il.place_box,
           row_number() over (partition by il.product_id order by il.stock_date desc) as rn
    from public.inventory_list il
    where il.place_zone is not null or il.place_rack is not null
       or il.place_bin is not null or il.place_box is not null
  ) latest on latest.product_id = pl.id
set
  pl.place_zone = latest.place_zone,
  pl.place_rack = latest.place_rack,
  pl.place_bin  = latest.place_bin,
  pl.place_box  = latest.place_box
where latest.rn = 1
  and (pl.place_zone is null and pl.place_rack is null
       and pl.place_bin is null and pl.place_box is null);

-- 4. Also migrate from legacy `place` text for products still missing location
--    (Only if place matches pattern "Zone ▸ Rack ▸ Bin ▸ Box")
--    This is best-effort; complex parsing left to frontend if needed.
--    For now, skip: structured columns are the source of truth going forward.
