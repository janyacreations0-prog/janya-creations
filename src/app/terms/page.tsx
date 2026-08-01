import Link from 'next/link';
import { FileText, Home } from 'lucide-react';

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-rose-600" />
          <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-rose-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Terms & Conditions</span>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6">
          <div className="text-sm text-gray-500 border-b pb-4">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Welcome to Janya Creations. By using our website and services, you agree to 
              comply with and be bound by the following terms and conditions. Please read 
              them carefully before placing any order.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Products and Pricing</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>All products are handmade and may have slight variations in color, size, and design</li>
              <li>Prices are subject to change without prior notice</li>
              <li>All prices are in Indian Rupees (₹) and inclusive of GST</li>
              <li>Product images are for illustrative purposes only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Orders and Payments</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Orders are processed after payment confirmation</li>
              <li>We accept payments through Cash on Delivery, UPI, and QR Code</li>
              <li>Order confirmation will be sent via email</li>
              <li>We reserve the right to cancel orders due to stock unavailability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Shipping and Delivery</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Orders are shipped within 2-3 business days</li>
              <li>Delivery time: 3-7 business days (varies by location)</li>
              <li>Free shipping on orders above ₹500</li>
              <li>Shipping charges: ₹50 for orders below ₹500</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Returns and Refunds</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Return request must be initiated within 7 days of delivery</li>
              <li>Products must be unused and in original packaging</li>
              <li>Customized products are not eligible for return</li>
              <li>Refund will be processed within 7-10 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Contact Information</h2>
            <div className="text-gray-600">
              <p>For any questions regarding these terms, please contact us:</p>
              <div className="mt-2">
                <p>Email: support@janyacreations.com</p>
                <p>Phone: +91 98765 43210</p>
              </div>
            </div>
          </section>

          {/* Back to Home */}
          <div className="pt-6 border-t">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium"
            >
              <Home className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}