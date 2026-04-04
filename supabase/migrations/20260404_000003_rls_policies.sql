alter table public.domains enable row level security;
alter table public.collections enable row level security;
alter table public.collection_schemas enable row level security;
alter table public.conceptual_items enable row level security;
alter table public.items enable row level security;
alter table public.item_private_profiles enable row level security;
alter table public.entities enable row level security;
alter table public.entity_aliases enable row level security;
alter table public.themes enable row level security;
alter table public.tags enable row level security;
alter table public.media_assets enable row level security;
alter table public.record_entities enable row level security;
alter table public.record_themes enable row level security;
alter table public.record_tags enable row level security;
alter table public.record_relations enable row level security;
alter table public.record_references enable row level security;
alter table public.provenance_events enable row level security;
alter table public.discovery_contexts enable row level security;
alter table public.hoards enable row level security;
alter table public.measurements enable row level security;
alter table public.item_sides enable row level security;
alter table public.item_symbols enable row level security;
alter table public.numismatic_type_profiles enable row level security;
alter table public.numismatic_item_profiles enable row level security;
alter table public.philatelic_issue_profiles enable row level security;
alter table public.philatelic_item_profiles enable row level security;
alter table public.banknote_issue_profiles enable row level security;
alter table public.banknote_item_profiles enable row level security;
alter table public.postal_stationery_issue_profiles enable row level security;
alter table public.category_pages enable row level security;
alter table public.authority_links enable row level security;
alter table public.ingest_sources enable row level security;
alter table public.ingest_runs enable row level security;

drop policy if exists "public read active domains" on public.domains;
create policy "public read active domains"
on public.domains
for select
using (is_active = true);

drop policy if exists "public read published collections" on public.collections;
create policy "public read published collections"
on public.collections
for select
using (status = 'published');

drop policy if exists "public read collection schemas" on public.collection_schemas;
create policy "public read collection schemas"
on public.collection_schemas
for select
using (true);

drop policy if exists "public read published conceptual items" on public.conceptual_items;
create policy "public read published conceptual items"
on public.conceptual_items
for select
using (visibility = 'public' and review_status = 'published');

drop policy if exists "public read published items" on public.items;
create policy "public read published items"
on public.items
for select
using (visibility = 'public' and review_status = 'published');

drop policy if exists "owners read private profiles" on public.item_private_profiles;
create policy "owners read private profiles"
on public.item_private_profiles
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "owners insert private profiles" on public.item_private_profiles;
create policy "owners insert private profiles"
on public.item_private_profiles
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "owners update private profiles" on public.item_private_profiles;
create policy "owners update private profiles"
on public.item_private_profiles
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "owners delete private profiles" on public.item_private_profiles;
create policy "owners delete private profiles"
on public.item_private_profiles
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "public read public entities" on public.entities;
create policy "public read public entities"
on public.entities
for select
using (is_public = true);

drop policy if exists "public read entity aliases" on public.entity_aliases;
create policy "public read entity aliases"
on public.entity_aliases
for select
using (
  exists (
    select 1
    from public.entities e
    where e.id = entity_aliases.entity_id
      and e.is_public = true
  )
);

drop policy if exists "public read public themes" on public.themes;
create policy "public read public themes"
on public.themes
for select
using (is_public = true);

drop policy if exists "public read public tags" on public.tags;
create policy "public read public tags"
on public.tags
for select
using (is_public = true);

drop policy if exists "public read media assets for public targets" on public.media_assets;
create policy "public read media assets for public targets"
on public.media_assets
for select
using (
  (target_kind = 'item' and exists (
    select 1 from public.items i
    where i.id = media_assets.target_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  ))
  or
  (target_kind = 'conceptual_item' and exists (
    select 1 from public.conceptual_items ci
    where ci.id = media_assets.target_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  ))
  or
  (target_kind = 'entity' and exists (
    select 1 from public.entities e
    where e.id = media_assets.target_id
      and e.is_public = true
  ))
  or
  (target_kind = 'collection' and exists (
    select 1 from public.collections c
    where c.id = media_assets.target_id
      and c.status = 'published'
  ))
  or
  (target_kind = 'category_page' and exists (
    select 1 from public.category_pages cp
    where cp.id = media_assets.target_id
      and cp.status = 'published'
  ))
);

drop policy if exists "public read record entities for public records" on public.record_entities;
create policy "public read record entities for public records"
on public.record_entities
for select
using (
  (record_kind = 'item' and exists (
    select 1 from public.items i
    where i.id = record_entities.record_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  ))
  or
  (record_kind = 'conceptual_item' and exists (
    select 1 from public.conceptual_items ci
    where ci.id = record_entities.record_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  ))
);

drop policy if exists "public read record themes for public records" on public.record_themes;
create policy "public read record themes for public records"
on public.record_themes
for select
using (
  (record_kind = 'item' and exists (
    select 1 from public.items i
    where i.id = record_themes.record_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  ))
  or
  (record_kind = 'conceptual_item' and exists (
    select 1 from public.conceptual_items ci
    where ci.id = record_themes.record_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  ))
);

drop policy if exists "public read record tags for public records" on public.record_tags;
create policy "public read record tags for public records"
on public.record_tags
for select
using (
  (record_kind = 'item' and exists (
    select 1 from public.items i
    where i.id = record_tags.record_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  ))
  or
  (record_kind = 'conceptual_item' and exists (
    select 1 from public.conceptual_items ci
    where ci.id = record_tags.record_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  ))
);

