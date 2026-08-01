import Link from 'next/link';
import { Shield, Home } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-rose-600" />
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-rose-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Privacy Policy</span>
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
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed">
              At Janya Creations, we collect information to provide better services to our customers. 
              This includes:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-600 space-y-1">
              <li><strong>Personal Information:</strong> Name, email address, phone number, shipping address</li>
              <li><strong>Order Information:</strong> Products purchased, order history, payment details</li>
              <li><strong>Device Information:</strong> IP address, browser type, device type</li>
              <li><strong>Usage Data:</strong> How you interact with our website</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-600 space-y-1">
              <li>Process and fulfill your orders</li>
              <li>Send order confirmations and updates</li>
              <li>Improve our products and services</li>
              <li>Personalize your shopping experience</li>
              <li>Send marketing communications (with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Information Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement appropriate security measures to protect your personal information. 
              All payment transactions are processed through secure payment gateways.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-600 space-y-1">
              <li>Access, update, or delete your personal information</li>
              <li>Opt-out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <div className="mt-2 text-gray-600">
              <p>Email: support@janyacreations.com</p>
              <p>Phone: +91 98765 43210</p>
              <p>Address: Jaipur, Rajasthan, India</p>
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