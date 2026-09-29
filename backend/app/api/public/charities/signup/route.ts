/**
 * POST /api/public/charities/signup
 *
 * Public, unauthenticated charity signup (Task 3.1). Deliberately uses the
 * service-role client (getSupabaseAdmin()) rather than getSupabaseForRequest()
 * — this is one of the few legitimate exceptions to this codebase's usual
 * RLS-first rule (see backend README): there is no RLS policy granting the
 * anon role INSERT on `charities` (only charities_admin_all for authenticated
 * admins and charities_self_select/update for a charity's own auth_user_id),
 * and there shouldn't be one — an open public-insert policy would let anyone
 * write arbitrary charity rows directly. Every field here is instead
 * strictly validated server-side before the service-role insert, which is
 * the deliberate trade-off this endpoint makes.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ValidationError, ConflictError, InternalServerError, handleApiError } from '@/utils/errors';
import { logAdminAction } from '@/lib/audit';
import { buildCorsHeaders } from '@/utils/cors';
import { sendEmail } from '@/lib/email';

// Validation schema for charity signup. Field names match the deployed
// `charities` table where the signup collects that data directly
// (charity_name -> name, address -> location, etc.); the event-related
// fields (event_date, bunnings_store_id, expected_attendees) don't map to
// any `charities` column — orders are created separately by an admin once
// the charity is approved — so they're folded into internal_notes for the
// approving admin to action, not silently dropped.
const signupCharitySchema = z.object({
  charity_name: z.string().min(2, 'Charity name must be at least 2 characters').max(100),
  abn: z.string().regex(/^\d{11}$/, 'ABN must be 11 digits').optional().or(z.literal('')),
  cause_description: z.string().max(200).optional().or(z.literal('')),
  contact_name: z.string().min(2).max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^[\d\s\-+()]{10,}$/, 'Please enter a valid phone number'),
  location: z.string().max(200).optional().or(z.literal('')),
  event_date: z.string().refine((date) => {
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  }, 'Event date must be in the future'),
  bunnings_store_id: z.string().uuid('Invalid Bunnings store selection'),
  expected_attendees: z.number().int().min(1).max(500),
  special_requirements: z.string().max(500).optional().or(z.literal('')),
});

type SignupCharityInput = z.infer<typeof signupCharitySchema>;

export async function POST(request: Request) {
  const cors = buildCorsHeaders(request.headers.get('origin'));
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const body = await request.json().catch(() => null);

    let validatedData: SignupCharityInput;
    try {
      validatedData = signupCharitySchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Validation failed',
          Object.fromEntries(error.issues.map((i) => [i.path.join('.'), i.message]))
        );
      }
      throw error;
    }

    const supabase = getSupabaseAdmin();

    const { data: existingCharity, error: checkError } = await supabase
      .from('charities')
      .select('id')
      .eq('email', validatedData.email)
      .eq('is_deleted', false)
      .maybeSingle();

    if (checkError) throw new InternalServerError(`Database error: ${checkError.message}`);
    if (existingCharity) throw new ConflictError('Email already registered with Vision Velocity');

    const { data: store, error: storeError } = await supabase
      .from('bunnings_stores')
      .select('id, location')
      .eq('id', validatedData.bunnings_store_id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (storeError || !store) {
      throw new ValidationError('Invalid Bunnings store selection', {
        bunnings_store_id: 'Please select a valid Bunnings location',
      });
    }

    const internalNotes = [
      `Signup via public form on ${new Date().toISOString().slice(0, 10)}.`,
      `Requested first event: ${validatedData.event_date} at store ${validatedData.bunnings_store_id}, ~${validatedData.expected_attendees} attendees.`,
      validatedData.cause_description ? `Cause: ${validatedData.cause_description}` : null,
      validatedData.special_requirements ? `Special requirements: ${validatedData.special_requirements}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const { data: newCharity, error: createError } = await supabase
      .from('charities')
      .insert({
        name: validatedData.charity_name,
        email: validatedData.email,
        phone: validatedData.phone,
        location: validatedData.location || null,
        contact_name: validatedData.contact_name,
        tax_id: validatedData.abn || null,
        bunnings_store_id: validatedData.bunnings_store_id,
        internal_notes: internalNotes,
        tags: ['from-public-signup'],
        subscription_status: 'trial',
      })
      .select()
      .single();

    if (createError || !newCharity) {
      throw new InternalServerError(`Failed to create charity: ${createError?.message}`);
    }

    // Attributed to the public signup flow, not a real admin — userEmail is
    // required by logAdminAction() but there is no acting admin here.
    await logAdminAction({
      userEmail: 'public-signup-form',
      action: 'public_charity_signup',
      description: `Public signup: "${validatedData.charity_name}"`,
      entityType: 'charities',
      entityId: newCharity.id,
      changes: { before: null, after: { status: 'trial', source: 'public_signup' } },
      requestParams: {
        charity_name: validatedData.charity_name,
        email: validatedData.email,
        contact_name: validatedData.contact_name,
      },
      recordIds: [newCharity.id],
      ipAddress,
      userAgent,
    });

    // Task 3.3: confirmation to the charity and notification to the admins.
    // Best-effort: a failed email must never fail a signup that has already
    // been saved, so errors are logged and swallowed.
    await sendSignupEmails({
      charityId: newCharity.id,
      charityName: validatedData.charity_name,
      contactName: validatedData.contact_name,
      email: validatedData.email,
      phone: validatedData.phone,
      location: validatedData.location || '',
      eventDate: validatedData.event_date,
      expectedAttendees: validatedData.expected_attendees,
      storeLocation: store.location as string,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for signing up! We will review your application and email you within 24 hours.',
        charityId: newCharity.id,
      },
      { status: 201, headers: cors }
    );
  } catch (error) {
    const res = handleApiError(error);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v as string);
    return res;
  }
}

async function sendSignupEmails(d: {
  charityId: string;
  charityName: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  eventDate: string;
  expectedAttendees: number;
  storeLocation: string;
}): Promise<void> {
  try {
    const supportEmail = process.env.NEXT_PUBLIC_EMAIL_REPLY_TO || 'support@visionvelocity.com.au';

    const confirmation = await sendEmail({
      templateId: 'charity_signup_confirmation',
      recipientEmail: d.email,
      recipientName: d.contactName,
      variables: {
        charityName: d.charityName,
        contactName: d.contactName,
        contactEmail: d.email,
        contactPhone: d.phone,
        unsubscribeUrl: `mailto:${supportEmail}?subject=Unsubscribe`,
      },
    });
    if (!confirmation.success) console.warn('[signup] confirmation email failed:', confirmation.error);

    const adminRecipients = (process.env.ADMIN_NOTIFICATION_EMAILS || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (adminRecipients.length === 0) {
      console.warn('[signup] ADMIN_NOTIFICATION_EMAILS not set; admin notification skipped');
      return;
    }

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    for (const adminEmail of adminRecipients) {
      const res = await sendEmail({
        templateId: 'admin_notification_signup',
        recipientEmail: adminEmail,
        recipientName: 'Vision Velocity admin',
        variables: {
          charityName: d.charityName,
          contactName: d.contactName,
          contactEmail: d.email,
          contactPhone: d.phone,
          charityAddress: d.location || 'Not provided',
          preferredBunningsLocation: d.storeLocation,
          requestedEventDate: d.eventDate,
          expectedAttendees: d.expectedAttendees,
          signupTime: new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }),
          adminDashboardUrl: `${frontendUrl}/admin/charities/${d.charityId}`,
        },
      });
      if (!res.success) console.warn('[signup] admin notification failed:', adminEmail, res.error);
    }
  } catch (error) {
    console.error('[signup] email sending threw (non-fatal):', error);
  }
}
