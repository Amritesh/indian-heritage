create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  slug text not null unique,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  hero_image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  domain_id uuid not null references public.domains(id) on delete cascade,
  slug text not null unique,
  title text not null,
  subtitle text,
  description text not null,
  long_description text,
  era_label text,
  country_code text not null default 'IN',
  source_pdf_name text,
  source_folder text,
  cover_image_path text,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_schemas (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete cascade,
  domain_id uuid references public.domains(id) on delete cascade,
  schema_name text not null,
  version integer not null default 1,
  attribute_config jsonb not null default '{}'::jsonb,
  filter_config jsonb not null default '{}'::jsonb,
  display_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (collection_id is not null or domain_id is not null)
);

create table if not exists public.conceptual_items (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  domain_id uuid not null references public.domains(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  concept_type text not null,
  slug text not null unique,
  title text not null,
  subtitle text,
  summary text,
  era_label text,
  date_start integer,
  date_end integer,
  display_date text,
  country_code text not null default 'IN',
  authority_status text not null default 'draft',
  search_text tsvector,
  attributes jsonb not null default '{}'::jsonb,
  review_status text not null default 'draft',
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  domain_id uuid not null references public.domains(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  conceptual_item_id uuid references public.conceptual_items(id) on delete set null,
  item_type text not null,
  slug text unique,
  title text not null,
  subtitle text,
  description text,
  short_description text,
  era_label text,
  date_start integer,
  date_end integer,
  display_date text,
  country_code text not null default 'IN',
  primary_image_path text,
  primary_image_alt text,
  search_text tsvector,
  attributes jsonb not null default '{}'::jsonb,
  sort_title text not null,
  sort_year_start integer,
  sort_year_end integer,
  review_status text not null default 'draft',
  visibility text not null default 'private',
  source_page_number integer,
  source_page_label text,
  source_batch text,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_private_profiles (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  year_bought integer,
  purchase_price numeric(12,2),
  purchase_currency text,
  estimated_value_min numeric(12,2),
  estimated_value_max numeric(12,2),
  estimated_value_avg numeric(12,2),
  acquisition_source text,
  acquisition_date date,
  internal_notes text,
  private_tags jsonb not null default '[]'::jsonb,
  private_attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, owner_user_id)
);

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  entity_type text not null,
  slug text not null unique,
  preferred_label text not null,
  sort_label text not null,
  summary text,
  country_code text not null default 'IN',
  era_label text,
  attributes jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  alias_label text not null,
  normalized_alias text not null,
  alias_type text not null,
  is_preferred boolean not null default false,
  created_at timestamptz not null default now(),
  unique (entity_id, normalized_alias)
);

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  slug text not null unique,
  name text not null,
  summary text,
  theme_type text not null,
  attributes jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  tag_type text not null,
  slug text not null unique,
  label text not null,
  normalized_label text not null,
  source_kind text not null,
  source_id uuid,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null,
  target_id uuid not null,
  storage_provider text not null default 'firebase-storage',
  storage_path text not null,
  public_url text,
  asset_role text not null,
  alt_text text,
  caption text,
  sort_order integer not null default 0,
  width integer,
  height integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_kind, target_id, storage_path)
);

create table if not exists public.record_entities (
  id uuid primary key default gen_random_uuid(),
  record_kind text not null,
  record_id uuid not null,
  entity_id uuid not null references public.entities(id) on delete cascade,
  relation_type text not null,
  is_primary boolean not null default false,
  confidence numeric(5,4),
  source text not null,
  created_at timestamptz not null default now(),
  unique (record_kind, record_id, entity_id, relation_type)
);

create table if not exists public.record_themes (
  id uuid primary key default gen_random_uuid(),
  record_kind text not null,
  record_id uuid not null,
  theme_id uuid not null references public.themes(id) on delete cascade,
  relation_type text not null,
  confidence numeric(5,4),
  source text not null,
  created_at timestamptz not null default now(),
  unique (record_kind, record_id, theme_id, relation_type)
);

