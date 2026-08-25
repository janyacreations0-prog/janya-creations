import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { getCategoryTree } from '@/lib/categories';
import { BUSINESS, businessAddress } from '@/lib/contact';

export default async function Footer() {
  const categories = await getCategoryTree();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Column 1: Brand */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">{BUSINESS.name}</h3>
            <p className="text-sm text-gray-400">
              Premium artificial jewellery, women&apos;s clothing, accessories and toys for the modern shopper.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <a href={`mailto:${BUSINESS.email}`} className="hover:text-white transition">
                  {BUSINESS.email}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span>{BUSINESS.phone}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span>{businessAddress()}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/shop" className="hover:text-white transition">All Products</Link></li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`} className="hover:text-white transition">
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li><Link href="/shop?filter=new-arrivals" className="hover:text-white transition">New Arrivals</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/shipping-policy" className="hover:text-white transition">Shipping Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition">Returns &amp; Refunds</Link></li>
              <li><Link href="/cancellation-policy" className="hover:text-white transition">Cancellation Policy</Link></li>
              <li><Link href="/orders" className="hover:text-white transition">Order Status / Order Help</Link></li>
            </ul>
          </div>

          {/* Column 4: Information */}
          <div>
            <h4 className="text-white font-semibold mb-4">Information</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="/payment-information" className="hover:text-white transition">Payment Information</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms &amp; Conditions</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-white transition">Cookie Policy</Link></li>
            </ul>

            {/* Trust Badges */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span>100% Safe &amp; Secure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</p>
          <p className="mt-1">Made with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
}
