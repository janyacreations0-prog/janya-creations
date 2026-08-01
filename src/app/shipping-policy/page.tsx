import Link from 'next/link';
import { ArrowLeft, Home, Truck, Clock, Package, MapPin } from 'lucide-react';

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Shipping Policy</h1>
            <p className="text-gray-500 text-sm mt-2">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Shipping Zones</h2>
              <p>
                <strong className="text-rose-600">Janya Creations</strong> ships across India. We currently do not offer international shipping.
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-1">
                <li>All orders are shipped from our facility in <strong>Jaipur, Rajasthan</strong></li>
                <li>We deliver to all pin codes across India</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Processing Time</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Orders are processed within <strong>2-3 business days</strong></li>
                <li>You'll receive a confirmation email with tracking details once shipped</li>
                <li>Customized items may take <strong>5-7 business days</strong> for processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Delivery Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-800">Metro Cities</p>
                  <p className="text-sm text-gray-500">3-5 business days</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-800">Tier 2 Cities</p>
                  <p className="text-sm text-gray-500">5-7 business days</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <Clock className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-800">Remote Areas</p>
                  <p className="text-sm text-gray-500">7-10 business days</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Shipping Charges</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Free shipping</strong> on orders above <strong>₹500</strong></li>
                <li>Orders below ₹500: <strong>₹50</strong> flat shipping fee</li>
                <li>Cash on Delivery (COD) charges: <strong>₹50</strong> extra</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Tracking Your Order</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>A tracking link will be sent to your email and phone</li>
                <li>You can track your order through our <Link href="/track-order" className="text-rose-600 hover:underline">Track Order</Link> page</li>
                <li>Please allow 24 hours for tracking information to update</li>
              </ul>
            </section>

            <section className="bg-rose-50 p-6 rounded-lg border border-rose-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-rose-600" /> Questions About Shipping?
              </h3>
              <p className="text-sm">
                Contact us at{' '}
                <a href="mailto:support@janyacreations.com" className="text-rose-600 hover:underline">
                  support@janyacreations.com
                </a>{' '}
                or call <strong>+91 98765 43210</strong>.
              </p>
            </section>
          </div>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/privacy-policy" className="text-gray-500 hover:text-rose-600">Privacy Policy</Link>
            <span className="text-gray-300">|</span>
            <Link href="/terms" className="text-gray-500 hover:text-rose-600">Terms & Conditions</Link>
            <span className="text-gray-300">|</span>
            <Link href="/contact" className="text-gray-500 hover:text-rose-600">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}