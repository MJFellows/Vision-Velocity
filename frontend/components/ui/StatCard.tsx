import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: string;
  isLoading?: boolean;
}

export function StatCard({ label, value, isLoading }: StatCardProps) {
  return (
    <Card padded className="text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-charcoal/50">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-navy">{isLoading ? '—' : value}</p>
    </Card>
  );
}
