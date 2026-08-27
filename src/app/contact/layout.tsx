import { BUSINESS } from '@/lib/contact';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Contact ${BUSINESS.name} for order support and enquiries. Email ${BUSINESS.email} or call ${BUSINESS.phone}.`,
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
