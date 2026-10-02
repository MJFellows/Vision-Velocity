/** PATCH /api/charity/profile — the charity updates its own contact details. */

import { z } from 'zod';
import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CHARITY_SAFE_COLUMNS } from '@/lib/charity-data';
import { ValidationError } from '@/utils/errors';
import { logAdminAction, diffChanges } from '@/lib/audit';
import { getClientIp } from '@/utils/rateLimit';

const text = (max: number) => z.string().trim().max(max).nullable();
const schema = z
  .object({
    contact_name: text(200),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
    phone: text(30),
    location: text(300),
    postcode: z.string().regex(/^\d{4}$/, 'Postcode must be 4 digits').nullable(),
    bunnings_store_id: z.string().uuid().nullable(),
  })
  .partial();

export async function PATCH(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    const update = await parseBody(request, schema, 'Invalid details');
    if (Object.keys(update).length === 0) throw new ValidationError('No changes to save');
    const admin = getSupabaseAdmin();
    const { data: before } = await admin.from('charities').select('contact_name, email, phone, location, postcode, bunnings_store_id').eq('id', caller.charityId).single();
    const { data, error } = await admin.from('charities').update(update).eq('id', caller.charityId).select(CHARITY_SAFE_COLUMNS).single();
    if (error) {
      if (error.code === '23503') throw new ValidationError('That Bunnings store was not found');
      if (error.code === '23505') throw new ValidationError('That email address is already used by another charity');
      throw error;
    }
    await logAdminAction({
      adminUserId: null,
      userEmail: `${caller.email} (charity)`,
      action: 'charity_updated_profile',
      description: `${caller.charityName} updated its details (${Object.keys(update).join(', ')})`,
      entityType: 'charities',
      entityId: caller.charityId,
      changes: before ? diffChanges(before, { ...before, ...update }) : null,
      recordIds: [caller.charityId],
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    });
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
