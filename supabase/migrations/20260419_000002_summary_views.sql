-- Scale + correctness migration for the archive frontend.
--
-- Adds:
--   1. price_currency column on numismatic_item_profiles (defaults 'INR')
--   2. sort-year indexes on items (so list APIs can order server-side cheaply)
--   3. v_collection_public_summary  : per-collection item count + priced count + SUM/AVG
--   4. v_archive_public_summary     : single-row grand totals
--   5. v_archive_admin_summary      : admin view with published/total split
--
-- Contract: per-collection sums in v_collection_public_summary MUST equal the
-- corresponding grand totals in v_archive_public_summary to the rupee. If they
-- ever diverge, the data has been partitioned across a collection boundary in
-- a way PostgREST cannot see.

begin;

-- 1. Currency column ---------------------------------------------------------
alter table public.numismatic_item_profiles
  add column if not exists price_currency text not null default 'INR';

-- We intentionally do NOT compute estimated_public_price_avg as a GENERATED
-- column because one of {min,max} can be null; downstream consumers should
-- compute coalesce(min, max) or (min+max)/2 at query time. The view below
-- handles this consistently so the frontend never has to.

-- 2. Sort-year indexes -------------------------------------------------------
-- Only published/public rows are ever listed publicly, so partial indexes
-- keep the btrees small and ordered scans cheap.
create index if not exists items_sort_year_start_public_idx
  on public.items (sort_year_start)
  where review_status = 'published' and visibility = 'public';

create index if not exists items_sort_year_end_public_idx
  on public.items (sort_year_end)
  where review_status = 'published' and visibility = 'public';

-- 3. Per-collection summary view --------------------------------------------
-- `items`           : total rows attached to the collection
-- `priced`          : rows with at least one non-null estimate
-- `sum_min/sum_max` : rupee totals; null rows contribute 0
-- `sum_midpoint`    : Σ( coalesce((min+max)/2, min, max, 0) )
create or replace view public.v_collection_public_summary as
select
  c.id                                                           as collection_id,
  c.slug                                                         as collection_slug,
  c.title                                                         as collection_title,
  count(i.id)                                                    as items,
  count(p.item_id) filter (
    where p.estimated_public_price_min is not null
       or p.estimated_public_price_max is not null
  )                                                              as priced,
  coalesce(sum(p.estimated_public_price_min), 0)::numeric(14,2)  as sum_min,
  coalesce(sum(p.estimated_public_price_max), 0)::numeric(14,2)  as sum_max,
  coalesce(sum(
    case
      when p.estimated_public_price_min is not null
       and p.estimated_public_price_max is not null
        then (p.estimated_public_price_min + p.estimated_public_price_max) / 2.0
      else coalesce(p.estimated_public_price_min, p.estimated_public_price_max, 0)
    end
  ), 0)::numeric(14,2)                                           as sum_midpoint
from public.collections c
left join public.items i
  on  i.collection_id = c.id
  and i.review_status = 'published'
  and i.visibility    = 'public'
left join public.numismatic_item_profiles p
  on p.item_id = i.id
group by c.id, c.slug, c.title;

comment on view public.v_collection_public_summary is
  'Per-collection aggregates over published+public items. sum_min/max/midpoint
   are stable across refreshes: SUM(v_collection_public_summary.*) = v_archive_public_summary.*';

-- 4. Grand-total summary view -----------------------------------------------
create or replace view public.v_archive_public_summary as
select
  (select count(*) from public.items
     where review_status = 'published' and visibility = 'public') as items,
  (select count(*) from public.collections)                       as collections,
  (select count(distinct lower(trim(x)))
     from public.items i,
     lateral jsonb_array_elements_text(
       case jsonb_typeof(i.attributes->'materials')
         when 'array' then i.attributes->'materials'
         else '[]'::jsonb
       end
     ) as x
     where i.review_status = 'published' and i.visibility = 'public'
       and coalesce(trim(x), '') <> '')                           as materials,
  coalesce((select sum(
    case
      when p.estimated_public_price_min is not null
       and p.estimated_public_price_max is not null
        then (p.estimated_public_price_min + p.estimated_public_price_max) / 2.0
      else coalesce(p.estimated_public_price_min, p.estimated_public_price_max, 0)
    end
  ) from public.numismatic_item_profiles p
    join public.items i on i.id = p.item_id
    where i.review_status = 'published' and i.visibility = 'public'), 0)::numeric(14,2)
                                                                  as total_worth_midpoint,
  coalesce((select sum(p.estimated_public_price_min)
    from public.numismatic_item_profiles p
    join public.items i on i.id = p.item_id
    where i.review_status = 'published' and i.visibility = 'public'), 0)::numeric(14,2)
                                                                  as total_worth_min,
  coalesce((select sum(p.estimated_public_price_max)
    from public.numismatic_item_profiles p
    join public.items i on i.id = p.item_id
    where i.review_status = 'published' and i.visibility = 'public'), 0)::numeric(14,2)
                                                                  as total_worth_max;

comment on view public.v_archive_public_summary is
  'Grand totals for the public archive. One row. Parity invariant:
   sum(v_collection_public_summary.items)   = items
   sum(v_collection_public_summary.sum_min) = total_worth_min
   sum(v_collection_public_summary.sum_max) = total_worth_max';

-- 5. Admin summary (total + published split) --------------------------------
create or replace view public.v_archive_admin_summary as
select
  (select count(*) from public.items)                             as total_items,
  (select count(*) from public.items
     where review_status = 'published' and visibility = 'public') as published_items,
  (select count(*) from public.collections)                       as total_collections,
  (select total_worth_midpoint from public.v_archive_public_summary) as total_worth;

comment on view public.v_archive_admin_summary is
  'Admin dashboard totals. total_worth is midpoint over published+public rows.';

-- 6. Expose to anon/authenticated roles via PostgREST -----------------------
grant select on public.v_collection_public_summary to anon, authenticated;
grant select on public.v_archive_public_summary    to anon, authenticated;
grant select on public.v_archive_admin_summary     to authenticated;

commit;
