'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { adminUpdateOrderStatus } from '@/lib/order-actions';
import { Search, ChevronDown, ChevronUp, Package, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const PAYMENT_OPTIONS = ['pending', 'paid', 'failed', 'refunded'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-700 bg-amber-50',
  confirmed: 'text-blue-700 bg-blue-50',
  processing: 'text-indigo-700 bg-indigo-50',
  shipped: 'text-purple-700 bg-purple-50',
  delivered: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-gray-500 bg-gray-100',
  refunded: 'text-rose-700 bg-rose-50',
};

export default function AdminOrdersPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, any[]>>({});
  const [emailEventsMap, setEmailEventsMap] = useState<Record<string, any[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (paymentFilter !== 'all') query = query.eq('payment_status', paymentFilter);

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, paymentFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = async (orderId: string) => {
    if (expanded === orderId) {
      setExpanded(null);
      return;
    }
    setExpanded(orderId);
    if (!itemsMap[orderId]) {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      setItemsMap((m) => ({ ...m, [orderId]: data || [] }));
    }
    if (!emailEventsMap[orderId]) {
      const { data } = await supabase
        .from('order_email_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      setEmailEventsMap((m) => ({ ...m, [orderId]: data || [] }));
    }
  };

  const changeStatus = async (orderId: string, newStatus: string) => {
    setError('');
    setSuccess('');
    const res = await adminUpdateOrderStatus(orderId, newStatus);
    if (res.success) {
      setSuccess('Order status updated');
      await load();
    } else {
      setError(res.error || 'Failed to update order status');
    }
  };

  const filtered = orders.filter((o) =>
    search
      ? String(o.order_number).toLowerCase().includes(search.toLowerCase()) ||
        String(o.customer_name || '').toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-rose-600" /> Order Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">View, filter and update customer orders</p>
          </div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-rose-600">
            ← Back to Dashboard
          </Link>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{success}</div>}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number or customer..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">All payments</option>
            {PAYMENT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-400">Loading orders...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No orders found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const isOpen = expanded === o.id;
              return (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleExpand(o.id)}
                    className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-bold text-gray-900 text-sm">{o.order_number}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(o.created_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status] || 'text-gray-500 bg-gray-100'}`}>
                        {o.status}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        o.payment_status === 'paid'
                          ? 'text-emerald-700 bg-emerald-50'
                          : o.payment_status === 'pending'
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-gray-500 bg-gray-100'
                      }`}>
                        {o.payment_status}
                      </span>
                      <span className="text-sm font-bold text-gray-900">₹{Number(o.total_amount).toLocaleString()}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-5 space-y-5 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Customer</p>
                          <p className="text-gray-800 font-medium">{o.customer_name}</p>
                          <p className="text-gray-500">{o.customer_email}</p>
                          <p className="text-gray-500">{o.customer_phone}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Shipping Address</p>
                          {(() => {
                            const a = o.shipping_address || {};
                            return (
                              <>
                                <p className="text-gray-700">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                                <p className="text-gray-500">{a.city}, {a.state} — {a.pincode}</p>
                                <p className="text-gray-500">{a.country}</p>
                              </>
                            );
                          })()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Payment</p>
                          <p className="text-gray-700">Gateway: {o.payment_gateway || '—'}</p>
                          <p className="text-gray-500 truncate">Payment ID: {o.gateway_payment_id || '—'}</p>
                          <p className="text-gray-700 mt-1">Subtotal: ₹{Number(o.subtotal).toLocaleString()}</p>
                          <p className="text-gray-900 font-bold">Total: ₹{Number(o.total_amount).toLocaleString()}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Items</p>
                        <div className="space-y-2">
                          {(itemsMap[o.id] || []).map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm text-gray-800 line-clamp-1">{item.product_name}</p>
                                <p className="text-xs text-gray-500">Qty {item.quantity} × ₹{Number(item.unit_price).toLocaleString()}</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900">₹{Number(item.line_total).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> Emails
                        </p>
                        {(() => {
                          const events = emailEventsMap[o.id] || [];
                          if (events.length === 0) {
                            return <p className="text-xs text-gray-400 italic">No transactional emails recorded.</p>;
                          }
                          return (
                            <div className="space-y-1.5">
                              {events.map((ev: any) => (
                                <div key={ev.id} className="flex items-center gap-2 text-xs">
                                  {ev.status === 'sent' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  ) : ev.status === 'failed' ? (
                                    <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  )}
                                  <span className="font-medium text-gray-700">{ev.event_type.replace(/_/g, ' ')}</span>
                                  <span className={`ml-auto ${
                                    ev.status === 'sent'
                                      ? 'text-emerald-600'
                                      : ev.status === 'failed'
                                        ? 'text-rose-600'
                                        : 'text-amber-600'
                                  }`}>
                                    {ev.status}
                                    {ev.attempt_count > 1 ? ` (×${ev.attempt_count})` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-3 border-t pt-4">
                        <span className="text-xs font-bold text-gray-400 uppercase">Fulfilment:</span>
                        <select
                          value={o.status}
                          onChange={(e) => changeStatus(o.id, e.target.value)}
                          className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
