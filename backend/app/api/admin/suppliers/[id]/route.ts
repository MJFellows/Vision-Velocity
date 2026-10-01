/**
 * GET /api/admin/suppliers/:id
 *
 * A single supplier store with every field, including normalised opening hours,
 * the original source hours text and facilities.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid supplier id');

    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Supplier not found');

    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
