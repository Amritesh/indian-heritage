insert into public.domains (canonical_id, slug, name, description, sort_order)
values
  ('ahg:domain:coins', 'coins', 'Coins', 'Numismatic heritage across Indian history.', 1),
  ('ahg:domain:stamps', 'stamps', 'Stamps', 'Philatelic heritage from princely, colonial, and modern India.', 2),
  ('ahg:domain:currency', 'currency', 'Currency', 'Paper money and currency instruments from Indian monetary history.', 3),
  ('ahg:domain:postal-stationery', 'postal-stationery', 'Postal Stationery', 'Postcards, envelopes, stationery, and related postal objects.', 4),
  ('ahg:domain:philatelic-items', 'philatelic-items', 'Philatelic Items', 'Special philatelic material, first-day covers, and related archival objects.', 5),
  ('ahg:domain:medals-tokens', 'medals-tokens', 'Medals & Tokens', 'Tokens, medals, and commemorative metallic issues.', 6),
  ('ahg:domain:documents-ephemera', 'documents-ephemera', 'Documents / Ephemera', 'Documentary and paper-based heritage objects connected to Indian history.', 7)
on conflict (canonical_id) do update
set slug = excluded.slug,
    name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;
