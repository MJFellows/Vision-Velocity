/**
 * GET  /api/admin/feedback        recent feedback (newest first)
 * POST /api/admin/feedback        { page, message } from the "Send feedback" button
 * PATCH via ?id=&status=done      mark as dealt with
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseForRequest } from '@/lib/supabase';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { feedbackSchema, submitFeedback } from '@/lib/feedback';

function withCors(res: NextResponse, cors: Record<string, string>) {
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

export async function GET(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  try {
    const { data, error } = await getSupabaseForRequest(request)
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    return withCors(handleApiError(error), cors);
  }
}

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  try {
    const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError('Invalid feedback', Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])));
    }
    const result = await submitFeedback({
      userType: 'admin',
      userId: request.headers.get('x-user-id'),
      userEmail: request.headers.get('x-user-email'),
      page: parsed.data.page,
      message: parsed.data.message,
    });
    return NextResponse.json({ data: result }, { status: 201, headers: cors });
  } catch (error) {
    return withCors(handleApiError(error), cors);
  }
}

export async function PATCH(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin')) as Record<string, string>;
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const status = url.searchParams.get('status');
    if (!id || !z.string().uuid().safeParse(id).success || !['new', 'done'].includes(status ?? '')) {
      throw new ValidationError('Invalid feedback update');
    }
    const { data, error } = await getSupabaseForRequest(request).from('feedback').update({ status }).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ data }, { headers: cors });
  } catch (error) {
    return withCors(handleApiError(error), cors);
  }
}
