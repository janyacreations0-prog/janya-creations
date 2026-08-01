import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Brand */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Janya Creations</h3>
            <p className="text-sm text-gray-400">
              Premium handcrafted jewellery and fashion accessories for the modern woman.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/shop" className="hover:text-white transition">All Products</Link></li>
              <li><Link href="/shop?category=jewellery" className="hover:text-white transition">Jewellery</Link></li>
              <li><Link href="/shop?category=clothing" className="hover:text-white transition">Clothing</Link></li>
              <li><Link href="/shop?category=accessories" className="hover:text-white transition">Accessories</Link></li>
              <li><Link href="/shop?filter=new-arrivals" className="hover:text-white transition">New Arrivals</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition">Refund & Return Policy</Link></li>
              <li><Link href="/shipping-policy" className="hover:text-white transition">Shipping Policy</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Get in Touch</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-rose-400 mt-0.5" />
                <span>support@janyacreations.com</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-rose-400 mt-0.5" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-rose-400 mt-0.5" />
                <span>Jaipur, Rajasthan, India</span>
              </li>
            </ul>

            {/* Trust Badge */}
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
          <p>© {new Date().getFullYear()} Janya Creations. All rights reserved.</p>
          <p className="mt-1">Made with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
}