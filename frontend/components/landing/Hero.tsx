import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-grey/40 to-white px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="mb-4 text-3xl font-bold text-navy sm:mb-6 sm:text-4xl lg:text-5xl">
          Fundraise Smarter for Your Cause
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-charcoal/70 sm:mb-8 sm:text-xl">
          Vision Velocity handles the logistics. You focus on your community and your mission.
        </p>
        <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-charcoal/70 sm:mb-12 sm:text-lg">
          Running sausage sizzles and catering events for fundraising shouldn&apos;t be stressful. We partner with
          local and chain suppliers across Australia to make event logistics simple, proven and profitable — so your charity can raise more
          funds with less work.
        </p>
        <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/charity/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Start Your First Fundraiser
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Learn More
            </Button>
          </Link>
        </div>
        <div className="flex h-64 items-center justify-center overflow-hidden rounded-card bg-gradient-to-br from-grey/60 to-grey/20 shadow-sm sm:h-96">
          <div className="text-center">
            <p className="text-lg text-charcoal/50">People fundraising with a sausage sizzle</p>
            <p className="mt-2 text-sm text-charcoal/40">[Hero image placeholder]</p>
          </div>
        </div>
      </div>
    </section>
  );
}
