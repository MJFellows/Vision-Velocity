/** Shared column list and field rules for the admin packages routes. */

import { z } from 'zod';

export const PACKAGE_COLUMNS =
  'id, name, description, base_price_aud, items, is_active, created_at, updated_at, is_deleted, package_components(id, component_id, quantity, components(id, name, quantity, unit, target_buy_cost_aud, target_sell_price_aud, is_active))';

export const packageFields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(2000).nullable(),
  base_price_aud: z.number().min(0, 'Cannot be negative').max(1_000_000).multipleOf(0.01, 'Use dollars and cents'),
  is_active: z.boolean(),
};
