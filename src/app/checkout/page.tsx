'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
// ❌ REMOVED: import Navbar from '@/components/navbar/Navbar';
import { ArrowLeft, Home } from 'lucide-react';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'qr'>('cod');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    upiId: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orderId = 'JANYA-' + Math.floor(100000 + Math.random() * 900000);

    const orderDetails = {
      orderId,
      items: cart,
      total: cartTotal,
      shipping: formData,
      paymentMethod,
    };

    console.log('Order Submitted:', orderDetails);

    // Clear cart & redirect directly to the success page
    clearCart();
    router.push(`/order-success?orderId=${orderId}&method=${paymentMethod}`);
  };

  return (
    // ✅ REMOVED: <Navbar />
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <div className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        {/* Navigation Bar (Back & Home Buttons) */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-rose-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Bag</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-rose-600 transition-colors bg-white hover:bg-rose-50 px-3.5 py-1.5 rounded-full border border-gray-200 shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Shipping & Payment Section */}
          <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-xl font-serif font-bold text-gray-900 border-b pb-3">Shipping Address</h2>
            
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Full Name</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border p-2 rounded text-sm focus:ring-rose-500 focus:border-rose-500" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Phone Number</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border p-2 rounded text-sm focus:ring-rose-500 focus:border-rose-500" placeholder="9876543210" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Street Address</label>
                <input required type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full border p-2 rounded text-sm focus:ring-rose-500 focus:border-rose-500" placeholder="House no, Street name" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">City</label>
                  <input required type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full border p-2 rounded text-sm focus:ring-rose-500 focus:border-rose-500" placeholder="Delhi" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Pincode</label>
                  <input required type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} className="w-full border p-2 rounded text-sm focus:ring-rose-500 focus:border-rose-500" placeholder="110001" />
                </div>
              </div>

              {/* Payment Options */}
              <h2 className="text-xl font-serif font-bold text-gray-900 border-b pb-3 pt-4">Select Payment Method</h2>
              
              <div className="space-y-3">
                {/* COD Option */}
                <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-rose-600 bg-rose-50/50' : 'border-gray-200'}`}>
                  <div className="flex items-center space-x-3">
                    <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="text-rose-600 focus:ring-rose-500" />
                    <span className="text-sm font-semibold text-gray-800">Cash on Delivery (COD)</span>
                  </div>
                </label>

                {/* UPI Option */}
                <label className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'upi' ? 'border-rose-600 bg-rose-50/50' : 'border-gray-200'}`}>
                  <div className="flex items-center space-x-3">
                    <input type="radio" name="payment" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="text-rose-600 focus:ring-rose-500" />
                    <span className="text-sm font-semibold text-gray-800">Direct UPI ID</span>
                  </div>
                  {paymentMethod === 'upi' && (
                    <div className="mt-3 pl-6">
                      <input type="text" name="upiId" value={formData.upiId} onChange={handleInputChange} placeholder="e.g. name@upi or 9876543210@paytm" className="w-full border p-2 rounded text-xs bg-white focus:ring-rose-500 focus:border-rose-500" />
                    </div>
                  )}
                </label>

                {/* QR Code Option */}
                <label className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'qr' ? 'border-rose-600 bg-rose-50/50' : 'border-gray-200'}`}>
                  <div className="flex items-center space-x-3">
                    <input type="radio" name="payment" checked={paymentMethod === 'qr'} onChange={() => setPaymentMethod('qr')} className="text-rose-600 focus:ring-rose-500" />
                    <span className="text-sm font-semibold text-gray-800">Scan QR Code</span>
                  </div>
                  {paymentMethod === 'qr' && (
                    <div className="mt-3 pl-6 flex flex-col items-center space-y-2 bg-white p-3 rounded border">
                      <p className="text-xs text-gray-500">Scan using GPay, PhonePe, or Paytm</p>
                      <div className="w-32 h-32 bg-gray-100 flex items-center justify-center rounded border border-dashed border-gray-300">
                        <span className="text-[10px] font-mono text-gray-500 text-center px-2">QR CODE PLACEHOLDER</span>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-fit space-y-4">
            <h2 className="text-lg font-serif font-bold text-gray-900 border-b pb-3">Order Summary</h2>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p className="text-xs text-gray-500">Your bag is currently empty.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between text-xs border-b pb-2">
                    <div className="flex items-center space-x-2">
                      <img src={item.product.images?.[0]} alt="" className="w-10 h-10 object-cover rounded" />
                      <div>
                        <p className="font-semibold text-gray-800 line-clamp-1">{item.product.title}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-bold">₹{(item.product.discount_price || item.product.price) * item.quantity}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{cartTotal}</span></div>
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span className="text-green-600 font-bold">FREE</span></div>
              <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-2"><span>Total</span><span>₹{cartTotal}</span></div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={cart.length === 0}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition-all"
            >
              Confirm Order
            </button>
          </div>
        </div>
      </div>
      {/* ✅ NO footer here - layout.tsx provides it */}
    </div>
  );
}