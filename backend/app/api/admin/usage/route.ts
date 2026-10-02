/** POST /api/admin/usage — records a batch of page and button use for the signed-in admin. */

import { NextResponse } from 'next/server';
import { ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { recordUsage, usageBatchSchema } from '@/lib/usage';

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const parsed = usageBatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ValidationError('Invalid usage batch');
    await recordUsage('admin', request.headers.get('x-user-id'), parsed.data.events);
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
