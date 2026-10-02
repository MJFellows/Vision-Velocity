import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/PublicLayout';

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: 'What does Vision Velocity do?', a: 'We help charities run sausage sizzles and similar fundraising events: we book the Bunnings slot, line up supplies from local supermarkets and give you a run sheet for the day.' },
  { q: 'How do we get started?', a: <>Register your charity on the <Link href="/charity/signup" className="text-accent underline">sign-up page</Link>. We review new charities, usually within a day, and email you when you are approved.</> },
  { q: 'What happens after we are approved?', a: 'You receive an email to set up your sign-in. In your charity area you can request events, see your events and orders, print or email run sheets and order summaries, and keep your details up to date.' },
  { q: 'How do we sign in?', a: <>Go to the <Link href="/charity/login" className="text-accent underline">charity sign-in page</Link> and use your password, or ask for a sign-in link to be emailed to you.</> },
  { q: 'Can more than one person from our charity sign in?', a: 'Yes. Your main contact can add other people, such as your treasurer, from the Profile page.' },
  { q: 'Is an order summary a tax invoice?', a: 'No. Order summaries are a record of what was ordered and are clearly labelled "not a tax invoice".' },
  { q: 'I am a Bunnings Activities Officer. How do I see events at my store?', a: 'We email you a secure link to the events at your store. If your link has expired, contact us and we will send a new one.' },
  { q: 'Who do we contact with questions?', a: <>Email <a href="mailto:support@visionvelocity.com.au" className="text-accent underline">support@visionvelocity.com.au</a>, or use Contact us once you are signed in.</> },
];

export default function FaqPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-6">Frequently asked questions</h1>
        <div className="space-y-4">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-card border border-grey bg-white p-4">
              <summary className="cursor-pointer font-medium text-navy">{f.q}</summary>
              <div className="mt-2 text-sm text-charcoal/80">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
