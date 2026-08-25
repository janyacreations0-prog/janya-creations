'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Package, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

interface Order {
  id: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  items?: any[];
  shipping_address?: string;
}

export default function MyOrders() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    checkAuth();
    loadOrders();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      // For now, load from localStorage
      // In production, fetch from Supabase orders table
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
            items: [{ name: 'Handwoven Silk Saree', quantity: 1, price: 2499 }],
            shipping_address: 'Jaipur, Rajasthan'
          },
          {
            id: 'JANYA-1002',
            total: 3999,
            status: 'shipped',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            items: [{ name: 'Premium Cotton Kurta Set', quantity: 1, price: 3999 }],
            shipping_address: 'Jaipur, Rajasthan'
          },
          {
            id: 'JANYA-1003',
            total: 1199,
            status: 'pending',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            items: [{ name: 'Eco Bamboo Basket', quantity: 1, price: 1199 }],
            shipping_address: 'Jaipur, Rajasthan'
          }
        ];
        setOrders(sampleOrders);
        localStorage.setItem('userOrders', JSON.stringify(sampleOrders));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'delivered': return '✅';
      case 'shipped': return '📦';
      case 'pending': return '⏳';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile" className="text-gray-500 hover:text-rose-600 transition">
            ← Back to Profile
          </Link>
          <h1 className="text-2xl font-serif font-bold text-gray-900">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">No orders yet</h3>
            <p className="text-gray-500 mt-2">Start shopping to see your orders here!</p>
            <Link 
              href="/shop" 
              className="inline-block mt-4 bg-rose-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-rose-700 transition"
            >
              Start Shopping →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-gray-900">#{order.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)} {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {order.items.map(item => item.name).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Order Total & Action */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-xl font-bold text-rose-600">₹{order.total.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="text-rose-600 hover:text-rose-700 text-sm font-medium flex items-center gap-1 transition"
                    >
                      {selectedOrder?.id === order.id ? 'Hide Details' : 'View Details'}
                      <ChevronRight className={`w-4 h-4 transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Order Details (Expandable) */}
                {selectedOrder?.id === order.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 font-medium">Shipping Address</p>
                        <p className="text-gray-700">{order.shipping_address || 'Jaipur, Rajasthan'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Items</p>
                        {order.items?.map((item, index) => (
                          <p key={index} className="text-gray-700">
                            {item.name} × {item.quantity} - ₹{item.price * item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 flex gap-3">
                      <Link
                        href="/orders"
                        className="text-sm text-rose-600 hover:text-rose-700 font-medium transition"
                      >
                        My Orders →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}