'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/charities', label: 'Charities' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/bunnings', label: 'Bunnings' },
  { href: '/admin/suppliers', label: 'Suppliers' },
  { href: '/admin/supplier-status', label: 'Supplier status' },
];

export function AdminNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div data-admin-nav className="hidden h-full w-56 flex-col border-r border-grey bg-navy text-white md:flex">
      <div className="px-4 py-5 font-display text-lg font-semibold">Vision Velocity</div>
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'block rounded-card px-3 py-2 text-sm transition-colors',
                active ? 'bg-accent text-white' : 'text-white/80 hover:bg-navy-700 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4 text-sm">
        {user && <p className="mb-2 truncate text-white/70">{user.email}</p>}
        <button onClick={() => logout()} className="text-white/80 underline-offset-2 hover:text-white hover:underline">
          Log out
        </button>
      </div>
    </div>
  );
}
