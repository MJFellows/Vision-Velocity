/** POST /api/charity/usage — records page and button use in the charity area (no form contents). */

import { json, errorResponse } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { recordUsage, usageBatchSchema } from '@/lib/usage';
import { ValidationError } from '@/utils/errors';

export async function POST(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    const parsed = usageBatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ValidationError('Invalid usage batch');
    await recordUsage('charity', caller.authUserId, parsed.data.events);
    return json(request, { success: true });
  } catch (error) {
    return errorResponse(request, error);
  }
}
