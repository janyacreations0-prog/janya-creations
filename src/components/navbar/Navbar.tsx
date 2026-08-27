'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Search, ShoppingBag, Heart, Menu, X, User, 
  LogOut, Shield, UserCircle, Package, Phone, ChevronDown
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { createClient } from '@/lib/supabase/client';
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
  const [userName, setUserName] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close the profile dropdown on outside click or Escape.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const checkIfAdmin = async (session: any, supabase: any) => {
    if (!session?.user) {
      setIsAdmin(false);
      setUserName('');
      return;
    }

    try {
      // Role comes from the secure profiles table (RLS-protected), never from
      // hardcoded email strings.
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error || !data) {
        setIsAdmin(false);
        setUserName('');
        return;
      }

      setIsAdmin(data.role === 'admin');
      setUserName(data.full_name || '');
    } catch {
      setIsAdmin(false);
      setUserName('');
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
      setUserName('');
      setProfileOpen(false);
      setIsMobileMenuOpen(false);
      
      // Redirect to home and refresh
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const closeProfile = () => setProfileOpen(false);

  const profileLinkClass =
    'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors';
  const profileIconClass = 'w-4 h-4 text-gray-400 group-hover:text-rose-500';

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
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* User Section - Dynamic based on login state */}
            {session ? (
              <>
                {/* Profile dropdown (desktop) */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    className="hidden sm:flex flex-col items-center justify-center w-12 h-11 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label="Profile"
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                  >
                    <UserCircle className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-0.5">Profile</span>
                  </button>

                  {profileOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden"
                      role="menu"
                      aria-label="Account menu"
                    >
                      <div className="px-5 py-4 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900">
                          {userName ? `Welcome, ${userName}` : 'Welcome'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{session.user?.email}</p>
                      </div>
                      <div className="py-1.5">
                        <Link href="/profile" onClick={closeProfile} role="menuitem" className={`${profileLinkClass} group`}>
                          <UserCircle className={profileIconClass} /> My Profile
                        </Link>
                        <Link href="/orders" onClick={closeProfile} role="menuitem" className={`${profileLinkClass} group`}>
                          <Package className={profileIconClass} /> My Orders
                        </Link>
                        <Link href="/wishlist" onClick={closeProfile} role="menuitem" className={`${profileLinkClass} group`}>
                          <Heart className={profileIconClass} /> Wishlist
                        </Link>
                        {isAdmin && (
                          <Link href="/admin" onClick={closeProfile} role="menuitem" className={`${profileLinkClass} group text-rose-600 font-medium`}>
                            <Shield className={profileIconClass} /> Admin Portal
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-gray-100 py-1.5">
                        <button
                          onClick={() => { closeProfile(); handleLogout(); }}
                          role="menuitem"
                          className={`${profileLinkClass} group text-red-600 hover:bg-red-50 hover:text-red-700`}
                        >
                          <LogOut className={profileIconClass} /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Link - Only show if user is admin */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex flex-col items-center justify-center w-12 h-11 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label="Admin"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-0.5">Admin</span>
                  </Link>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex flex-col items-center justify-center w-12 h-11 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">Logout</span>
                </button>
              </>
            ) : (
              <>
                {/* Guest profile dropdown (desktop) */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    className="hidden sm:flex flex-col items-center justify-center w-12 h-11 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label="Account"
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-0.5">Login</span>
                  </button>

                  {profileOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden"
                      role="menu"
                      aria-label="Account menu"
                    >
                      <div className="px-5 py-4 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900">Welcome</p>
                        <p className="text-xs text-gray-500 mt-0.5">Access your account and manage orders</p>
                      </div>
                      <div className="p-3">
                        <Link
                          href="/login"
                          onClick={closeProfile}
                          role="menuitem"
                          className="block w-full text-center bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          LOGIN / SIGNUP
                        </Link>
                      </div>
                      <div className="py-1.5 border-t border-gray-100">
                        <Link href="/orders" onClick={closeProfile} role="menuitem" className={`${profileLinkClass} group`}>
                          <Package className={profileIconClass} /> Orders
                        </Link>
                        <Link href="/wishlist" onClick={closeProfile} role="menuitem" className={`${profileLinkClass} group`}>
                          <Heart className={profileIconClass} /> Wishlist
                        </Link>
                        <Link href="/contact" onClick={closeProfile} role="menuitem" className={`${profileLinkClass} group`}>
                          <Phone className={profileIconClass} /> Contact Us
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="flex flex-col items-center justify-center w-11 sm:w-12 h-11 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              aria-label="Wishlist"
            >
              <span className="relative">
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline text-[10px] font-medium mt-0.5">Wishlist</span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="flex flex-col items-center justify-center w-11 sm:w-12 h-11 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              aria-label="Bag"
            >
              <span className="relative">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline text-[10px] font-medium mt-0.5">Bag</span>
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