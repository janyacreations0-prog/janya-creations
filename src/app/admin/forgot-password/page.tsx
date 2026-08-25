'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Crown } from 'lucide-react';

export default function AdminForgotPassword() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // Let Supabase handle the check - if user doesn't exist, it will return an error
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      // If there's an error, it means the email doesn't exist or there's another issue
      if (error) {
        console.error('Reset password error:', error);
        
        // Supabase returns a specific error for non-existent users
        if (error.message && (
          error.message.toLowerCase().includes('not found') ||
          error.message.toLowerCase().includes('user not found') ||
          error.message.toLowerCase().includes('invalid email')
        )) {
          setError('No account found with this email address.');
          setLoading(false);
          return;
        }
        throw error;
      }

      // Success - email sent
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/admin/login');
      }, 5000);

    } catch (error: any) {
      console.error('Reset password error:', error);
      
      // Check for specific error messages
      if (error.message && error.message.includes('not found')) {
        setError('No account found with this email address.');
      } else {
        setError(error.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-amber-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <Link href="/admin/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 transition mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Crown className="w-10 h-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 text-sm mt-1">
            Enter your admin email and we'll send you a reset link
          </p>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            <CheckCircle className="w-5 h-5 inline mr-2" />
            <div className="inline">
              <p className="font-medium">Check your email!</p>
              <p className="text-sm mt-1">We've sent a password reset link to <strong>{email}</strong></p>
              <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                  placeholder="admin@janyacreations.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 text-white py-3 rounded-lg font-semibold hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        ) : null}

        <p className="text-center text-xs text-gray-400 mt-6">
          Secure login powered by Supabase Auth
        </p>
      </div>
    </div>
  );
}