import {
  normalizeArchivePrivateItemProfile,
} from '@/backend-support/mappers/normalizeArchiveItem';
import {
  archivePrivateItemProfileSchema,
  type ArchivePrivateItemProfileRow,
} from '@/backend-support/schemas/archive';
import { supabaseMaybeSingle } from '@/shared/services/supabase';

export async function getPrivateItemProfile(itemId: string) {
  const row = await supabaseMaybeSingle<ArchivePrivateItemProfileRow>('item_private_profiles', {
    select:
      'id,item_id,owner_user_id,year_bought,purchase_price,purchase_currency,estimated_value_min,estimated_value_max,estimated_value_avg,acquisition_source,acquisition_date,internal_notes,private_tags,private_attributes',
    item_id: `eq.${itemId}`,
    limit: 1,
  });

  return row ? normalizeArchivePrivateItemProfile(archivePrivateItemProfileSchema.parse(row)) : null;
}
