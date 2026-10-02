/** POST /api/bunnings/activities-officer/feedback { page?, message } — "Contact us" from the Bunnings area. */

import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireAoSession } from '@/lib/bunnings-ao';
import { feedbackSchema, submitFeedback } from '@/lib/feedback';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const session = await requireAoSession(request);
    const body = await parseBody(request, feedbackSchema, 'Please write a message');
    const { data: store } = await getSupabaseAdmin().from('bunnings_stores').select('location').eq('id', session.bunningsStoreId).maybeSingle();
    const result = await submitFeedback({
      userType: 'bunnings',
      userId: null,
      userEmail: session.aoEmail || null,
      charityName: store?.location ? `Bunnings ${store.location}` : 'Bunnings',
      page: body.page,
      message: body.message,
    });
    return json(request, { data: result }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}
