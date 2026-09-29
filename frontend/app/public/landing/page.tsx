// File: app/public/landing/page.tsx
// Public landing page for Vision Velocity

import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Benefits } from '@/components/landing/Benefits';
import { Testimonial } from '@/components/landing/Testimonial';
import { PricingTiers } from '@/components/landing/PricingTiers';
import { FAQ } from '@/components/landing/FAQ';
import { CTAFooter } from '@/components/landing/CTAFooter';

export const metadata = {
  title: 'Vision Velocity - Fundraise Smarter for Your Cause',
  description: 'Vision Velocity handles all the logistics of sausage sizzles and catering events. Focus on your cause, we focus on the details.',
};

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <Hero />

      {/* How It Works */}
      <HowItWorks />

      {/* Benefits */}
      <Benefits />

      {/* Testimonial */}
      <Testimonial />

      {/* Pricing */}
      <PricingTiers />

      {/* FAQ */}
      <FAQ />

      {/* CTA Footer */}
      <CTAFooter />
    </PublicLayout>
  );
}