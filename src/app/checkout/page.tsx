'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import { createOrder } from '@/lib/order-actions';
import { saveCheckoutAddress } from '@/lib/address-actions';
import { trackCheckoutStart } from '@/lib/analytics-actions';
import { normalizeIndianPhone } from '@/lib/utils';
import { ArrowLeft, Home, Lock, ShoppingBag } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isCartLoading } = useCart();

  const [session, setSession] = useState<{ user: { id: string; email?: string } | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [saveAddress, setSaveAddress] = useState(false);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState('');
  const [editingNewAddress, setEditingNewAddress] = useState(false);
  const [lastSelectedSavedAddress, setLastSelectedSavedAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cod' | 'online'>('online');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setSession({ user });
      if (user) {
        // Fetch the profile (full_name) for pre-fill.
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile) {
              setForm((f) => ({
                ...f,
                name: profile.full_name || '',
                email: user.email || profile.email || '',
              }));
            } else {
              setForm((f) => ({ ...f, email: user.email || '' }));
            }
          });
        supabase
          .from('addresses')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data: addrs }) => {
            const list = addrs || [];
            setSavedAddresses(list);
            // If the customer has no saved addresses, show the editable form by
            // default; otherwise show the saved-address selection cards.
            setEditingNewAddress(list.length === 0);
          });
      }
    });
  }, []);

  // First-party funnel event — fires once per browser session on genuine
  // checkout entry.
  useEffect(() => {
    if (window.sessionStorage.getItem('jc_checkout_start')) return;
    window.sessionStorage.setItem('jc_checkout_start', '1');
    void trackCheckoutStart().catch(() => {});
  }, []);

  const applySavedAddress = (id: string) => {
    const addr = savedAddresses.find((a) => String(a.id) === String(id));
    if (!addr) return;
    setSelectedSavedAddress(id);
    setLastSelectedSavedAddress(id);
    setEditingNewAddress(false);
    setForm((f) => ({
      ...f,
      name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.line1,
      address_line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    }));
  };

  // Switch to the "add new address" form (deselects any saved address and
  // clears the address fields so the customer starts fresh; name/email/phone
  // are left intact and remain editable).
  const startNewAddress = () => {
    setSelectedSavedAddress('');
    setEditingNewAddress(true);
    setForm((f) => ({
      ...f,
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
    }));
  };

  // Return to the saved-address selection state.
  const cancelNewAddress = () => {
    setEditingNewAddress(false);
    if (lastSelectedSavedAddress) {
      applySavedAddress(lastSelectedSavedAddress);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side phone validation before submitting.
    if (!normalizeIndianPhone(form.phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    if (cart.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setSubmitting(true);

    // Save the address if requested (fire-and-forget safe; never blocks order)
    if (saveAddress) {
      saveCheckoutAddress({
        name: form.name,
        phone: form.phone,
        line1: form.address_line1,
        line2: form.address_line2,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: 'India',
      }).catch(() => {});
    }

    const result = await createOrder({
      name: form.name,
      email: form.email,
      phone: form.phone,
      address_line1: form.address_line1,
      address_line2: form.address_line2,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      country: 'India',
      paymentMode,
    });

    setSubmitting(false);

    if (!result.success || !result.order) {
      setError(result.error || 'Unable to create your order. Please try again.');
      return;
    }

    const order = result.order;
    if (order.gateway === 'cod') {
      // COD — redirect to the order confirmation page.
      router.push(`/orders/${order.id}`);
    } else if (order.gateway === 'cashfree' && order.paymentSessionId) {
      // Cashfree hosted checkout — load the SDK dynamically.
      try {
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.async = true;
        script.onload = () => {
          const cashfree = (window as any).Cashfree({
            mode: order.cashfreeMode || 'sandbox',
          });
          cashfree.checkout({
            paymentSessionId: order.paymentSessionId,
            redirectTarget: '_self',
          });
        };
        document.body.appendChild(script);
      } catch (e) {
        setError('Payment gateway could not be loaded. Please try again.');
      }
    } else if (order.redirectUrl) {
      // PhonePe redirect (fallback).
      window.location.href = order.redirectUrl;
    } else {
      setError('Payment gateway is not ready. Please try again shortly.');
      return;
    }
  };

  if (session === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-10 text-center rounded-xl border border-gray-200 shadow-sm max-w-md w-full space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif font-bold text-gray-900">Sign in to check out</h1>
          <p className="text-sm text-gray-500">
            Your cart is saved. Sign in to place your order — your guest cart will merge automatically.
          </p>
          <Link
            href="/login?next=/checkout"
            className="inline-block w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link href="/cart" className="block text-sm text-rose-600 hover:text-rose-700 font-medium">
            Back to Cart
          </Link>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  const subtotal = cart.reduce((sum, item) => {
    const p = item.product.discount_price || item.product.price;
    return sum + (Number.isFinite(p) ? p : 0) * item.quantity;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <div className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <Link href="/cart" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-rose-600">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-rose-600 bg-white hover:bg-rose-50 px-3.5 py-1.5 rounded-full border border-gray-200 shadow-sm"
          >
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
        </div>

        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">Checkout</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Customer + shipping form */}
          <form onSubmit={handlePlaceOrder} className="lg:col-span-3 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Contact Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="co-name">Full Name *</label>
                  <input id="co-name" type="text" value={form.name} onChange={set('name')} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="co-email">Email *</label>
                  <input id="co-email" type="email" value={form.email} onChange={set('email')} required className={inputCls} readOnly={!!session?.user?.email} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="co-phone">Phone *</label>
                  <input id="co-phone" type="tel" value={form.phone} onChange={set('phone')} required className={inputCls} placeholder="10-digit mobile number" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Shipping Address</h2>

              {/* Saved-address selection state */}
              {savedAddresses.length > 0 && !editingNewAddress && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Saved Addresses</p>
                    {savedAddresses.map((a: any) => {
                      const active = String(a.id) === String(selectedSavedAddress);
                      return (
                        <label
                          key={a.id}
                          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                            active ? 'border-rose-600 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="savedAddress"
                            value={a.id}
                            checked={active}
                            onChange={() => applySavedAddress(a.id)}
                            className="mt-0.5 border-gray-300 text-rose-600 focus:ring-rose-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{a.full_name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {a.line1}
                              {a.line2 ? `, ${a.line2}` : ''}
                            </p>
                            <p className="text-xs text-gray-600">
                              {a.city}, {a.state} — {a.pincode}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={startNewAddress}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700"
                  >
                    + Add New Address
                  </button>
                </>
              )}

              {/* New-address editable form state */}
              {(editingNewAddress || savedAddresses.length === 0) && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelCls} htmlFor="co-a1">Address Line 1 *</label>
                      <input id="co-a1" type="text" value={form.address_line1} onChange={set('address_line1')} required className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls} htmlFor="co-a2">Address Line 2</label>
                      <input id="co-a2" type="text" value={form.address_line2} onChange={set('address_line2')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="co-city">City *</label>
                      <input id="co-city" type="text" value={form.city} onChange={set('city')} required className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="co-state">State *</label>
                      <input id="co-state" type="text" value={form.state} onChange={set('state')} required className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="co-pin">PIN Code *</label>
                      <input id="co-pin" type="text" inputMode="numeric" value={form.pincode} onChange={set('pincode')} required className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="co-country">Country</label>
                      <input id="co-country" type="text" value="India" readOnly className={`${inputCls} bg-gray-100 text-gray-600`} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    Save this address for future orders
                  </label>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={cancelNewAddress}
                      className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Payment Method</h2>
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMode === 'cod' ? 'border-rose-600 bg-rose-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="paymentMode"
                  value="cod"
                  checked={paymentMode === 'cod'}
                  onChange={() => setPaymentMode('cod')}
                  className="mt-0.5 border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Cash on Delivery</p>
                  <p className="text-xs text-gray-500 mt-0.5">Pay when your order is delivered.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMode === 'online' ? 'border-rose-600 bg-rose-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="paymentMode"
                  value="online"
                  checked={paymentMode === 'online'}
                  onChange={() => setPaymentMode('online')}
                  className="mt-0.5 border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Online Payment</p>
                  <p className="text-xs text-gray-500 mt-0.5">UPI &bull; Debit/Credit Cards &bull; Net Banking &bull; Wallets</p>
                </div>
              </label>
            </div>

            {paymentMode === 'online' && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Secure Payment</h2>
                <p className="text-xs text-gray-600">Pay securely using our payment provider.</p>
                <p className="text-xs text-gray-500">
                  UPI &bull; Debit/Credit Cards &bull; Net Banking &bull; Wallets
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Secure payment processing
                </p>
              </div>
            )}

            {paymentMode === 'cod' && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Cash on Delivery</h2>
                <p className="text-xs text-gray-600">Pay when your order is delivered.</p>
                <p className="text-xs text-gray-500">
                  Amount payable on delivery: <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
            >
              {submitting
                ? paymentMode === 'cod'
                  ? 'Placing Order...'
                  : 'Opening secure payment...'
                : paymentMode === 'cod'
                  ? `Place Order — ₹${subtotal.toLocaleString('en-IN')}`
                  : `Pay ₹${subtotal.toLocaleString('en-IN')} Securely`
              }
            </button>
          </form>

          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 sticky top-24">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-rose-600" /> Order Summary
              </h2>
              {isCartLoading ? (
                <p className="text-sm text-gray-400">Loading cart...</p>
              ) : cart.length === 0 ? (
                <p className="text-sm text-gray-500">Your cart is empty.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const unit = item.product.discount_price || item.product.price;
                    const variantValue = item.selected_variant?.variant_value || '';
                    const lineKey = `${String(item.product.id)}::${variantValue}`;
                    return (
                      <div key={lineKey} className="flex items-center gap-3">
                        <img
                          src={item.product.images?.[0] || 'https://via.placeholder.com/60'}
                          alt={item.product.title}
                          className="w-12 h-12 object-cover rounded-md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800 line-clamp-1">{item.product.title}</p>
                          {variantValue && (
                            <p className="text-[11px] text-gray-500">Size: {variantValue}</p>
                          )}
                          <p className="text-xs text-gray-500">Qty {item.quantity}</p>
                        </div>
                        <p className="text-xs font-bold text-gray-900">₹{unit * item.quantity}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal}</span></div>
                <div className="flex justify-between text-gray-600"><span>Shipping</span><span className="text-green-600 font-bold">FREE</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-base text-gray-900">
                  <span>Total</span><span>₹{subtotal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
