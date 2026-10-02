'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { AdminRole } from '@/lib/types';

interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, restricts access to admin users with one of these roles. */
  allowedRoles?: AdminRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = '/admin/login' }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }
    // Charity sign-ins have no admin role: send them to their own area.
    if (user && !user.role) {
      router.replace('/charity');
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, redirectTo, router]);

  if (isLoading || !isAuthenticated || (user && !user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-charcoal/70">
        <p>Checking your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
