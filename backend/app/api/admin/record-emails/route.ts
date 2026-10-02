/** GET /api/admin/record-emails?record_type=order|event&record_id= — emails sent for a record, newest first. */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('record_type');
    const id = url.searchParams.get('record_id');
    if (!['order', 'event'].includes(type ?? '') || !z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid record');
    const { data, error } = await getSupabaseForRequest(request)
      .from('record_emails')
      .select('id, created_at, document, recipient_email, recipient_name, sent_by_email, sent_by_type, status, include_prices')
      .eq('record_type', type!)
      .eq('record_id', id!)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
