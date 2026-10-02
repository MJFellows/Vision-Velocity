import { Card } from '@/components/ui/Card';
import { Badge, toneForStatus } from '@/components/ui/Badge';
import type { SupplierContact } from '@/lib/types';

const STATUS_STAGES = [
  { key: 'interested', label: 'Interested', description: 'Initial contact established' },
  { key: 'meeting_scheduled', label: 'Meeting scheduled', description: 'Meeting date confirmed' },
  { key: 'proposal_submitted', label: 'Proposal submitted', description: 'Vision Velocity proposal sent' },
  { key: 'negotiating', label: 'Negotiating', description: 'Terms being discussed' },
  { key: 'agreed', label: 'Agreed', description: 'Partnership confirmed' },
];

const ROLE_LABELS: Record<string, string> = {
  category_manager: 'Category manager',
  store_manager: 'Store manager',
  supply_manager: 'Supply manager',
  other: 'Other',
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('en-AU') : 'Not set');

export function SupplierStatusCard({ contact }: { contact: SupplierContact }) {
  const currentStageIndex = STATUS_STAGES.findIndex((s) => s.key === contact.status);

  return (
    <Card className="mb-6 max-w-2xl">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-charcoal/70">Negotiation progress</h3>
      <ol className="mb-6 space-y-3">
        {STATUS_STAGES.map((stage, idx) => (
          <li key={stage.key} className="flex items-start gap-3">
            <span
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                idx <= currentStageIndex ? 'bg-navy text-white' : 'bg-grey text-charcoal/70'
              }`}
            >
              {idx + 1}
            </span>
            <div className="flex-1">
              <p className={idx <= currentStageIndex ? 'font-medium text-charcoal' : 'text-charcoal/70'}>{stage.label}</p>
              <p className="text-sm text-charcoal/70">{stage.description}</p>
            </div>
            {idx === currentStageIndex && <Badge tone={toneForStatus(contact.status)}>Current</Badge>}
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-1 gap-4 border-t border-grey pt-4 text-sm md:grid-cols-2">
        <div>
          <dt className="text-charcoal/70">Contact</dt>
          <dd className="font-medium text-charcoal">{contact.contact_person_name}</dd>
          {contact.contact_role && <dd className="text-charcoal/70">{ROLE_LABELS[contact.contact_role] ?? contact.contact_role}</dd>}
          {contact.contact_email && (
            <dd>
              <a className="text-navy underline" href={`mailto:${contact.contact_email}`}>
                {contact.contact_email}
              </a>
            </dd>
          )}
          {contact.contact_phone && <dd className="text-charcoal/70">{contact.contact_phone}</dd>}
        </div>
        <div>
          <dt className="text-charcoal/70">Dates</dt>
          <dd>Last contact: {formatDate(contact.last_contact_date)}</dd>
          <dd>Next contact: {formatDate(contact.next_contact_date)}</dd>
        </div>
        <div>
          <dt className="text-charcoal/70">Delivery and logistics</dt>
          <dd>{contact.delivery_logistics_status || 'Not recorded'}</dd>
        </div>
        <div>
          <dt className="text-charcoal/70">Supply and pricing</dt>
          <dd>{contact.supply_pricing_status || 'Not recorded'}</dd>
        </div>
        <div>
          <dt className="text-charcoal/70">Commercial agreement</dt>
          <dd>{contact.commercial_agreement_status || 'Not recorded'}</dd>
        </div>
      </dl>

      {contact.discussion_summary && (
        <div className="mt-4 border-t border-grey pt-4 text-sm">
          <p className="text-charcoal/70">Discussion summary</p>
          <p className="whitespace-pre-wrap text-charcoal">{contact.discussion_summary}</p>
        </div>
      )}
      {contact.internal_notes && (
        <div className="mt-4 border-t border-grey pt-4 text-sm">
          <p className="text-charcoal/70">Internal notes</p>
          <p className="whitespace-pre-wrap text-charcoal">{contact.internal_notes}</p>
        </div>
      )}
    </Card>
  );
}
