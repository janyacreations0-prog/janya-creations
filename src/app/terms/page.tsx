import Link from 'next/link';
import { FileText, Home } from 'lucide-react';
import { BUSINESS, SITE_UPDATED } from '@/lib/contact';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions governing the use of the Janya Creations online store.',
};

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-rose-600" />
          <h1 className="text-3xl font-bold text-gray-900">Terms &amp; Conditions</h1>
        </div>

        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-rose-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Terms &amp; Conditions</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6">
          <div className="text-sm text-gray-500 border-b pb-4">
            <p>Last updated: {SITE_UPDATED}</p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Welcome to {BUSINESS.name}. By using our website and placing an order, you agree to be
              bound by these terms and conditions. Please read them carefully before placing an order.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Products and Pricing</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>All prices are listed in Indian Rupees (₹).</li>
              <li>Prices shown on the website are the prices you pay at checkout; shipping is free on all orders.</li>
              <li>We make every effort to display accurate product information, but minor variations in colour and finish may occur.</li>
              <li>Product images are for illustration and may differ slightly from the actual product.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Orders and Payments</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>An order is confirmed only after payment is successfully completed.</li>
              <li>Payments are processed securely through PhonePe Standard Checkout.</li>
              <li>We may cancel an order if the product is unavailable, in which case any payment made will be refunded to the original payment method.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Shipping and Delivery</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Orders are processed after payment confirmation.</li>
              <li>Shipping is free on all orders. Estimated delivery timelines may vary by destination and logistics conditions.</li>
              <li>Please provide an accurate delivery address. We are not responsible for delays caused by incorrect or incomplete addresses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Returns and Refunds</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Eligible items may be returned in accordance with our Return &amp; Refund Policy.</li>
              <li>Items must be unused, unworn and in their original packaging with tags attached.</li>
              <li>Refunds, where approved, are processed to the original payment method by our support team.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Cancellations</h2>
            <p className="text-gray-600 leading-relaxed">
              Orders may be cancelled by contacting support before they are shipped. See our{' '}
              <Link href="/cancellation-policy" className="text-rose-600 hover:underline">Cancellation Policy</Link>{' '}
              for details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              To the extent permitted by law, {BUSINESS.name} shall not be liable for any indirect or
              consequential loss arising from the use of this website or the purchase of products.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed">
              These terms are governed by the laws of India. Any disputes shall be subject to the
              jurisdiction of the courts in Uttar Pradesh, India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Contact Information</h2>
            <div className="text-gray-600">
              <p>For any questions regarding these terms, please contact us:</p>
              <div className="mt-2">
                <p>Email: {BUSINESS.email}</p>
                <p>Phone: {BUSINESS.phone}</p>
              </div>
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
