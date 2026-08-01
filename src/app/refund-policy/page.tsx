import Link from 'next/link';
import { ArrowLeft, Home, RefreshCw, Clock, Shield } from 'lucide-react';

export default function RefundPolicy() {
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
              <RefreshCw className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Refund & Return Policy</h1>
            <p className="text-gray-500 text-sm mt-2">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Returns</h2>
              <p className="mb-3">
                At <strong className="text-rose-600">Janya Creations</strong>, we want you to love your purchase. If you're not completely satisfied, you may return eligible items within <strong>7 days</strong> of delivery.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Items must be <strong>unused, unworn, and in original packaging</strong></li>
                <li>All tags and labels must be attached</li>
                <li>Items must be returned in the same condition as received</li>
                <li>Customized or personalized items are <strong>not eligible</strong> for return</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Return Process</h2>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Contact us at <strong className="text-rose-600">support@janyacreations.com</strong> with your order number</li>
                <li>We'll provide you with return instructions and address</li>
                <li>Pack the item securely in its original packaging</li>
                <li>Ship the item back to us (shipping costs are your responsibility)</li>
                <li>We'll process your return within <strong>5-7 business days</strong> of receiving the item</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Refunds</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Refunds will be processed to your original payment method</li>
                <li>You'll receive a confirmation email once your refund is processed</li>
                <li>Refunds typically take <strong>5-10 business days</strong> to reflect in your account</li>
                <li>Shipping charges are <strong>non-refundable</strong></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Exceptions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Earrings, nose pins, and other pierced jewellery are <strong>non-returnable</strong> for hygiene reasons</li>
                <li>Sale items are <strong>final sale</strong> and cannot be returned</li>
                <li>Damaged or defective items will be handled on a case-by-case basis</li>
              </ul>
            </section>

            <section className="bg-rose-50 p-6 rounded-lg border border-rose-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-rose-600" /> Need Help?
              </h3>
              <p className="text-sm">
                For any return-related questions, contact us at{' '}
                <a href="mailto:support@janyacreations.com" className="text-rose-600 hover:underline">
                  support@janyacreations.com
                </a>{' '}
                or call us at <strong>+91 98765 43210</strong>.
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