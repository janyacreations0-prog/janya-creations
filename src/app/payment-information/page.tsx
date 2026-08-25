import Link from 'next/link';
import { CreditCard, Home, Mail, ShieldCheck } from 'lucide-react';
import { BUSINESS, SITE_UPDATED } from '@/lib/contact';

export default function PaymentInformation() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 mb-6 transition">
          <Home className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Payment Information</h1>
            <p className="text-gray-500 text-sm mt-2">Last updated: {SITE_UPDATED}</p>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. How We Accept Payments</h2>
              <p>
                Payments for orders placed on Janya Creations are processed securely through{' '}
                <strong>PhonePe Standard Checkout</strong>. When you place an order, you will be
                redirected to PhonePe&apos;s secure payment page to complete your payment.
              </p>
              <p className="mt-3">
                The payment options available to you on the PhonePe checkout page are the ones
                enabled by your PhonePe account and may include UPI, cards and net banking.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Order Amounts</h2>
              <p>
                The total amount charged is the total shown on the checkout page for your order.
                Shipping is free on all orders. The amount you pay is the final order total; no
                additional processing fees are charged by us at checkout.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Payment Security</h2>
              <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <p>
                  We do not store your card or banking details. Payments are handled entirely by
                  PhonePe&apos;s PCI-DSS compliant payment gateway, and your payment information is
                  never shared with us.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Payment Status</h2>
              <p>
                Your order is confirmed only after PhonePe confirms that the payment was successful.
                You can check the payment and order status by signing in and visiting your{' '}
                <Link href="/orders" className="text-rose-600 hover:underline">My Orders</Link>{' '}
                page.
              </p>
            </section>

            <section className="bg-rose-50 p-6 rounded-lg border border-rose-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-rose-600" /> Payment Questions?
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
            <Link href="/terms" className="text-gray-500 hover:text-rose-600">Terms &amp; Conditions</Link>
            <span className="text-gray-300">|</span>
            <Link href="/contact" className="text-gray-500 hover:text-rose-600">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}