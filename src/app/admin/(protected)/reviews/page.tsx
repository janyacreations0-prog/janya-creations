'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { adminUpdateReviewStatus, adminDeleteReview } from '@/lib/review-actions';
import { Search, Star, BadgeCheck, MessageSquare, Check, X, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = ['pending', 'approved', 'rejected'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-700 bg-amber-50',
  approved: 'text-emerald-700 bg-emerald-50',
  rejected: 'text-rose-700 bg-rose-50',
};

export default function AdminReviewsPage() {
  const supabase = createClient();

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('product_reviews')
        .select('*, products(name)')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      setReviews(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    setError('');
    setSuccess('');
    const res =
      action === 'approve'
        ? await adminUpdateReviewStatus(id, 'approved')
        : action === 'reject'
          ? await adminUpdateReviewStatus(id, 'rejected')
          : await adminDeleteReview(id);
    if (res.success) {
      setSuccess(
        action === 'approve'
          ? 'Review approved'
          : action === 'reject'
            ? 'Review rejected'
            : 'Review deleted'
      );
      await load();
    } else {
      setError(res.error || 'Action failed');
    }
  };

  const filtered = reviews.filter((r) =>
    search
      ? String(r.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(r.products?.name || '').toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-rose-600" /> Review Moderation
            </h1>
            <p className="text-sm text-gray-500 mt-1">Approve, reject or remove customer reviews</p>
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
              placeholder="Search by customer or product..."
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
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-400">Loading reviews...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No reviews found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{r.customer_name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'text-gray-500 bg-gray-100'}`}>
                        {r.status}
                      </span>
                      {r.is_verified_purchase ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <BadgeCheck className="w-3.5 h-3.5" /> Verified Purchase
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Unverified Purchase</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        ))}
                      </span>
                      <span className="text-xs text-gray-400">
                        {r.products?.name || 'Product'} ·{' '}
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.status !== 'approved' && (
                      <button
                        onClick={() => moderate(r.id, 'approve')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {r.status !== 'rejected' && (
                      <button
                        onClick={() => moderate(r.id, 'reject')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    )}
                    <button
                      onClick={() => moderate(r.id, 'delete')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {r.review_text && (
                  <p className="text-sm text-gray-700 mt-3 bg-gray-50 rounded-lg p-3">
                    &ldquo;{r.review_text}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
