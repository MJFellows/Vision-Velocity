import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-grey bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/public/landing" className="font-display text-lg font-semibold text-navy">
          Vision Velocity
        </Link>
        <nav className="flex items-center gap-6 text-sm text-charcoal">
          <Link href="/public/landing" className="hover:text-accent">
            Home
          </Link>
          <Link href="/public/about" className="hover:text-accent">
            About
          </Link>
          <Link href="/charity/signup" className="hover:text-accent">
            Charity sign-up
          </Link>
        </nav>
      </div>
    </header>
  );
}