drop policy if exists "public read related records when both sides are public" on public.record_relations;
create policy "public read related records when both sides are public"
on public.record_relations
for select
using (
  (
    (source_kind = 'item' and exists (
      select 1 from public.items i
      where i.id = record_relations.source_id
        and i.visibility = 'public'
        and i.review_status = 'published'
    ))
    or
    (source_kind = 'conceptual_item' and exists (
      select 1 from public.conceptual_items ci
      where ci.id = record_relations.source_id
        and ci.visibility = 'public'
        and ci.review_status = 'published'
    ))
  )
  and
  (
    (related_kind = 'item' and exists (
      select 1 from public.items i
      where i.id = record_relations.related_id
        and i.visibility = 'public'
        and i.review_status = 'published'
    ))
    or
    (related_kind = 'conceptual_item' and exists (
      select 1 from public.conceptual_items ci
      where ci.id = record_relations.related_id
        and ci.visibility = 'public'
        and ci.review_status = 'published'
    ))
  )
);

drop policy if exists "public read references for public records" on public.record_references;
create policy "public read references for public records"
on public.record_references
for select
using (
  (record_kind = 'item' and exists (
    select 1 from public.items i
    where i.id = record_references.record_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  ))
  or
  (record_kind = 'conceptual_item' and exists (
    select 1 from public.conceptual_items ci
    where ci.id = record_references.record_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  ))
);

drop policy if exists "public read public provenance events" on public.provenance_events;
create policy "public read public provenance events"
on public.provenance_events
for select
using (
  is_private = false
  and exists (
    select 1 from public.items i
    where i.id = provenance_events.item_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  )
);

drop policy if exists "public read discovery contexts for public records" on public.discovery_contexts;
create policy "public read discovery contexts for public records"
on public.discovery_contexts
for select
using (
  (item_id is not null and exists (
    select 1 from public.items i
    where i.id = discovery_contexts.item_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  ))
  or
  (conceptual_item_id is not null and exists (
    select 1 from public.conceptual_items ci
    where ci.id = discovery_contexts.conceptual_item_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  ))
);

drop policy if exists "public read hoards" on public.hoards;
create policy "public read hoards"
on public.hoards
for select
using (true);

drop policy if exists "public read measurements for public items" on public.measurements;
create policy "public read measurements for public items"
on public.measurements
for select
using (
  exists (
    select 1 from public.items i
    where i.id = measurements.item_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  )
);

drop policy if exists "public read sides for public records" on public.item_sides;
create policy "public read sides for public records"
on public.item_sides
for select
using (
  (target_kind = 'item' and exists (
    select 1 from public.items i
    where i.id = item_sides.target_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  ))
  or
  (target_kind = 'conceptual_item' and exists (
    select 1 from public.conceptual_items ci
    where ci.id = item_sides.target_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  ))
);

drop policy if exists "public read symbols for public records" on public.item_symbols;
create policy "public read symbols for public records"
on public.item_symbols
for select
using (
  (target_kind = 'item' and exists (
    select 1 from public.items i
    where i.id = item_symbols.target_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  ))
  or
  (target_kind = 'conceptual_item' and exists (
    select 1 from public.conceptual_items ci
    where ci.id = item_symbols.target_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  ))
);

drop policy if exists "public read numismatic type profiles" on public.numismatic_type_profiles;
create policy "public read numismatic type profiles"
on public.numismatic_type_profiles
for select
using (
  exists (
    select 1 from public.conceptual_items ci
    where ci.id = numismatic_type_profiles.conceptual_item_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  )
);

drop policy if exists "public read numismatic item profiles" on public.numismatic_item_profiles;
create policy "public read numismatic item profiles"
on public.numismatic_item_profiles
for select
using (
  exists (
    select 1 from public.items i
    where i.id = numismatic_item_profiles.item_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  )
);

drop policy if exists "public read philatelic issue profiles" on public.philatelic_issue_profiles;
create policy "public read philatelic issue profiles"
on public.philatelic_issue_profiles
for select
using (
  exists (
    select 1 from public.conceptual_items ci
    where ci.id = philatelic_issue_profiles.conceptual_item_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  )
);

drop policy if exists "public read philatelic item profiles" on public.philatelic_item_profiles;
create policy "public read philatelic item profiles"
on public.philatelic_item_profiles
for select
using (
  exists (
    select 1 from public.items i
    where i.id = philatelic_item_profiles.item_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  )
);

drop policy if exists "public read banknote issue profiles" on public.banknote_issue_profiles;
create policy "public read banknote issue profiles"
on public.banknote_issue_profiles
for select
using (
  exists (
    select 1 from public.conceptual_items ci
    where ci.id = banknote_issue_profiles.conceptual_item_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  )
);

drop policy if exists "public read banknote item profiles" on public.banknote_item_profiles;
create policy "public read banknote item profiles"
on public.banknote_item_profiles
for select
using (
  exists (
    select 1 from public.items i
    where i.id = banknote_item_profiles.item_id
      and i.visibility = 'public'
      and i.review_status = 'published'
  )
);

drop policy if exists "public read postal stationery issue profiles" on public.postal_stationery_issue_profiles;
create policy "public read postal stationery issue profiles"
on public.postal_stationery_issue_profiles
for select
using (
  exists (
    select 1 from public.conceptual_items ci
    where ci.id = postal_stationery_issue_profiles.conceptual_item_id
      and ci.visibility = 'public'
      and ci.review_status = 'published'
  )
);

drop policy if exists "public read published category pages" on public.category_pages;
create policy "public read published category pages"
on public.category_pages
for select
using (status = 'published');

drop policy if exists "public read authority links" on public.authority_links;
create policy "public read authority links"
on public.authority_links
for select
using (true);
