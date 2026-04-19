-- Fix record_references missing unique constraint
alter table public.record_references
add constraint record_references_unique_key
unique (record_kind, record_id, reference_type, reference_system, reference_code, url);

-- Ensure items have sortable year fields if they were missing (they should be there but good to check)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name='items' and column_name='sort_year_start') then
        alter table public.items add column sort_year_start integer;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='items' and column_name='sort_year_end') then
        alter table public.items add column sort_year_end integer;
    end if;
end $$;
