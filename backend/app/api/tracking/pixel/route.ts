// GET /api/tracking/pixel?id={tracking_pixel_id}
// Email open tracking: always returns a 1x1 GIF so a failure never breaks email rendering.

import { isUuid, pixelResponse, recordOpen } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (isUuid(id)) await recordOpen(id);
  return pixelResponse();
}
