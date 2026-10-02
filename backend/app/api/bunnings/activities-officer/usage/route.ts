/** POST /api/bunnings/activities-officer/usage { events: [...] } — page and button use in the Bunnings area (no personal details). */

import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireAoSession } from '@/lib/bunnings-ao';
import { recordUsage, usageBatchSchema } from '@/lib/usage';

export async function POST(request: Request) {
  try {
    await requireAoSession(request);
    const body = await parseBody(request, usageBatchSchema);
    await recordUsage('bunnings', null, body.events);
    return json(request, { data: { recorded: body.events.length } });
  } catch (error) {
    return errorResponse(request, error);
  }
}
