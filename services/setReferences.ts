import { supabase } from './storage';
import { SetParallelReference } from '../types';

function mapRow(row: Record<string, unknown>): SetParallelReference {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    setCanonicalKey: String(row.set_canonical_key),
    setDisplay: typeof row.set_display === 'string' ? row.set_display : undefined,
    manufacturer: typeof row.manufacturer === 'string' ? row.manufacturer : undefined,
    productLine: typeof row.product_line === 'string' ? row.product_line : undefined,
    sport: typeof row.sport === 'string' ? row.sport : undefined,
    category:
      row.category === 'Sports' || row.category === 'TCG' || row.category === 'Non-Sports'
        ? row.category
        : undefined,
    parallelName: String(row.parallel_name),
    serialFormat: typeof row.serial_format === 'string' ? row.serial_format : undefined,
    rarityTier:
      row.rarity_tier === 'Base' || row.rarity_tier === 'Parallel' || row.rarity_tier === 'Chase' || row.rarity_tier === '1/1'
        ? row.rarity_tier
        : undefined,
    printRun: typeof row.print_run === 'number' ? row.print_run : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    sourceUrl: String(row.source_url),
    sourceLabel: typeof row.source_label === 'string' ? row.source_label : undefined,
    personalUseOnly: row.personal_use_only !== false,
    createdAt: typeof row.created_at === 'string' ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: typeof row.updated_at === 'string' ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

export async function listSetParallelReferences(
  userId: string,
  setCanonicalKey: string,
  limit = 60
): Promise<SetParallelReference[]> {
  if (!supabase || !userId || !setCanonicalKey) return [];

  const { data, error } = await supabase
    .from('set_parallel_references')
    .select('*')
    .eq('user_id', userId)
    .eq('set_canonical_key', setCanonicalKey)
    .order('parallel_name', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 200)));

  if (error || !data) {
    console.warn('listSetParallelReferences failed:', error);
    return [];
  }

  return data.map((row) => mapRow(row as Record<string, unknown>));
}

export async function upsertSetParallelReference(
  item: Omit<SetParallelReference, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<SetParallelReference | null> {
  if (!supabase) return null;

  const payload = {
    ...(item.id ? { id: item.id } : {}),
    user_id: item.userId,
    set_canonical_key: item.setCanonicalKey,
    set_display: item.setDisplay ?? null,
    manufacturer: item.manufacturer ?? null,
    product_line: item.productLine ?? null,
    sport: item.sport ?? null,
    category: item.category ?? null,
    parallel_name: item.parallelName,
    serial_format: item.serialFormat ?? null,
    rarity_tier: item.rarityTier ?? null,
    print_run: item.printRun ?? null,
    notes: item.notes ?? null,
    source_url: item.sourceUrl,
    source_label: item.sourceLabel ?? null,
    personal_use_only: item.personalUseOnly,
  };

  const { data, error } = await supabase
    .from('set_parallel_references')
    .upsert(payload)
    .select('*')
    .single();

  if (error || !data) {
    console.warn('upsertSetParallelReference failed:', error);
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}
