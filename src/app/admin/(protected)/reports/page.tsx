import Link from 'next/link';
import {
  IndianRupee,
  Package,
  ShoppingBag,
  Clock,
  Users,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Star,
} from 'lucide-react';
import { getDashboardReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

function money(n: number): string {
  return `₹${(n || 0).toLocaleString('en-IN')}`;
}

function Card({ title, value, sub, icon }: { title: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminReportsPage() {
  const report = await getDashboardReport();
  const k = report.kpis;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard & Reporting</h1>
            <p className="text-sm text-gray-500 mt-1">Live data from the store</p>
          </div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-rose-600">
            ← Back to Dashboard
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card title="Total Revenue" value={money(k.totalRevenue)} icon={<IndianRupee className="w-4 h-4 text-emerald-500" />} />
          <Card title="Orders" value={String(k.ordersTotal)} sub={`${k.ordersPaid} paid · ${k.ordersPending} pending`} icon={<ShoppingBag className="w-4 h-4 text-rose-500" />} />
          <Card title="Customers" value={String(k.customers)} icon={<Users className="w-4 h-4 text-blue-500" />} />
          <Card title="Products" value={String(k.products)} sub={`${k.lowStock} low stock · ${k.outOfStock} out of stock`} icon={<Package className="w-4 h-4 text-indigo-500" />} />
          <Card title="Reviews Pending" value={String(k.reviewsPending)} icon={<MessageSquare className="w-4 h-4 text-amber-500" />} />
        </div>

        {/* Sales reporting */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-600" /> Sales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-lg font-bold text-gray-900">{money(report.sales.today.revenue)}</p>
              <p className="text-xs text-gray-400">{report.sales.today.orders} order{report.sales.today.orders !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Last 7 days</p>
              <p className="text-lg font-bold text-gray-900">{money(report.sales.last7.revenue)}</p>
              <p className="text-xs text-gray-400">{report.sales.last7.orders} order{report.sales.last7.orders !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Last 30 days</p>
              <p className="text-lg font-bold text-gray-900">{money(report.sales.last30.revenue)}</p>
              <p className="text-xs text-gray-400">{report.sales.last30.orders} order{report.sales.last30.orders !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Average Order Value</p>
              <p className="text-xl font-bold text-gray-900">{money(report.sales.avgOrderValue)}</p>
              <p className="text-xs text-gray-500 mt-1">Paid orders only</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Top-Selling Products</p>
              {report.sales.topSellers.length === 0 ? (
                <p className="text-sm text-gray-400">No sales yet.</p>
              ) : (
                <ul className="space-y-1">
                  {report.sales.topSellers.slice(0, 5).map((t) => (
                    <li key={t.product_name} className="flex justify-between text-sm">
                      <span className="text-gray-700 line-clamp-1">{t.product_name}</span>
                      <span className="text-gray-500 font-medium">{t.quantity} sold</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Product reporting */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-600" /> Products
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Without category</p>
              <p className="text-lg font-bold text-gray-900">{report.products.noCategory}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Without image</p>
              <p className="text-lg font-bold text-gray-900">{report.products.noImage}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Without description</p>
              <p className="text-lg font-bold text-gray-900">{report.products.noDescription}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Without reviews</p>
              <p className="text-lg font-bold text-gray-900">{report.products.noReviews}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Low Stock</p>
              {report.products.lowStock.length === 0 ? (
                <p className="text-sm text-gray-400">All products have healthy stock.</p>
              ) : (
                <ul className="space-y-1">
                  {report.products.lowStock.map((p) => (
                    <li key={p.name} className="flex justify-between text-sm">
                      <span className="text-gray-700 line-clamp-1">{p.name}</span>
                      <span className="text-amber-600 font-medium">{p.stock} left</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Out of Stock</p>
              {report.products.outOfStock.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing is out of stock.</p>
              ) : (
                <ul className="space-y-1">
                  {report.products.outOfStock.map((p) => (
                    <li key={p.name} className="flex justify-between text-sm">
                      <span className="text-gray-700 line-clamp-1">{p.name}</span>
                      <span className="text-rose-600 font-medium">Out of stock</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Category reporting */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-rose-600" /> Categories
          </h2>
          {report.categories.length === 0 ? (
            <p className="text-sm text-gray-400">No categories.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b">
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Products</th>
                    <th className="py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.categories.map((c) => (
                    <tr key={c.name}>
                      <td className="py-2 pr-4 font-medium text-gray-800">{c.name}</td>
                      <td className="py-2 pr-4 text-gray-500">{c.products}</td>
                      <td className="py-2 text-gray-700">{money(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Customers */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-600" /> Customers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">Total</p><p className="text-lg font-bold text-gray-900">{report.customers.total}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">New (30d)</p><p className="text-lg font-bold text-gray-900">{report.customers.new30d}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">Repeat buyers</p><p className="text-lg font-bold text-gray-900">{report.customers.repeat}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">With orders</p><p className="text-lg font-bold text-gray-900">{report.customers.withOrders}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">No orders</p><p className="text-lg font-bold text-gray-900">{report.customers.withoutOrders}</p></div>
          </div>
        </section>

        {/* Cart / Wishlist */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-600" /> Cart & Wishlist
          </h2>
          {report.cartWishlist.activeCarts === null ? (
            <p className="text-sm text-gray-400">
              Cart/wishlist aggregates unavailable — configure SUPABASE_SERVICE_ROLE_KEY.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">Active carts</p><p className="text-lg font-bold text-gray-900">{report.cartWishlist.activeCarts}</p></div>
              <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">Abandoned carts (24h+)</p><p className="text-lg font-bold text-gray-900">{report.cartWishlist.abandonedCarts}</p></div>
              <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">Wishlist items</p><p className="text-lg font-bold text-gray-900">{report.cartWishlist.wishlistItems}</p></div>
            </div>
          )}
          {report.cartWishlist.mostWishlisted && report.cartWishlist.mostWishlisted.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Most wishlisted</p>
              <ul className="space-y-1">
                {report.cartWishlist.mostWishlisted.map((m) => (
                  <li key={m.product_name} className="flex justify-between text-sm">
                    <span className="text-gray-700 line-clamp-1">{m.product_name}</span>
                    <span className="text-gray-500">{m.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-rose-600" /> Reviews
            </h2>
            <Link href="/admin/reviews" className="text-xs text-rose-600 hover:text-rose-700 font-medium">
              Manage Reviews →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">Total</p><p className="text-lg font-bold text-gray-900">{report.reviews.total}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-amber-500">Pending</p><p className="text-lg font-bold text-gray-900">{report.reviews.pending}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-emerald-500">Approved</p><p className="text-lg font-bold text-gray-900">{report.reviews.approved}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-rose-500">Rejected</p><p className="text-lg font-bold text-gray-900">{report.reviews.rejected}</p></div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500">Avg rating</p><p className="text-lg font-bold text-gray-900">{report.reviews.averageRating ?? '—'}</p></div>
          </div>
          {report.reviews.total === 0 && (
            <p className="text-sm text-gray-400 mt-4 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> No reviews yet — pending reviews will appear here for moderation.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
