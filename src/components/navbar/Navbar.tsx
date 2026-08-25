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
import { createClient } from '@/lib/supabase/client';
import { ChevronDown } from 'lucide-react';
import type { CategoryWithChildren } from '@/types';

interface NavbarProps {
  categories: CategoryWithChildren[];
}

export default function Navbar({ categories }: NavbarProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  useEffect(() => {
    const supabase = createClient();

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkIfAdmin(session, supabase);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkIfAdmin(session, supabase);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIfAdmin = async (session: any, supabase: any) => {
    if (!session?.user) {
      setIsAdmin(false);
      return;
    }

    try {
      // Role comes from the secure profiles table (RLS-protected), never from
      // hardcoded email strings.
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error || !data) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(data.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
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
          <nav className="hidden lg:flex items-center lg:ml-4 xl:ml-6 lg:space-x-4 xl:space-x-6">
            {categories.map((cat) => (
              <div key={cat.id} className="relative group">
                <Link
                  href={`/category/${cat.slug}`}
                  className="flex items-center gap-1 text-xs xl:text-sm font-medium uppercase tracking-wide text-gray-700 hover:text-rose-600 transition-colors duration-200 whitespace-nowrap"
                >
                  {cat.name}
                  {cat.children && cat.children.length > 0 && (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </Link>
                {cat.children && cat.children.length > 0 && (
                  <div className="absolute left-0 top-full pt-2 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 z-50">
                    <div className="bg-white border border-gray-100 rounded-lg shadow-lg py-2 min-w-[220px]">
                      {cat.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/category/${cat.slug}/${child.slug}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/shop?filter=new-arrivals"
              className="text-xs xl:text-sm font-medium uppercase tracking-wide text-rose-600 hover:text-rose-700 transition-colors duration-200 whitespace-nowrap"
            >
              New Arrivals
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-[180px] xl:max-w-xs mx-3 xl:mx-6">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search jewellery, sarees, bags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
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
            <div key={cat.id} className="py-1">
              <Link
                href={`/category/${cat.slug}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-gray-800 hover:text-rose-600"
              >
                {cat.name}
              </Link>
              {cat.children && cat.children.length > 0 && (
                <div className="pl-4 space-y-1 border-l-2 border-gray-100 ml-2">
                  {cat.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/category/${cat.slug}/${child.slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-1.5 text-sm text-gray-600 hover:text-rose-600"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link
            href="/shop?filter=new-arrivals"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-rose-600 hover:text-rose-700"
          >
            New Arrivals
          </Link>
          
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