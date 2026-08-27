import Link from 'next/link';
import { RefreshCw, Home, Mail, Phone } from 'lucide-react';
import { BUSINESS, SITE_UPDATED } from '@/lib/contact';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Refund Policy',
  description: 'Returns and refund policy for Janya Creations — how to request a return, refund timelines and eligibility.',
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 mb-6 transition">
          <Home className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Return &amp; Refund Policy</h1>
            <p className="text-gray-500 text-sm mt-2">Last updated: {SITE_UPDATED}</p>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Eligible Returns</h2>
              <p>
                We want you to be happy with your purchase. Eligible items may be returned within a
                reasonable window from the date of delivery, subject to the conditions below:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>The item is <strong>unused, unworn</strong> and in its <strong>original packaging</strong>.</li>
                <li>All tags and labels are still attached.</li>
                <li>The item is in the same condition as it was received.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Non-Returnable Items</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Earrings, nose pins and other pierced jewellery (for hygiene reasons).</li>
                <li>Items marked as final sale or clearance.</li>
                <li>Items returned without original packaging, tags, or in used/unworn-out condition.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. How to Request a Return</h2>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Contact us at <a href={`mailto:${BUSINESS.email}`} className="text-rose-600 hover:underline">{BUSINESS.email}</a> or call <strong>{BUSINESS.phone}</strong> with your order number and reason for return.</li>
                <li>We will share return instructions after your request is reviewed.</li>
                <li>Pack the item securely in its original packaging and send it back as instructed.</li>
              </ol>
              <p className="mt-3">
                Returns are reviewed and processed manually by our support team. Shipping costs for
                returning an item are the customer&apos;s responsibility unless the return is due to a
                defective, damaged or incorrect item received from us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Defective, Damaged or Incorrect Items</h2>
              <p>
                If you receive a defective, damaged or incorrect item, please contact us within 48
                hours of delivery with your order number and photos of the item and packaging. We will
                review the request and arrange a replacement, repair or refund as appropriate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Inspection and Approval</h2>
              <p>
                All returned items are inspected before approval. If an item does not meet the
                conditions above, the return may be rejected and the item may be returned to you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Refunds</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Once a return is approved, the refund is processed to the <strong>original payment method</strong> used for the order.</li>
                <li>Refunds are processed manually by our team and typically take a few business days to reflect in your account once initiated.</li>
                <li>If your order was paid through PhonePe, the refund is initiated through the same payment method.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Situations Where a Return/Refund May Be Rejected</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>The item is used, worn, washed or damaged by the customer.</li>
                <li>The return request is made after the applicable window or without original packaging/tags.</li>
                <li>The item belongs to a non-returnable category.</li>
                <li>The order number or purchase cannot be verified.</li>
              </ul>
            </section>

            <section className="bg-rose-50 p-6 rounded-lg border border-rose-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-rose-600" /> Need Help?
              </h3>
              <p className="text-sm">
                For any return or refund questions, contact us at{' '}
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
            <Link href="/cancellation-policy" className="text-gray-500 hover:text-rose-600">Cancellation Policy</Link>
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
