import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-grey bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-charcoal/70">
        <p>&copy; {new Date().getFullYear()} Vision Velocity. Helping charities run fundraising catering events.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <Link href="/public/faq" className="underline-offset-2 hover:underline">
            FAQ
          </Link>
          <Link href="/charity/login" className="underline-offset-2 hover:underline">
            Charity sign-in
          </Link>
          <Link href="/bunnings/activities-officer/sign-in" className="underline-offset-2 hover:underline">
            Bunnings Activities Officers
          </Link>
        </nav>
      </div>
    </footer>
  );
}
