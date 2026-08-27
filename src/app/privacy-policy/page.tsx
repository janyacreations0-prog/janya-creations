import Link from 'next/link';
import { Shield, Home } from 'lucide-react';
import { BUSINESS, SITE_UPDATED, businessAddress } from '@/lib/contact';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Janya Creations — how we collect, use and protect your personal information.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-rose-600" />
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        </div>

        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-rose-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Privacy Policy</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6">
          <div className="text-sm text-gray-500 border-b pb-4">
            <p>Last updated: {SITE_UPDATED}</p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed">
              {BUSINESS.name} collects the information needed to provide our services. This includes:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-600 space-y-1">
              <li><strong>Account Information:</strong> Your name, email address and phone number when you create an account or place an order.</li>
              <li><strong>Order Information:</strong> Products purchased, shipping address, order history and order status.</li>
              <li><strong>Payment Information:</strong> We do not store card or bank details. Payments are processed by our payment provider, PhonePe.</li>
              <li><strong>Technical Information:</strong> Basic browser and device information needed to operate the website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>To process, fulfil and deliver your orders.</li>
              <li>To manage your account and order history.</li>
              <li>To respond to your enquiries and provide customer support.</li>
              <li>To maintain the security and proper operation of our website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Sharing Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We share your information only where necessary to provide our services, such as with
              our payment provider (PhonePe) to process your payment, and with logistics partners
              where needed to deliver your order. We do not sell your personal information to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Information Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We take reasonable measures to protect your personal information. Payment transactions
              are handled entirely by PhonePe&apos;s secure, PCI-DSS compliant payment gateway, and we
              never have access to your full card or banking details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Your Rights</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>You may update your account information from your profile.</li>
              <li>You may request access to or correction of your personal information.</li>
              <li>You may request deletion of your account and personal data by contacting us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              We use cookies and local storage for basic website functionality such as keeping you
              signed in and remembering your cart. Please see our{' '}
              <Link href="/cookie-policy" className="text-rose-600 hover:underline">Cookie Policy</Link>{' '}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <div className="mt-2 text-gray-600">
              <p>Email: {BUSINESS.email}</p>
              <p>Phone: {BUSINESS.phone}</p>
              <p>Address: {businessAddress()}</p>
            </div>
          </section>

          <div className="pt-6 border-t">
            <Link href="/" className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium">
              <Home className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
