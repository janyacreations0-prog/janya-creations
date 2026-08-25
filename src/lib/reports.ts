import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface DashboardReport {
  kpis: {
    totalRevenue: number;
    ordersTotal: number;
    ordersPaid: number;
    ordersPending: number;
    customers: number;
    products: number;
    lowStock: number;
    outOfStock: number;
    reviewsPending: number;
  };
  sales: {
    today: { revenue: number; orders: number };
    last7: { revenue: number; orders: number };
    last30: { revenue: number; orders: number };
    avgOrderValue: number;
    recentOrders: { order_number: string; total_amount: number; status: string; created_at: string }[];
    topSellers: { product_name: string; quantity: number }[];
  };
  products: {
    total: number;
    bestSellers: { product_name: string; quantity: number }[];
    lowStock: { name: string; stock: number }[];
    outOfStock: { name: string }[];
    noCategory: number;
    noImage: number;
    noDescription: number;
    noReviews: number;
  };
  categories: {
    name: string;
    products: number;
    revenue: number;
  }[];
  customers: {
    total: number;
    new30d: number;
    repeat: number;
    withOrders: number;
    withoutOrders: number;
  };
  cartWishlist: {
    activeCarts: number | null;
    abandonedCarts: number | null;
    wishlistItems: number | null;
    mostWishlisted: { product_name: string; count: number }[] | null;
  };
  reviews: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    averageRating: number | null;
    highestRated: { product_name: string; avg: number }[] | null;
    lowestRated: { product_name: string; avg: number }[] | null;
  };
}

function rangify(days: number): { gte: string } {
  const d = new Date(Date.now() - days * 86400000);
  return { gte: d.toISOString() };
}

