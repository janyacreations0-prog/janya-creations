'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download } from 'lucide-react';

interface UPIPaymentProps {
  amount: number;
  orderId: string;
  upiId: string;
  merchantName: string;
}

export default function UPIPayment({ amount, orderId, upiId, merchantName }: UPIPaymentProps) {
  const [qrCode, setQrCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generate UPI deep link
  const generateUpiLink = () => {
    // Format: upi://pay?pa=upi-id&pn=merchant-name&am=amount&cu=INR&tn=order-id
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=Order%20${orderId}`;
  };

  // Generate QR code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const upiLink = generateUpiLink();
        const qrDataUrl = await QRCode.toDataURL(upiLink, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1a1a2e',
            light: '#ffffff',
          },
        });
        setQrCode(qrDataUrl);
        setLoading(false);
      } catch (error) {
        console.error('QR Generation Error:', error);
        setLoading(false);
      }
    };

    generateQR();
  }, [amount, orderId]);

  // Copy UPI ID
  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR
  const downloadQR = () => {
    const link = document.createElement('a');
    link.download = `QR-${orderId}.png`;
    link.href = qrCode;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QR Code Display */}
      <div className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-gray-200">
          {qrCode && (
            <img
              src={qrCode}
              alt="UPI Payment QR Code"
              className="w-64 h-64 object-contain"
            />
          )}
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Scan with GPay, PhonePe, Paytm, or any UPI app
        </p>
      </div>

      {/* Payment Details */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount</span>
          <span className="font-bold text-rose-600">₹{amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Order ID</span>
          <span className="font-mono font-medium">{orderId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Merchant</span>
          <span className="font-medium">{merchantName}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-gray-600">UPI ID</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-white px-3 py-1 rounded border">
              {upiId}
            </span>
            <button
              onClick={copyUpiId}
              className="text-gray-400 hover:text-rose-600 transition"
              title="Copy UPI ID"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={downloadQR}
          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Download QR
        </button>
        <button
          onClick={() => window.open(generateUpiLink(), '_blank')}
          className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-semibold hover:bg-rose-700 transition"
        >
          Pay with UPI
        </button>
      </div>

      {/* Payment Instructions */}
      <div className="text-xs text-gray-400 text-center space-y-1 border-t pt-4">
        <p>1. Scan QR code with any UPI app</p>
        <p>2. Verify amount and pay</p>
        <p>3. You'll be redirected to confirm payment</p>
      </div>
    </div>
  );
}