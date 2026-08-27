import { NOINDEX_ROBOTS } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = { robots: NOINDEX_ROBOTS };

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
