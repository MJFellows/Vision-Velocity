import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata = {
  title: 'Signup successful - Vision Velocity',
  description: 'Thank you for signing up for Vision Velocity. Your application is being reviewed.',
};

export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ charityId?: string }>;
}) {
  await searchParams;

  return (
    <PublicLayout>
      <div className="bg-grey/20 px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8 text-center sm:p-12">
            <div className="mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <span className="text-4xl">✓</span>
              </div>
            </div>

            <h1 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">Thank you for signing up!</h1>
            <p className="mb-6 text-lg text-charcoal/70">We&apos;ve received your application and are reviewing it now.</p>

            <div className="mb-8 rounded-card bg-grey/20 p-6 text-left">
              <h2 className="mb-4 text-lg font-semibold text-navy">What happens next</h2>
              <ol className="space-y-3 text-sm text-charcoal/70">
                <li className="flex"><span className="mr-3 font-bold text-accent">1.</span><span>Our team reviews your application (typically within 24 hours)</span></li>
                <li className="flex"><span className="mr-3 font-bold text-accent">2.</span><span>We&apos;ll email you when you are approved, with a link to set up your sign-in</span></li>
                <li className="flex"><span className="mr-3 font-bold text-accent">3.</span><span>Sign in and request your first event — choose your preferred date and Bunnings store</span></li>
                <li className="flex"><span className="mr-3 font-bold text-accent">4.</span><span>We&apos;ll handle setup and delivery — you focus on fundraising</span></li>
              </ol>
            </div>

            <p className="mb-8 text-sm text-charcoal/60">
              Any questions? Email us at{' '}
              <a href="mailto:support@visionvelocity.com.au" className="text-accent underline">support@visionvelocity.com.au</a>
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">Back to home</Button>
              </Link>
              <Link href="/public/landing">
                <Button className="w-full sm:w-auto">Learn more about Vision Velocity</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
