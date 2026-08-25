import Link from 'next/link';
import { Truck, Home, Mail, Phone } from 'lucide-react';
import { BUSINESS, SITE_UPDATED } from '@/lib/contact';

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 mb-6 transition">
          <Home className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Shipping Policy</h1>
            <p className="text-gray-500 text-sm mt-2">Last updated: {SITE_UPDATED}</p>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Shipping Destinations</h2>
              <p>
                Janya Creations ships within India. We currently do not offer international shipping.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Order Processing</h2>
              <p>
                Orders are reviewed and packed after payment is confirmed. Processing generally takes
                a few business days from the date of confirmation. You will receive an order
                confirmation after your order is placed.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Shipping Charges</h2>
              <p>
                Shipping is free on all orders placed through our website. There is no additional
                shipping fee charged at checkout.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Delivery Time</h2>
              <p>
                Estimated delivery timelines may vary by destination and logistics conditions. While
                most orders are delivered within a few business days, some locations may take longer.
                We recommend allowing additional time during festivals and peak seasons.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Delivery Address Responsibility</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Please ensure your delivery address, including the PIN code, is accurate and complete.</li>
                <li>We are not responsible for delays or failed delivery caused by an incorrect or incomplete address provided by the customer.</li>
                <li>If a delivery is returned to us because of an incorrect address or non-availability, we will contact you to arrange re-delivery or a refund as applicable.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Damaged Packages</h2>
              <p>
                If your package arrives visibly damaged, please contact us within 48 hours of receipt
                with your order number and photos of the package and item. We will assist you in
                accordance with our Return &amp; Refund Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Checking Your Order Status</h2>
              <p>
                After placing an order, you can check its status by signing in to your account and
                visiting the{' '}
                <Link href="/orders" className="text-rose-600 hover:underline">My Orders</Link>{' '}
                page. If you have questions about a specific order, contact our support team.
              </p>
            </section>

            <section className="bg-rose-50 p-6 rounded-lg border border-rose-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-rose-600" /> Questions About Shipping?
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
            <Link href="/refund-policy" className="text-gray-500 hover:text-rose-600">Returns &amp; Refunds</Link>
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
