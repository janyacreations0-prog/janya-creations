'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X, Check } from 'lucide-react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user already accepted cookies
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cookie className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700">
                We use cookies and local storage to keep you signed in, remember your cart and wishlist, and save your preferences.
                By clicking <strong>"Accept All"</strong>, you consent to our use of cookies.
              </p>
              <div className="flex flex-wrap gap-3 mt-1">
                <Link href="/privacy-policy" className="text-xs text-amber-600 hover:underline">
                  Learn More
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/cookie-policy" className="text-xs text-amber-600 hover:underline">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={declineCookies}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition whitespace-nowrap"
            >
              Decline
            </button>
            <button
              onClick={acceptCookies}
              className="px-6 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition flex items-center gap-2 whitespace-nowrap"
            >
              <Check className="w-4 h-4" /> Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}