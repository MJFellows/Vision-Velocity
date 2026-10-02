/** Chooses and builds one of the event documents (run sheet, results summary, supplier sheet). */

import { ValidationError } from '@/utils/errors';
import {
  type EventDoc,
  buildResultsSummaryPdf,
  buildRunSheetPdf,
  buildSupplierSheetPdf,
  hasResults,
  longDate,
  safeFilename,
} from '@/lib/documents';

export type EventDocumentKind = 'run_sheet' | 'results_summary' | 'supplier_sheet';

const NAMES: Record<EventDocumentKind, { title: string; file: string }> = {
  run_sheet: { title: 'Run sheet', file: 'Run-sheet' },
  results_summary: { title: 'Fundraising results', file: 'Results' },
  supplier_sheet: { title: 'Supplier sheet', file: 'Supplier-sheet' },
};

export async function buildEventDocument(
  e: EventDoc,
  kind: EventDocumentKind,
  opts: { includePrices: boolean; audience: 'admin' | 'charity' | 'bunnings' }
): Promise<{ pdf: Uint8Array; filename: string; subject: string; intro: string }> {
  if (kind === 'supplier_sheet' && opts.audience !== 'admin') throw new ValidationError('That document is not available');
  if (kind === 'results_summary' && !hasResults(e)) throw new ValidationError('Enter the results first, then the results summary can be made.');
  const name = NAMES[kind];
  const title = e.event_name || `${e.charities?.name ?? 'Charity'} sausage sizzle`;
  const pdf =
    kind === 'run_sheet'
      ? await buildRunSheetPdf(e, opts)
      : kind === 'results_summary'
        ? await buildResultsSummaryPdf(e)
        : await buildSupplierSheetPdf(e);
  return {
    pdf,
    filename: `${name.file}-${e.event_date}-${safeFilename(e.event_name || e.charities?.name || '')}.pdf`,
    subject: `${name.title}: ${title}, ${longDate(e.event_date)}`,
    intro: `Please find attached the ${name.title.toLowerCase()} for ${title} at ${e.bunnings_stores?.location ?? 'Bunnings'} on ${longDate(e.event_date)}.`,
  };
}
