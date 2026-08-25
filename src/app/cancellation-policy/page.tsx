import Link from 'next/link';
import { FileText, Home, Mail, Phone } from 'lucide-react';
import { BUSINESS, SITE_UPDATED } from '@/lib/contact';

export default function CancellationPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 mb-6 transition">
          <Home className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Cancellation Policy</h1>
            <p className="text-gray-500 text-sm mt-2">Last updated: {SITE_UPDATED}</p>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. How to Request a Cancellation</h2>
              <p>
                To request a cancellation, please contact our support team as soon as possible:
              </p>
              <div className="mt-3 bg-gray-50 rounded-lg p-4 space-y-1">
                <p>Email: <a href={`mailto:${BUSINESS.email}`} className="text-rose-600 hover:underline">{BUSINESS.email}</a></p>
                <p>Phone: <strong>{BUSINESS.phone}</strong></p>
                <p className="text-sm text-gray-500">Please include your order number so we can process your request quickly.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Cancellation Before Shipment</h2>
              <p>
                If your order has not yet been shipped or processed, we will do our best to cancel
                it. Once the cancellation is confirmed, any payment made will be refunded to the
                original payment method as per our refund process.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Cancellation After Shipment</h2>
              <p>
                If your order has already been shipped, cancellation may not be possible. In that
                case, you may request a return in accordance with our Return &amp; Refund Policy once
                the order is delivered.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Refund After Cancellation</h2>
              <p>
                When a cancellation is approved, the refund is processed manually to the original
                payment method used for the order. If you paid through PhonePe, the refund will be
                initiated through the same method.
              </p>
            </section>

            <section className="bg-rose-50 p-6 rounded-lg border border-rose-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-rose-600" /> Need Help?
              </h3>
              <p className="text-sm">
                Contact us at{' '}
                <a href={`mailto:${BUSINESS.email}`} className="text-rose-600 hover:underline">
                  {BUSINESS.email}
                </a>{' '}
                or call <strong>{BUSINESS.phone}</strong>.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/shipping-policy" className="text-gray-500 hover:text-rose-600">Shipping Policy</Link>
            <span className="text-gray-300">|</span>
            <Link href="/refund-policy" className="text-gray-500 hover:text-rose-600">Returns &amp; Refunds</Link>
            <span className="text-gray-300">|</span>
            <Link href="/payment-information" className="text-gray-500 hover:text-rose-600">Payment Information</Link>
            <span className="text-gray-300">|</span>
            <Link href="/contact" className="text-gray-500 hover:text-rose-600">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}