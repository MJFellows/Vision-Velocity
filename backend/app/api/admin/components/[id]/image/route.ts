/**
 * POST   /api/admin/components/:id/image   multipart/form-data with a `file` field
 *                                          (JPEG, PNG or WebP, up to 4 MB); replaces any existing image
 * DELETE /api/admin/components/:id/image   removes the image
 *
 * The file is stored in the public `component-images` bucket using the
 * service-role client (the bucket has no write policies), after the caller has
 * passed the admin gate in proxy.ts and the component has been found under the
 * caller's own RLS.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin, getSupabaseForRequest } from '@/lib/supabase';
import { NotFoundError, ValidationError, handleApiError } from '@/utils/errors';
import { buildCorsHeaders } from '@/utils/cors';
import { getClientIp } from '@/utils/rateLimit';
import { logAdminAction } from '@/lib/audit';
import { COMPONENT_COLUMNS, COMPONENT_IMAGE_BUCKET, withImageUrl } from '@/lib/components';

const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function loadComponent(request: Request, id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Invalid component id');
  const { data, error } = await getSupabaseForRequest(request)
    .from('components')
    .select('id, name, image_path')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError('Component not found');
  return data;
}

function audit(request: Request, id: string, action: string, description: string, after: Record<string, unknown>) {
  return logAdminAction({
    adminUserId: request.headers.get('x-user-id'),
    userEmail: request.headers.get('x-user-email') ?? 'unknown',
    action,
    description,
    entityType: 'components',
    entityId: id,
    changes: { before: null, after },
    recordIds: [id],
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const { id } = await params;
    const component = await loadComponent(request, id);

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw new ValidationError('Attach an image file in the "file" field');
    const ext = EXTENSIONS[file.type];
    if (!ext) throw new ValidationError('Use a JPEG, PNG or WebP image');
    if (file.size > MAX_BYTES) throw new ValidationError('Image must be 4 MB or smaller');

    const path = `${id}/${Date.now()}.${ext}`;
    const storage = getSupabaseAdmin().storage.from(COMPONENT_IMAGE_BUCKET);
    const { error: uploadError } = await storage.upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data, error } = await getSupabaseForRequest(request)
      .from('components')
      .update({ image_path: path })
      .eq('id', id)
      .select(COMPONENT_COLUMNS)
      .single();
    if (error) {
      await storage.remove([path]).catch(() => undefined);
      throw error;
    }
    if (component.image_path) await storage.remove([component.image_path]).catch(() => undefined);

    await audit(request, id, 'uploaded_component_image', `Uploaded image for ${component.name}`, { image_path: path });
    return NextResponse.json({ data: withImageUrl(data) }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  try {
    const { id } = await params;
    const component = await loadComponent(request, id);
    const { data, error } = await getSupabaseForRequest(request)
      .from('components')
      .update({ image_path: null })
      .eq('id', id)
      .select(COMPONENT_COLUMNS)
      .single();
    if (error) throw error;
    if (component.image_path) {
      await getSupabaseAdmin().storage.from(COMPONENT_IMAGE_BUCKET).remove([component.image_path]).catch(() => undefined);
    }
    await audit(request, id, 'removed_component_image', `Removed image for ${component.name}`, { image_path: null });
    return NextResponse.json({ data: withImageUrl(data) }, { headers: cors });
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}
