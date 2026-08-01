'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Mail, Phone, Package, Heart, LogOut, Edit2, Check, X, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      setName(session.user.user_metadata?.full_name || '');
      setPhone(session.user.user_metadata?.phone || '');

      // Fetch orders from localStorage
      const storedOrders = localStorage.getItem('userOrders');
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      } else {
        // Sample orders for demo
        const sampleOrders: Order[] = [
          {
            id: 'JANYA-1001',
            total: 2499,
            status: 'delivered',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'JANYA-1002',
            total: 3999,
            status: 'shipped',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'JANYA-1003',
            total: 1199,
            status: 'pending',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];
        setOrders(sampleOrders);
        localStorage.setItem('userOrders', JSON.stringify(sampleOrders));
      }

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
        }
      });

      if (error) throw error;

      setSuccess('✅ Profile updated successfully!');
      setIsEditing(false);
      
      // Refresh user data
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all user state
      setUser(null);
      setName('');
      setPhone('');
      setOrders([]);
      setIsEditing(false);
      setError('');
      setSuccess('');
      
      // Redirect to home page
      router.push('/');
      router.refresh(); // Force refresh to clear cache
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-500 hover:text-rose-600 transition">
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-serif font-bold text-gray-900">My Profile</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-24">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-rose-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{user.user_metadata?.full_name || 'User'}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>

              <div className="mt-6 pt-6 border-t space-y-2">
                <Link 
                  href="/profile" 
                  className="flex items-center gap-3 px-4 py-2.5 bg-rose-50 text-rose-700 rounded-lg transition"
                >
                  <User className="w-4 h-4" /> My Profile
                </Link>
                <Link 
                  href="/profile/orders" 
                  className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                >
                  <Package className="w-4 h-4" /> My Orders
                </Link>
                <Link 
                  href="/wishlist" 
                  className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                >
                  <Heart className="w-4 h-4" /> Wishlist
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="md:col-span-2">
            {/* Profile Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Personal Information</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 transition"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setName(user.user_metadata?.full_name || '');
                      setPhone(user.user_metadata?.phone || '');
                    }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
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
                    className="bg-rose-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? 'Saving...' : <><Check className="w-4 h-4" /> Save Changes</>}
                  </button>
                </form>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-900">{user.user_metadata?.full_name || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium text-gray-900">{user.user_metadata?.phone || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                    <ShoppingBag className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Total Orders:</span>
                    <span className="font-medium text-gray-900">{orders.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Recent Orders</h3>
                {orders.length > 0 && (
                  <Link href="/profile/orders" className="text-sm text-rose-600 hover:text-rose-700 transition">
                    View All →
                  </Link>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No orders yet</p>
                  <Link href="/shop" className="text-sm text-rose-600 hover:text-rose-700 mt-2 inline-block transition">
                    Start Shopping →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">#{order.id}</p>
                        <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-rose-600">₹{order.total.toLocaleString()}</p>
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