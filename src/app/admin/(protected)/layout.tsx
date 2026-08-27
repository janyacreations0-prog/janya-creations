import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { getAuthUser, isAdminUser } from '@/lib/admin';
import { NOINDEX_ROBOTS } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  robots: NOINDEX_ROBOTS,
};

/**
 * Server-side admin guard for all /admin pages (route group "(protected)").
 * Requirement: authenticated user AND profiles.role = 'admin'.
 *
 * - Not logged in            -> redirect to /admin/login
 * - Logged in but not admin  -> render a terminal "forbidden" screen
 *                               (no redirect: prevents a redirect loop with the
 *                               /admin/login layout for authenticated customers)
 */
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect('/admin/login');
  }

  const isAdmin = await isAdminUser(user);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-500 mt-2">
            The admin area is restricted to authorised administrators.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="inline-block bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
            >
              Back to Home
            </Link>
            <Link
              href="/profile"
              className="inline-block border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-6 py-2.5 rounded-lg transition"
            >
              My Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
