/** POST /api/charity/feedback { page, message } — "Send feedback" / "Contact Vision Velocity" from the charity area. */

import { json, errorResponse, parseBody } from '@/lib/route-helpers';
import { requireCharityCaller } from '@/lib/charity-auth';
import { feedbackSchema, submitFeedback } from '@/lib/feedback';

export async function POST(request: Request) {
  try {
    const caller = await requireCharityCaller(request);
    const body = await parseBody(request, feedbackSchema, 'Invalid message');
    const result = await submitFeedback({
      userType: 'charity',
      userId: caller.authUserId,
      userEmail: caller.email,
      charityName: caller.charityName,
      page: body.page,
      message: body.message,
    });
    return json(request, { data: result }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}
