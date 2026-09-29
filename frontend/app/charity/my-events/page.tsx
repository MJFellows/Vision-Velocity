import { PublicLayout } from '@/components/layouts/PublicLayout';

export default function MyEventsPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1>My events</h1>
        <p className="mt-4 text-charcoal/70">
          Placeholder — authenticated charity users will see their order history and upcoming
          events here.
        </p>
      </div>
    </PublicLayout>
  );
}
