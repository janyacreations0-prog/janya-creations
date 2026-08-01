'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Allow these pages without auth check
  const isPublicPage = pathname === '/admin/login' || pathname === '/admin/forgot-password';

  useEffect(() => {
    // If it's a public page (login or forgot-password), skip auth check
    if (isPublicPage) {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, isPublicPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}