create table if not exists public.record_tags (
  id uuid primary key default gen_random_uuid(),
  record_kind text not null,
  record_id uuid not null,
  tag_id uuid not null references public.tags(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (record_kind, record_id, tag_id)
);

create table if not exists public.record_relations (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null,
  source_id uuid not null,
  related_kind text not null,
  related_id uuid not null,
  relation_type text not null,
  score numeric(6,3) not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (source_kind, source_id, related_kind, related_id, relation_type)
);

create table if not exists public.record_references (
  id uuid primary key default gen_random_uuid(),
  record_kind text not null,
  record_id uuid not null,
  reference_type text not null,
  reference_system text,
  reference_code text,
  citation_text text,
  url text,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provenance_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  event_type text not null,
  actor_entity_id uuid references public.entities(id) on delete set null,
  counterparty_entity_id uuid references public.entities(id) on delete set null,
  event_date date,
  event_date_note text,
  location_entity_id uuid references public.entities(id) on delete set null,
  amount numeric(12,2),
  currency_code text,
  source_note text,
  is_private boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discovery_contexts (
  id uuid primary key default gen_random_uuid(),
  conceptual_item_id uuid references public.conceptual_items(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  context_type text not null,
  findspot_entity_id uuid references public.entities(id) on delete set null,
  hoard_name text,
  deposit_date_note text,
  discovery_note text,
  source_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (conceptual_item_id is not null or item_id is not null)
);

create table if not exists public.hoards (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  slug text not null unique,
  title text not null,
  summary text,
  place_entity_id uuid references public.entities(id) on delete set null,
  deposit_date_note text,
  discovery_date_note text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  measurement_type text not null,
  value_numeric numeric(12,4),
  unit text not null,
  qualifier text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.item_sides (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null,
  target_id uuid not null,
  side_type text not null,
  description text,
  legend text,
  transcription text,
  translation text,
  orientation_note text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_kind, target_id, side_type)
);

create table if not exists public.item_symbols (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null,
  target_id uuid not null,
  side_type text,
  symbol_type text not null,
  symbol_label text not null,
  description text,
  entity_id uuid references public.entities(id) on delete set null,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.numismatic_type_profiles (
  conceptual_item_id uuid primary key references public.conceptual_items(id) on delete cascade,
  object_type text,
  denomination text,
  manufacture text,
  material text,
  mint_entity_id uuid references public.entities(id) on delete set null,
  authority_entity_id uuid references public.entities(id) on delete set null,
  issuer_entity_id uuid references public.entities(id) on delete set null,
  dynasty_entity_id uuid references public.entities(id) on delete set null,
  region_entity_id uuid references public.entities(id) on delete set null,
  date_on_object text,
  date_standardized_start integer,
  date_standardized_end integer,
  type_series text,
  catalogue_primary text,
  obverse_summary text,
  reverse_summary text,
  edge_summary text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.numismatic_item_profiles (
  item_id uuid primary key references public.items(id) on delete cascade,
  material text,
  denomination text,
  weight_grams numeric(10,4),
  diameter_mm numeric(10,3),
  axis_hours numeric(5,2),
  condition_label text,
  authenticity_status text,
  mint_entity_id uuid references public.entities(id) on delete set null,
  issuer_entity_id uuid references public.entities(id) on delete set null,
  authority_entity_id uuid references public.entities(id) on delete set null,
  type_series text,
  catalogue_primary text,
  estimated_public_price_min numeric(12,2),
  estimated_public_price_max numeric(12,2),
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.philatelic_issue_profiles (
  conceptual_item_id uuid primary key references public.conceptual_items(id) on delete cascade,
  issuing_authority_entity_id uuid references public.entities(id) on delete set null,
  series_title text,
  issue_date date,
  face_value numeric(12,4),
  face_value_currency text,
  format_type text,
  printing_method text,
  printer_entity_id uuid references public.entities(id) on delete set null,
  designer_entity_id uuid references public.entities(id) on delete set null,
  engraver_entity_id uuid references public.entities(id) on delete set null,
  perforation text,
  watermark text,
  paper_type text,
  gum_type text,
  sheet_details text,
  overprint_text text,
  surcharge_text text,
  wns_number text,
  official_status text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.philatelic_item_profiles (
  item_id uuid primary key references public.items(id) on delete cascade,
  centering_grade text,
  gum_condition text,
  hinged_status text,
  used_status text,
  cancellation_type text,
  cancellation_place_entity_id uuid references public.entities(id) on delete set null,
  cancellation_date date,
  margin_note text,
  sheet_position text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banknote_issue_profiles (
  conceptual_item_id uuid primary key references public.conceptual_items(id) on delete cascade,
  issuing_authority_entity_id uuid references public.entities(id) on delete set null,
  series_title text,
  denomination numeric(12,4),
  currency_code text,
  issue_date date,
  withdrawal_date date,
  signature_primary_entity_id uuid references public.entities(id) on delete set null,
  signature_secondary_entity_id uuid references public.entities(id) on delete set null,
  watermark text,
  security_thread text,
  dimensions_note text,
  printer_entity_id uuid references public.entities(id) on delete set null,
  catalogue_primary text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banknote_item_profiles (
  item_id uuid primary key references public.items(id) on delete cascade,
  serial_number text,
  serial_prefix text,
  grade text,
  replacement_note_status text,
  signature_variant text,
  error_note text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.postal_stationery_issue_profiles (
  conceptual_item_id uuid primary key references public.conceptual_items(id) on delete cascade,
  stationery_type text,
  issuing_authority_entity_id uuid references public.entities(id) on delete set null,
  issue_date date,
  face_value numeric(12,4),
  face_value_currency text,
  paper_type text,
  size_note text,
  imprinted_stamp_note text,
  catalogue_primary text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_pages (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  page_type text not null,
  source_kind text not null,
  source_id uuid not null,
  slug text not null unique,
  title text not null,
  summary text,
  hero_image_path text,
  item_count integer not null default 0,
  status text not null default 'draft',
  generated_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.authority_links (
  id uuid primary key default gen_random_uuid(),
  local_kind text not null,
  local_id uuid not null,
  authority_name text not null,
  authority_id text not null,
  authority_url text,
  match_type text not null,
  confidence numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (local_kind, local_id, authority_name, authority_id)
);

create table if not exists public.ingest_sources (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  source_type text not null,
  title text not null,
  file_name text,
  file_path text,
  domain_guess text,
  collection_guess text,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  collection_id uuid references public.collections(id) on delete set null,
  source_id uuid references public.ingest_sources(id) on delete set null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error_log jsonb not null default '[]'::jsonb
);

create index if not exists conceptual_items_domain_visibility_idx
  on public.conceptual_items (domain_id, visibility, review_status);

create index if not exists conceptual_items_collection_idx
  on public.conceptual_items (collection_id);

create index if not exists conceptual_items_attributes_gin_idx
  on public.conceptual_items using gin (attributes);

create index if not exists conceptual_items_search_text_gin_idx
  on public.conceptual_items using gin (search_text);

create index if not exists items_domain_visibility_idx
  on public.items (domain_id, visibility, review_status);

create index if not exists items_collection_visibility_idx
  on public.items (collection_id, visibility, review_status);

create index if not exists items_conceptual_item_idx
  on public.items (conceptual_item_id);

create index if not exists items_attributes_gin_idx
  on public.items using gin (attributes);

create index if not exists items_search_text_gin_idx
  on public.items using gin (search_text);

create index if not exists entity_aliases_normalized_alias_idx
  on public.entity_aliases (normalized_alias);

create index if not exists record_entities_record_idx
  on public.record_entities (record_kind, record_id, relation_type);

create index if not exists record_entities_entity_idx
  on public.record_entities (entity_id, relation_type);

create index if not exists record_themes_record_idx
  on public.record_themes (record_kind, record_id, relation_type);

create index if not exists record_tags_record_idx
  on public.record_tags (record_kind, record_id);

create index if not exists record_relations_source_idx
  on public.record_relations (source_kind, source_id, score desc);

create index if not exists authority_links_lookup_idx
  on public.authority_links (authority_name, authority_id);

create index if not exists media_assets_target_idx
  on public.media_assets (target_kind, target_id, sort_order);

create index if not exists item_private_profiles_owner_item_idx
  on public.item_private_profiles (owner_user_id, item_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_domains_updated_at on public.domains;
create trigger set_domains_updated_at before update on public.domains for each row execute function public.set_updated_at();

drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at before update on public.collections for each row execute function public.set_updated_at();

drop trigger if exists set_collection_schemas_updated_at on public.collection_schemas;
create trigger set_collection_schemas_updated_at before update on public.collection_schemas for each row execute function public.set_updated_at();

drop trigger if exists set_conceptual_items_updated_at on public.conceptual_items;
create trigger set_conceptual_items_updated_at before update on public.conceptual_items for each row execute function public.set_updated_at();

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at before update on public.items for each row execute function public.set_updated_at();

drop trigger if exists set_item_private_profiles_updated_at on public.item_private_profiles;
create trigger set_item_private_profiles_updated_at before update on public.item_private_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_entities_updated_at on public.entities;
create trigger set_entities_updated_at before update on public.entities for each row execute function public.set_updated_at();

drop trigger if exists set_themes_updated_at on public.themes;
create trigger set_themes_updated_at before update on public.themes for each row execute function public.set_updated_at();

drop trigger if exists set_tags_updated_at on public.tags;
create trigger set_tags_updated_at before update on public.tags for each row execute function public.set_updated_at();

drop trigger if exists set_media_assets_updated_at on public.media_assets;
create trigger set_media_assets_updated_at before update on public.media_assets for each row execute function public.set_updated_at();

drop trigger if exists set_provenance_events_updated_at on public.provenance_events;
create trigger set_provenance_events_updated_at before update on public.provenance_events for each row execute function public.set_updated_at();

drop trigger if exists set_item_sides_updated_at on public.item_sides;
create trigger set_item_sides_updated_at before update on public.item_sides for each row execute function public.set_updated_at();

drop trigger if exists set_numismatic_type_profiles_updated_at on public.numismatic_type_profiles;
create trigger set_numismatic_type_profiles_updated_at before update on public.numismatic_type_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_numismatic_item_profiles_updated_at on public.numismatic_item_profiles;
create trigger set_numismatic_item_profiles_updated_at before update on public.numismatic_item_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_philatelic_issue_profiles_updated_at on public.philatelic_issue_profiles;
create trigger set_philatelic_issue_profiles_updated_at before update on public.philatelic_issue_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_philatelic_item_profiles_updated_at on public.philatelic_item_profiles;
create trigger set_philatelic_item_profiles_updated_at before update on public.philatelic_item_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_banknote_issue_profiles_updated_at on public.banknote_issue_profiles;
create trigger set_banknote_issue_profiles_updated_at before update on public.banknote_issue_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_banknote_item_profiles_updated_at on public.banknote_item_profiles;
create trigger set_banknote_item_profiles_updated_at before update on public.banknote_item_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_postal_stationery_issue_profiles_updated_at on public.postal_stationery_issue_profiles;
create trigger set_postal_stationery_issue_profiles_updated_at before update on public.postal_stationery_issue_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_category_pages_updated_at on public.category_pages;
create trigger set_category_pages_updated_at before update on public.category_pages for each row execute function public.set_updated_at();

drop trigger if exists set_ingest_sources_updated_at on public.ingest_sources;
create trigger set_ingest_sources_updated_at before update on public.ingest_sources for each row execute function public.set_updated_at();

drop trigger if exists set_hoards_updated_at on public.hoards;
create trigger set_hoards_updated_at before update on public.hoards for each row execute function public.set_updated_at();
