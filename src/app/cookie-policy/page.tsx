import Link from 'next/link';
import { Cookie, Home, Mail } from 'lucide-react';
import { BUSINESS, SITE_UPDATED } from '@/lib/contact';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Janya Creations uses cookies on our website and how you can control them.',
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 mb-6 transition">
          <Home className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cookie className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Cookie Policy</h1>
            <p className="text-gray-500 text-sm mt-2">Last updated: {SITE_UPDATED}</p>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. What We Use</h2>
              <p>
                The Janya Creations website uses browser cookies and local storage only for the
                functionality described below. We do not use advertising cookies, analytics trackers,
                or third-party marketing pixels.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Cookies and Local Storage We Use</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Authentication session cookie</strong> — keeps you signed in to your account.
                </li>
                <li>
                  <strong>Cart and wishlist storage</strong> — remembers the items in your shopping
                  cart and wishlist while you browse, including for guests.
                </li>
                <li>
                  <strong>Cookie preference storage</strong> — remembers your choice to accept or
                  decline cookies so we don&apos;t ask every time.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. What We Do NOT Use</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Advertising or remarketing cookies.</li>
                <li>Third-party analytics trackers (we do not use Google Analytics or similar).</li>
                <li>Social media tracking pixels.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Managing Cookies</h2>
              <p>
                You can accept or decline cookies using the cookie banner shown when you first visit
                the site. You can also clear cookies and site data through your browser settings at
                any time. Please note that some features, such as keeping items in your cart or
                staying signed in, may not work if you block all site data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Questions</h2>
              <p>
                If you have any questions about our use of cookies, contact us at{' '}
                <a href={`mailto:${BUSINESS.email}`} className="text-rose-600 hover:underline">
                  {BUSINESS.email}
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/privacy-policy" className="text-gray-500 hover:text-rose-600">Privacy Policy</Link>
            <span className="text-gray-300">|</span>
            <Link href="/terms" className="text-gray-500 hover:text-rose-600">Terms &amp; Conditions</Link>
            <span className="text-gray-300">|</span>
            <Link href="/contact" className="text-gray-500 hover:text-rose-600">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
