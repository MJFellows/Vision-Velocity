import clsx from 'clsx';
import { statusLabel } from '@/lib/labels';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-grey text-charcoal',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-800',
};

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: BadgeTone }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', toneClasses[tone])}>
      {typeof children === 'string' ? capitalise(statusLabel(children)) : children}
    </span>
  );
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Maps the schema's enum values to a sensible badge tone, so every status pill in the app looks consistent. */
export function toneForStatus(status: string): BadgeTone {
  switch (status) {
    case 'active':
    case 'confirmed':
    case 'delivered':
    case 'completed':
    case 'agreed':
    case 'order_placed':
    case 'issue_resolved':
      return 'success';
    case 'trial':
    case 'requested':
    case 'pending':
    case 'scheduled':
    case 'planned':
    case 'possible':
    case 'interested':
    case 'meeting_scheduled':
    case 'follow_up_needed':
      return 'warning';
    case 'inactive':
    case 'cancelled':
    case 'rejected':
    case 'declined':
    case 'error':
      return 'danger';
    default:
      return 'neutral';
  }
}
