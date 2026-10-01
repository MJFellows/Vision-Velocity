/** Shared definitions for components (ingredients/items that make up packages). */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

export const COMPONENT_IMAGE_BUCKET = 'component-images';
export const COMPONENT_STORAGE_TYPES = ['shelf', 'refrigerated', 'frozen'] as const;
export const COMPONENT_COLUMNS =
  'id, name, pack_size, quantity, unit, size_litres, storage, packaging_material, target_buy_cost_aud, target_sell_price_aud, comments, image_path, is_active, created_at, updated_at, is_deleted';

const money = z.number().min(0, 'Cannot be negative').max(1_000_000).multipleOf(0.01, 'Use dollars and cents').nullable();
const text = (max: number) => z.string().trim().max(max).nullable();

export const componentFields = {
  name: z.string().trim().min(1, 'Name is required').max(150),
  pack_size: text(100),
  quantity: z.number().positive('Must be more than 0').max(1_000_000).nullable(),
  unit: z.string().trim().min(1).max(30).nullable(),
  size_litres: z.number().min(0).max(100_000).nullable(),
  storage: z.enum(COMPONENT_STORAGE_TYPES).nullable(),
  packaging_material: text(150),
  target_buy_cost_aud: money,
  target_sell_price_aud: money,
  comments: text(2000),
  is_active: z.boolean(),
};

/** Public URL for an image stored in the component-images bucket. */
export function componentImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  return base ? `${base}/storage/v1/object/public/${COMPONENT_IMAGE_BUCKET}/${path}` : null;
}

export function withImageUrl<T extends { image_path?: string | null }>(row: T): T & { image_url: string | null } {
  return { ...row, image_url: componentImageUrl(row.image_path) };
}

/** Maps Postgres errors from components writes to friendly messages. */
export function componentWriteError(error: { code?: string; message?: string }): string | null {
  if (error.code === '23505') return 'A component with that name already exists';
  if (error.code === '23503') return 'Unknown unit';
  if (error.code === '23514') return 'Quantity and unit must be entered together, and numbers cannot be negative';
  return null;
}

export const packageComponentsSchema = z
  .array(z.object({ component_id: z.string().uuid(), quantity: z.number().positive().max(100_000) }))
  .max(100)
  .refine((list) => new Set(list.map((c) => c.component_id)).size === list.length, 'Each component can be listed once');

/** Replaces a package's contents. Runs as the calling admin (RLS). Not a single transaction. */
export async function replacePackageComponents(
  supabase: SupabaseClient,
  packageId: string,
  components: z.infer<typeof packageComponentsSchema>
): Promise<void> {
  const { error: delError } = await supabase.from('package_components').delete().eq('package_id', packageId);
  if (delError) throw delError;
  if (components.length === 0) return;
  const { error } = await supabase
    .from('package_components')
    .insert(components.map((c) => ({ package_id: packageId, component_id: c.component_id, quantity: c.quantity })));
  if (error) throw error;
}
