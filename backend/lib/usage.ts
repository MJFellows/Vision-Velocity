/**
 * Usage recording: which pages and buttons are used, by which type of user and
 * on which kind of device. Never stores anything typed into forms. Rows older
 * than 12 months are deleted daily by the pg_cron job "purge-old-usage-events".
 */

import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';

export const usageBatchSchema = z.object({
  events: z
    .array(
      z.object({
        event_type: z.enum(['page_view', 'click', 'search_no_results', 'help_open', 'form_abandoned', 'form_submitted']),
        // A path only: the query string is dropped so search terms or tokens never end up here.
        page: z.string().max(300).transform((p) => p.split('?')[0].split('#')[0]),
        target: z.string().max(120).nullable().optional(),
        device: z.enum(['phone', 'tablet', 'computer', 'unknown']).optional(),
      })
    )
    .min(1)
    .max(50),
});

export async function recordUsage(
  userType: 'admin' | 'charity' | 'bunnings',
  userId: string | null,
  events: z.infer<typeof usageBatchSchema>['events']
): Promise<void> {
  const rows = events.map((e) => ({
    user_type: userType,
    user_id: userId,
    event_type: e.event_type,
    page: e.page,
    target: e.target ?? null,
    device: e.device ?? 'unknown',
  }));
  const { error } = await getSupabaseAdmin().from('usage_events').insert(rows);
  if (error) throw error;
}
