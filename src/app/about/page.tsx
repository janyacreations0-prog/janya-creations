import Link from 'next/link';
import { Sparkles, Home, ShoppingBag, Users } from 'lucide-react';
import { BUSINESS } from '@/lib/contact';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 mb-6 transition">
          <Home className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">About {BUSINESS.name}</h1>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Who We Are</h2>
              <p>
                {BUSINESS.name} is an online store offering a thoughtfully selected range of
                artificial jewellery, women&apos;s clothing, accessories and toys. We focus on
                bringing together products that suit everyday wear as well as festive and special
                occasions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">What We Offer</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <ShoppingBag className="w-6 h-6 text-rose-600 mb-2" />
                  <h3 className="font-semibold text-gray-800">Curated Collections</h3>
                  <p className="text-sm mt-1">
                    Jewellery, clothing, accessories and toys organised into easy-to-browse
                    categories so you can find what you&apos;re looking for quickly.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <Users className="w-6 h-6 text-rose-600 mb-2" />
                  <h3 className="font-semibold text-gray-800">Customer Care</h3>
                  <p className="text-sm mt-1">
                    A friendly support team that is happy to help with orders, returns and any
                    questions you have.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Our Commitment</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>A clear, secure checkout experience.</li>
                <li>Honest product information and transparent policies.</li>
                <li>Responsive support for order-related questions.</li>
                <li>Free shipping on all orders placed through our website.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact Us</h2>
              <p>
                We&apos;d love to hear from you. Reach us at{' '}
                <a href={`mailto:${BUSINESS.email}`} className="text-rose-600 hover:underline">
                  {BUSINESS.email}
                </a>{' '}
                or call <strong>{BUSINESS.phone}</strong>.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t text-center">
            <Link
              href="/shop"
              className="inline-block bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Browse Our Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
