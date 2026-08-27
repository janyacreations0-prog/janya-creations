'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  User, Mail, Phone, Package, Heart, LogOut, Edit2, Check, X,
  ShoppingBag, ChevronRight, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-rose-100 text-rose-700',
};

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(name: string | undefined, email: string | undefined): string {
  if (name) {
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return (email || 'U').slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOrders = useCallback(
    async (userId: string) => {
      // Real orders only, from Supabase (RLS scopes to the authenticated user).
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, payment_status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) {
        console.error('Error loading orders:', error.message);
        setOrders([]);
        return;
      }
      setOrders((data as Order[]) || []);
    },
    [supabase]
  );

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      setName(session.user.user_metadata?.full_name || '');
      setPhone(session.user.user_metadata?.phone || '');
      await loadOrders(session.user.id);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          phone: phone,
        },
      });

      if (error) throw error;

      setSuccess('✅ Profile updated successfully!');
      setIsEditing(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setOrders([]);
      setIsEditing(false);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItemCls =
    'flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-600 transition">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">My Account</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden lg:sticky lg:top-24">
              <div className="p-6 bg-gradient-to-br from-rose-50 to-amber-50 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center text-lg font-bold shadow-sm shrink-0">
                    {initials(user.user_metadata?.full_name, user.email)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {user.user_metadata?.full_name || 'User'}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <nav className="p-3 space-y-1">
                <Link href="/profile" className={`${navItemCls} bg-rose-50 text-rose-700`}>
                  <User className="w-4 h-4" /> My Profile
                </Link>
                <Link href="/orders" className={`${navItemCls} text-gray-600 hover:bg-gray-50`}>
                  <Package className="w-4 h-4" /> My Orders
                  {orders.length > 0 && (
                    <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {orders.length}
                    </span>
                  )}
                </Link>
                <Link href="/wishlist" className={`${navItemCls} text-gray-600 hover:bg-gray-50`}>
                  <Heart className="w-4 h-4" /> Wishlist
                </Link>
                <button onClick={handleLogout} className={`${navItemCls} text-red-600 hover:bg-red-50`}>
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{user.user_metadata?.phone || '—'}</p>
                    <p className="text-xs text-gray-500">Phone</p>
                  </div>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500">Email</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-gray-900">Personal Information</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 transition"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setName(user.user_metadata?.full_name || '');
                      setPhone(user.user_metadata?.phone || '');
                    }}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">{success}</div>
              )}

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-rose-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-rose-700 transition disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {loading ? 'Saving...' : (<><Check className="w-4 h-4" /> Save Changes</>)}
                  </button>
                </form>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium text-gray-900 truncate">{user.user_metadata?.full_name || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-900 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900 truncate">{user.user_metadata?.phone || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                    <ShoppingBag className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Total Orders</p>
                      <p className="font-medium text-gray-900">{orders.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-gray-900">Recent Orders</h3>
                {orders.length > 0 && (
                  <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 transition">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-medium text-gray-900">No orders yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Explore our collection and place your first order.
                  </p>
                  <Link
                    href="/shop"
                    className="inline-block mt-5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-semibold text-sm text-gray-900 hover:text-rose-600 transition"
                        >
                          {order.order_number}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`inline-flex w-fit px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel(order.status)}
                      </span>
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto">
                        <p className="font-bold text-gray-900">₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 transition"
                        >
                          View Details <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
