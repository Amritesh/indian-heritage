-- Surgical data repair for existing prod rows.
-- Idempotent: safe to re-run; converges to the same state each time.
-- Does NOT delete rows, does NOT re-ingest snapshots, does NOT touch canonical_id.
--
-- Fixes three things that existed before the importer patches landed:
--   1. Zero-at-source price rows polluting SUM() aggregates (18 rows)
--   2. Inverted year range where sort_year_end < sort_year_start
--   3. Backfills the new price_currency column for any row created before
--      the default was in place (belt-and-braces, the DEFAULT handles new rows)

begin;

-- 1. Collapse all-zero public price estimates to null -----------------------
-- If both bounds are 0 (or one is 0 and the other null), the row contributes
-- nothing useful to a SUM but inflates the "priced" count. Null is the correct
-- representation of "unknown" for estimates.
update public.numismatic_item_profiles
set
  estimated_public_price_min = null,
  estimated_public_price_max = null,
  updated_at = now()
where coalesce(estimated_public_price_min, 0) = 0
  and coalesce(estimated_public_price_max, 0) = 0
  and (estimated_public_price_min is not null or estimated_public_price_max is not null);

-- 2. Widen any inverted sort-year ranges to the explicit start --------------
-- The importer used to compose an explicit AD start with an independently
-- derived AH end, occasionally producing end < start by 1 year. We keep the
-- explicit start and widen the end up to it. No data is lost — the AH anchor
-- survives in the display_date string.
update public.items
set
  sort_year_end = sort_year_start,
  updated_at = now()
where sort_year_start is not null
  and sort_year_end   is not null
  and sort_year_end   < sort_year_start;

-- Same repair for the conceptual layer (date_start/date_end).
update public.conceptual_items
set
  date_end = date_start,
  updated_at = now()
where date_start is not null
  and date_end   is not null
  and date_end   < date_start;

-- 3. Backfill price_currency for any pre-migration rows ---------------------
-- The column has DEFAULT 'INR', but existing rows inserted before the column
-- existed will have the default applied; this update is a no-op unless some
-- row was explicitly set to NULL at any point.
update public.numismatic_item_profiles
set price_currency = 'INR', updated_at = now()
where price_currency is null or price_currency = '';

commit;

-- Post-repair verification (run manually, not as part of the migration):
--
-- select count(*) as zero_priced_remaining
--   from public.numismatic_item_profiles
--   where coalesce(estimated_public_price_min,0) = 0
--     and coalesce(estimated_public_price_max,0) = 0
--     and (estimated_public_price_min is not null or estimated_public_price_max is not null);
-- -- expect: 0
--
-- select count(*) as inverted_ranges_remaining
--   from public.items
--   where sort_year_end < sort_year_start;
-- -- expect: 0
--
-- select * from public.v_archive_public_summary;
-- -- expect: items = 1589 (or current count), total_worth_min = 2431615,
-- --         total_worth_max = 4061300, total_worth_midpoint = 3246457.50
