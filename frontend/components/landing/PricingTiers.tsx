import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const packages = [
  {
    name: 'Bronze',
    price: '$199',
    description: 'Perfect for small charities',
    features: ['Sausage sizzle setup', 'Supplies for up to 200 attendees', 'Basic support', 'Weekend delivery'],
  },
  {
    name: 'Gold',
    price: '$399',
    description: 'Most popular choice',
    features: [
      'Sausage sizzle + beverages',
      'Supplies for up to 400 attendees',
      'Priority support',
      'Friday afternoon delivery',
      'Marketing materials included',
    ],
    highlighted: true,
  },
  {
    name: 'Platinum',
    price: '$699',
    description: 'Maximum fundraising potential',
    features: [
      'Full catering menu (multiple options)',
      'Supplies for up to 600 attendees',
      '24/7 event day support',
      'Thursday delivery',
      'Marketing + volunteer coordination',
      'Post-event analytics',
    ],
  },
];

export function PricingTiers() {
  return (
    <section className="bg-grey/30 px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-navy sm:mb-8 sm:text-3xl lg:text-4xl">
          Simple, transparent pricing
        </h2>
        <p className="mb-12 text-center text-charcoal/70 sm:mb-16">
          All prices are per event. Choose the package that fits your goals — packages are indicative and confirmed
          with your admin during onboarding.
        </p>
        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`overflow-hidden rounded-card transition-transform ${
                pkg.highlighted ? 'scale-105 shadow-lg ring-2 ring-accent' : 'bg-white shadow-sm'
              }`}
            >
              {pkg.highlighted && (
                <div className="bg-accent py-2 text-center text-sm font-semibold text-white">Most popular</div>
              )}
              <div className={`p-6 sm:p-8 ${pkg.highlighted ? 'bg-white' : ''}`}>
                <h3 className="mb-2 text-xl font-bold text-navy sm:text-2xl">{pkg.name}</h3>
                <p className="mb-4 text-sm text-charcoal/60">{pkg.description}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-navy sm:text-4xl">{pkg.price}</span>
                  <span className="text-sm text-charcoal/60"> per event</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <span className="mr-3 font-bold text-green-600">✓</span>
                      <span className="text-sm text-charcoal/70">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/charity/signup" className="block w-full">
                  <Button className="w-full" variant={pkg.highlighted ? 'primary' : 'outline'}>
                    Choose {pkg.name}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
