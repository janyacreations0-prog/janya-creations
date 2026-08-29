import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attribution',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Row {
  key: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  visits: number;
  productViews: number;
  addToCart: number;
  checkoutStart: number;
  orders: number;
  revenue: number;
}

const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

function keyFor(source?: string | null, medium?: string | null, campaign?: string | null, content?: string | null) {
  return [source || 'direct', medium || '-', campaign || '-', content || '-'].join('|');
}

export default async function AttributionReportPage() {
  const admin = createAdminClient();

  // V1 report: aggregate first-party data in memory. Volumes are small for a
  // new store; paginate / SQL-aggregate later when volume grows.
  const [sessionsRes, eventsRes, ordersRes] = await Promise.all([
    admin.from('visit_sessions').select('session_id, last_source, last_medium, last_campaign, last_content'),
    admin.from('analytics_events').select('session_id, event_name, product_id, order_id, created_at'),
    admin.from('orders').select('id, total_amount, payment_status, attribution'),
  ]);

  const sessions = sessionsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const orders = ordersRes.data ?? [];

  // session_id -> attribution key (from last-touch columns).
  const sessionKey = new Map<string, string>();
  const rows = new Map<string, Row>();

  for (const s of sessions) {
    const key = keyFor(s.last_source, s.last_medium, s.last_campaign, s.last_content);
    sessionKey.set(String(s.session_id), key);
    const row = rows.get(key) ?? {
      key,
      source: s.last_source || 'direct',
      medium: s.last_medium || '-',
      campaign: s.last_campaign || '-',
      content: s.last_content || '-',
      visits: 0,
      productViews: 0,
      addToCart: 0,
      checkoutStart: 0,
      orders: 0,
      revenue: 0,
    };
    row.visits += 1;
    rows.set(key, row);
  }

  for (const ev of events) {
    const key = ev.session_id ? sessionKey.get(String(ev.session_id)) : null;
    if (!key) continue;
    const row = rows.get(key);
    if (!row) continue;
    if (ev.event_name === 'product_view') row.productViews += 1;
    else if (ev.event_name === 'add_to_cart') row.addToCart += 1;
    else if (ev.event_name === 'checkout_start') row.checkoutStart += 1;
  }

  for (const o of orders) {
    const attr = (o.attribution as { last_touch?: { source?: string; medium?: string; campaign?: string; content?: string } } | null) ?? null;
    const lt = attr?.last_touch;
    const key = keyFor(lt?.source, lt?.medium, lt?.campaign, lt?.content);
    const row = rows.get(key);
    if (!row) continue;
    if (o.payment_status === 'paid') {
      row.orders += 1;
      row.revenue += Number(o.total_amount) || 0;
    }
  }

  const table = [...rows.values()].sort((a, b) => b.revenue - a.revenue || b.visits - a.visits);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attribution Report</h1>
              <p className="text-sm text-gray-500 mt-1">
                First-party traffic, funnel and revenue by source
              </p>
            </div>
          </div>
        </div>

        {table.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No attributed traffic yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Sessions are recorded when visitors land on the site; orders carry an attribution snapshot.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="p-3">Source</th>
                  <th className="p-3">Medium</th>
                  <th className="p-3">Campaign</th>
                  <th className="p-3">Content</th>
                  <th className="p-3 text-right">Visits</th>
                  <th className="p-3 text-right">Product Views</th>
                  <th className="p-3 text-right">Add to Cart</th>
                  <th className="p-3 text-right">Checkout</th>
                  <th className="p-3 text-right">Orders</th>
                  <th className="p-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50/50">
                    <td className="p-3 font-medium text-gray-900">{row.source}</td>
                    <td className="p-3 text-gray-500">{row.medium}</td>
                    <td className="p-3 text-gray-500">{row.campaign}</td>
                    <td className="p-3 text-gray-500">{row.content}</td>
                    <td className="p-3 text-right text-gray-700">{row.visits}</td>
                    <td className="p-3 text-right text-gray-700">{row.productViews}</td>
                    <td className="p-3 text-right text-gray-700">{row.addToCart}</td>
                    <td className="p-3 text-right text-gray-700">{row.checkoutStart}</td>
                    <td className="p-3 text-right font-semibold text-gray-900">{row.orders}</td>
                    <td className="p-3 text-right font-bold text-rose-600">{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
