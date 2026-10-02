/** GET /api/charity/events/:id — one of the charity's own events. */

import { z } from 'zod';
import { json, errorResponse } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CHARITY_EVENT_COLUMNS } from '@/lib/charity-data';
import { NotFoundError, ValidationError } from '@/utils/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const caller = await requireCharityCaller(request);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid event');
    const { data, error } = await getSupabaseAdmin()
      .from('events')
      .select(CHARITY_EVENT_COLUMNS)
      .eq('id', id)
      .eq('charity_id', caller.charityId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Event not found');
    return json(request, { data });
  } catch (error) {
    return errorResponse(request, error);
  }
}
