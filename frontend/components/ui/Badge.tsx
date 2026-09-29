import clsx from 'clsx';

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
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', toneClasses[tone])}>
      {children}
    </span>
  );
}

/** Maps the schema's enum values to a sensible badge tone, so every status pill in the app looks consistent. */
export function toneForStatus(status: string): BadgeTone {
  switch (status) {
    case 'active':
    case 'confirmed':
    case 'delivered':
    case 'agreed':
    case 'order_placed':
    case 'issue_resolved':
      return 'success';
    case 'trial':
    case 'pending':
    case 'scheduled':
    case 'interested':
    case 'meeting_scheduled':
    case 'follow_up_needed':
      return 'warning';
    case 'inactive':
    case 'cancelled':
    case 'rejected':
    case 'error':
      return 'danger';
    default:
      return 'neutral';
  }
}
