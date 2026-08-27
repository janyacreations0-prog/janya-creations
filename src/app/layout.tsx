import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import NavbarShell from '@/components/navbar/NavbarShell';
import Footer from '@/components/footer/Footer';
import CookieConsent from '@/components/CookieConsent';
import Chatbot from '@/components/chatbot/Chatbot';
import JsonLd from '@/components/seo/JsonLd';
import {
  SITE_NAME,
  SITE_URL,
  SITE_LOCALE,
  DEFAULT_TITLE,
  TITLE_TEMPLATE,
  DEFAULT_DESCRIPTION,
  openGraphDefaults,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: TITLE_TEMPLATE,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    ...openGraphDefaults,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {/* Site-wide structured data (Organization + WebSite) */}
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />

        <WishlistProvider>
          <CartProvider>
            <NavbarShell />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <CookieConsent />
            <Chatbot />
          </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}