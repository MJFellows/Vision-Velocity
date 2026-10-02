/** Plain-English labels for status values stored in the database. */

export const STATUS_LABELS: Record<string, string> = {
  // charities
  trial: 'Awaiting approval',
  active: 'Approved',
  inactive: 'Inactive',
  // events
  requested: 'Requested by charity',
  planned: 'Planned',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  // event suppliers
  possible: 'Possible',
  declined: 'Declined',
  // orders
  pending: 'Pending',
  scheduled: 'Scheduled',
  delivered: 'Delivered',
};

export function statusLabel(value: string | null | undefined): string {
  if (!value) return '';
  return STATUS_LABELS[value] ?? value.replace(/_/g, ' ');
}
