import type { OpeningHours, WeekdayKey } from '@/lib/types';

const DAYS: { key: WeekdayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

/** '07:00' -> '7:00 am', '22:00' -> '10:00 pm' */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatDay(day: OpeningHours[WeekdayKey]): string {
  if (!day) return 'Not recorded';
  if ('closed' in day) return 'Closed';
  return `${formatTime(day.open)} – ${formatTime(day.close)}`;
}

/**
 * Shows normalised opening hours as a Monday-to-Sunday table. If the source hours
 * could not be parsed (opening_hours is null) but the original text was kept, that
 * text is shown as-is so nothing is lost.
 */
export function OpeningHoursTable({ hours, raw }: { hours: OpeningHours | null; raw?: string | null }) {
  if (!hours) {
    return raw ? (
      <div>
        <p className="mb-1 text-xs text-charcoal/60">Hours could not be structured — original text from source:</p>
        <p className="whitespace-pre-wrap text-sm text-charcoal">{raw}</p>
      </div>
    ) : (
      <p className="text-sm text-charcoal/60">Opening hours not recorded.</p>
    );
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {DAYS.map(({ key, label }) => (
          <tr key={key} className="border-b border-grey last:border-0">
            <th scope="row" className="py-1 pr-4 text-left font-normal text-charcoal/60">
              {label}
            </th>
            <td className="py-1 text-right text-charcoal">{formatDay(hours[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
