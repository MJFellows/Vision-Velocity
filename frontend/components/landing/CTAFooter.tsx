import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function CTAFooter() {
  return (
    <section className="bg-navy px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-2xl font-bold text-white sm:mb-6 sm:text-3xl lg:text-4xl">Ready to fundraise smarter?</h2>
        <p className="mb-8 text-lg text-white/80 sm:mb-12">
          Join charities across Australia raising more funds with less stress.
        </p>
        <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/charity/signup">
            <Button size="lg" className="w-full bg-white text-navy hover:bg-grey sm:w-auto">
              Get Started Today
            </Button>
          </Link>
          <Link href="mailto:support@visionvelocity.com.au">
            <Button size="lg" variant="outline" className="w-full border-white text-white hover:bg-navy-700 sm:w-auto">
              Questions? Get in Touch
            </Button>
          </Link>
        </div>
        <p className="text-sm text-white/70">
          First event set up within 24 hours of signup. Questions? Email support@visionvelocity.com.au
        </p>
      </div>
    </section>
  );
}