export async function getDashboardReport(): Promise<DashboardReport> {
  const sup = await createClient();

  // Admins can read all orders, products, reviews, categories, profiles.
  const [ordersRes, productsRes, categoriesRes, reviewsRes, profileRes, itemsRes] =
    await Promise.all([
      sup.from('orders').select('id, user_id, status, payment_status, total_amount, created_at, order_number'),
      sup.from('products').select('id, title, name, category_id, image_url, image_large, description, stock_quantity'),
      sup.from('categories').select('id, name, parent_id'),
      sup.from('product_reviews').select('id, status, rating, product_id'),
      sup.from('profiles').select('id, role, created_at').eq('role', 'customer'),
      sup.from('order_items').select('product_name, quantity, product_id, order_id'),
    ]);

  const orders = (ordersRes.data || []) as any[];
  const products = (productsRes.data || []) as any[];
  const categories = (categoriesRes.data || []) as any[];
  const reviews = (reviewsRes.data || []) as any[];
  const profiles = (profileRes.data || []) as any[];
  const items = (itemsRes.data || []) as any[];

  const paidOrders = orders.filter((o: any) => o.payment_status === 'paid');
  const pendingOrders = orders.filter((o: any) => o.payment_status === 'pending');
  const totalRevenue = paidOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);

  const now = Date.now();
  const day = 86400000;
  const today = orders.filter((o: any) => new Date(o.created_at).getTime() > now - day);
  const last7 = orders.filter((o: any) => new Date(o.created_at).getTime() > now - 7 * day);
  const last30 = orders.filter((o: any) => new Date(o.created_at).getTime() > now - 30 * day);

  const todayRevenue = today.filter((o: any) => o.payment_status === 'paid').reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
  const last7Revenue = last7.filter((o: any) => o.payment_status === 'paid').reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
  const last30Revenue = last30.filter((o: any) => o.payment_status === 'paid').reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);

  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  const recentOrders = orders
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((o: any) => ({
      order_number: o.order_number,
      total_amount: Number(o.total_amount),
      status: o.status,
      created_at: o.created_at,
    }));

  const topSellers = Object.entries(
    items.reduce((acc: Record<string, number>, i: any) => {
      const name = String(i.product_name || 'Unknown');
      acc[name] = (acc[name] || 0) + (i.quantity || 0);
      return acc;
    }, {})
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([product_name, quantity]) => ({ product_name, quantity }));

  const lowStock = products
    .filter((p: any) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5)
    .map((p: any) => ({ name: p.title || p.name || 'Unknown', stock: p.stock_quantity ?? 0 }));
  const outOfStock = products
    .filter((p: any) => (p.stock_quantity ?? 0) <= 0)
    .map((p: any) => ({ name: p.title || p.name || 'Unknown' }));
  const noCategory = products.filter((p: any) => !p.category_id).length;
  const noImage = products.filter(
    (p: any) => !p.image_url && !p.image_large && !p.image
  ).length;
  const noDescription = products.filter((p: any) => !p.description).length;
  const noReviews = products.filter(
    (p: any) => !reviews.some((r: any) => String(r.product_id) === String(p.id) && r.status === 'approved')
  ).length;

  // Category reporting
  const catMap = new Map<string, any>();
  categories.forEach((c: any) => catMap.set(String(c.id), c));
  const catProducts = new Map<string, { products: number; revenue: number }>();
  products.forEach((p: any) => {
    if (!p.category_id) return;
    // find top-level
    const cat = catMap.get(String(p.category_id));
    const topId = cat?.parent_id ? String(cat.parent_id) : String(p.category_id);
    const entry = catProducts.get(topId) || { products: 0, revenue: 0 };
    entry.products += 1;
    // revenue from order_items (product_id → product → category)
    catProducts.set(topId, entry);
  });

  // Revenue per category from order_items
  const prodToCat = new Map<string, string>();
  products.forEach((p: any) => {
    if (p.category_id) {
      const cat = catMap.get(String(p.category_id));
      const topId = cat?.parent_id ? String(cat.parent_id) : String(p.category_id);
      prodToCat.set(String(p.id), topId);
    }
  });
  items.forEach((i: any) => {
    const topId = prodToCat.get(String(i.product_id));
    if (topId) {
      const entry = catProducts.get(topId) || { products: 0, revenue: 0 };
      entry.revenue += Number(i.line_total || 0);
      catProducts.set(topId, entry);
    }
  });

  const categoryReport = categories
    .filter((c: any) => !c.parent_id)
    .map((c: any) => {
      const data = catProducts.get(String(c.id)) || { products: 0, revenue: 0 };
      return { name: c.name, products: data.products, revenue: Math.round(data.revenue) };
    });

  // Customer report
  const customerIds = new Set<string>();
  orders.forEach((o: any) => o.user_id && customerIds.add(String(o.user_id)));
  const orderCountPerUser = new Map<string, number>();
  orders.forEach((o: any) => {
    if (!o.user_id) return;
    const uid = String(o.user_id);
    orderCountPerUser.set(uid, (orderCountPerUser.get(uid) || 0) + 1);
  });
  const repeatUsers = [...orderCountPerUser.values()].filter((c) => c >= 2).length;
  const new30d = profiles.filter((p: any) => new Date(p.created_at).getTime() > now - 30 * day).length;

  // Cart/wishlist (service role, may fail gracefully)
  let activeCarts: number | null = null;
  let abandonedCarts: number | null = null;
  let wishlistItems: number | null = null;
  let mostWishlisted: { product_name: string; count: number }[] | null = null;
  try {
    const admin = createAdminClient();
    const [cartItemsRes, wlRes] = await Promise.all([
      admin.from('cart_items').select('cart_id, updated_at, products(name)'),
      admin.from('wishlist_items').select('product_id, products(name)'),
    ]);
    const cartRows = cartItemsRes.data || [];
    const wlRows = wlRes.data || [];
    const cartIds = new Set(cartRows.map((r: any) => String(r.cart_id)));
    activeCarts = cartIds.size;
    const cutoff = new Date(Date.now() - 24 * 3600000).toISOString();
    abandonedCarts = [...new Set(cartRows.filter((r: any) => r.updated_at && r.updated_at < cutoff).map((r: any) => r.cart_id))].length;
    wishlistItems = wlRows.length;
    // most wishlisted
    const wlCounts: Record<string, { product_name: string; count: number }> = {};
    wlRows.forEach((r: any) => {
      const pid = String(r.product_id);
      const product_name = r.products?.name || 'Unknown';
      if (!wlCounts[pid]) wlCounts[pid] = { product_name, count: 0 };
      wlCounts[pid].count += 1;
    });
    mostWishlisted = Object.entries(wlCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([, v]) => v);
  } catch {
    // service-role key missing — cart/wishlist reporting unavailable
  }

  // Review reporting
  const reviewCount = reviews.length;
  const pendingReviews = reviews.filter((r: any) => r.status === 'pending').length;
  const approvedReviews = reviews.filter((r: any) => r.status === 'approved').length;
  const rejectedReviews = reviews.filter((r: any) => r.status === 'rejected').length;
  const approvedRatings = reviews.filter((r: any) => r.status === 'approved').map((r: any) => r.rating);
  const avgRating =
    approvedRatings.length > 0
      ? Math.round((approvedRatings.reduce((s: number, r: number) => s + r, 0) / approvedRatings.length) * 10) / 10
      : null;

  return {
    kpis: {
      totalRevenue: Math.round(totalRevenue),
      ordersTotal: orders.length,
      ordersPaid: paidOrders.length,
      ordersPending: pendingOrders.length,
      customers: profiles.length,
      products: products.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      reviewsPending: pendingReviews,
    },
    sales: {
      today: { revenue: Math.round(todayRevenue), orders: today.length },
      last7: { revenue: Math.round(last7Revenue), orders: last7.length },
      last30: { revenue: Math.round(last30Revenue), orders: last30.length },
      avgOrderValue: Math.round(avgOrderValue),
      recentOrders,
      topSellers,
    },
    products: {
      total: products.length,
      bestSellers: topSellers,
      lowStock,
      outOfStock,
      noCategory,
      noImage,
      noDescription,
      noReviews,
    },
    categories: categoryReport,
    customers: {
      total: profiles.length,
      new30d,
      repeat: repeatUsers,
      withOrders: customerIds.size,
      withoutOrders: profiles.length - customerIds.size,
    },
    cartWishlist: {
      activeCarts,
      abandonedCarts,
      wishlistItems,
      mostWishlisted,
    },
    reviews: {
      total: reviewCount,
      pending: pendingReviews,
      approved: approvedReviews,
      rejected: rejectedReviews,
      averageRating: avgRating,
      highestRated: null,
      lowestRated: null,
    },
  };
}