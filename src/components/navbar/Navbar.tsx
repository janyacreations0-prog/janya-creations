'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Search, ShoppingBag, Heart, Menu, X, User, 
  LogOut, Shield, UserCircle 
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  const categories = [
    { name: 'Artificial Jewellery', href: '/shop?category=jewellery' },
    { name: "Women's Clothing", href: '/shop?category=clothing' },
    { name: 'Accessories', href: '/shop?category=accessories' },
    { name: 'New Arrivals', href: '/shop?filter=new-arrivals' },
  ];

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkIfAdmin(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkIfAdmin(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIfAdmin = async (session: any) => {
    if (session) {
      const userEmail = session.user?.email;
      setIsAdmin(userEmail === 'kumar.anjank@gmail.com' || userEmail === 'admin@janyacreations.com');
    } else {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all state
      setSession(null);
      setIsAdmin(false);
      setIsMobileMenuOpen(false);
      
      // Redirect to home and refresh
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-rose-600 focus:outline-none p-2"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.svg"
                alt="Janya Creations"
                width={160}
                height={45}
                priority
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Categories */}
          <nav className="hidden lg:flex items-center space-x-8">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="text-sm font-medium uppercase tracking-wide text-gray-700 hover:text-rose-600 transition-colors duration-200"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xs mx-6">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search jewellery, sarees, bags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center space-x-5">
            {/* User Section - Dynamic based on login state */}
            {session ? (
              <div className="flex items-center space-x-3">
                {/* Profile Link */}
                <Link
                  href="/profile"
                  className="hidden sm:flex flex-col items-center text-gray-600 hover:text-rose-600 text-xs"
                >
                  <UserCircle className="w-5 h-5" />
                  <span className="mt-1">Profile</span>
                </Link>

                {/* Admin Link - Only show if user is admin */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex flex-col items-center text-rose-600 hover:text-rose-700 text-xs"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="mt-1">Admin</span>
                  </Link>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex flex-col items-center text-gray-600 hover:text-rose-600 text-xs"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="mt-1">Logout</span>
                </button>
              </div>
            ) : (
              // Login Link - For guest users
              <Link
                href="/login"
                className="hidden sm:flex flex-col items-center text-gray-600 hover:text-rose-600 text-xs"
              >
                <User className="w-5 h-5" />
                <span className="mt-1">Login</span>
              </Link>
            )}

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="flex flex-col items-center text-gray-600 hover:text-rose-600 text-xs relative"
            >
              <div className="relative">
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline mt-1">Wishlist</span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="flex flex-col items-center text-gray-600 hover:text-rose-600 text-xs relative"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline mt-1">Bag</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search jewellery, dresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pt-2 pb-6 space-y-3">
          {/* Categories */}
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-gray-800 hover:text-rose-600"
            >
              {cat.name}
            </Link>
          ))}
          
          <div className="pt-2 border-t border-gray-100 space-y-2">
            {session ? (
              <>
                {/* Profile - Mobile */}
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-2 text-base font-medium text-gray-800 hover:text-rose-600"
                >
                  <UserCircle className="w-5 h-5" /> My Profile
                </Link>

                {/* Admin - Mobile (only if admin) */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-base font-medium text-rose-600 hover:text-rose-700"
                  >
                    <Shield className="w-5 h-5" /> Admin Dashboard
                  </Link>
                )}

                {/* Logout - Mobile */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 py-2 text-base font-medium text-red-600 hover:text-red-700 w-full"
                >
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 py-2 text-base font-medium text-gray-800 hover:text-rose-600"
              >
                <User className="w-5 h-5" /> Login / Sign Up
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}