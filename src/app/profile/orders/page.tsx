import { redirect } from 'next/navigation';

/**
 * Legacy "My Orders" page — redirects to the real order history at /orders.
 * The /orders page renders the authenticated user's real orders from Supabase
 * (RLS-scoped); this route is kept only for old bookmarks/links.
 */
export default function ProfileOrders() {
  redirect('/orders');
}
