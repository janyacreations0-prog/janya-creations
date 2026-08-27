'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface ShopToolbarProps {
  totalCount: number;
  from: number;
  to: number;
  params: Record<string, string | string[] | undefined>;
  sort: string;
  q: string;
  activeCategoryName?: string;
  subcategoryName?: string;
  minPrice: string;
  maxPrice: string;
  attributeParams: Record<string, string[]>;
}

function buildUrl(
  params: Record<string, string | string[] | undefined>,
  overrides?: Record<string, string | undefined>,
  removeKeys?: string[]
): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'page') return;
    if (removeKeys?.includes(k)) return;
    if (Array.isArray(v)) {
      v.forEach((item) => qs.append(k, item));
    } else if (v !== undefined && v !== '') {
      qs.set(k, v);
    }
  });
  if (overrides) {
    Object.entries(overrides).forEach(([k, v]) => {
      qs.delete(k);
      if (v !== undefined && v !== '') qs.set(k, v);
    });
  }
  const q = qs.toString();
  return q ? `/shop?${q}` : '/shop';
}

function removeAttrValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
  value: string
): Record<string, string | undefined> {
  const existing = params[key];
  if (!existing) return { [key]: undefined };
  const arr = Array.isArray(existing) ? existing : [existing];
  const remaining = arr.filter((v) => v !== value);
  return remaining.length > 0 ? { [key]: remaining.join(',') } : { [key]: undefined };
}

interface Chip {
  label: string;
  href: string;
}

export default function ShopToolbar(props: ShopToolbarProps) {
  const router = useRouter();
  const { totalCount, from, to, params, sort, q, activeCategoryName, subcategoryName, minPrice, maxPrice, attributeParams } = props;

  const chips: Chip[] = [];

  if (q) {
    chips.push({ label: `"${q}"`, href: buildUrl(params, undefined, ['q']) });
  }
  if (activeCategoryName) {
    chips.push({ label: activeCategoryName, href: buildUrl(params, undefined, ['category', 'subcategory']) });
  }
  if (subcategoryName) {
    chips.push({ label: subcategoryName, href: buildUrl(params, undefined, ['subcategory']) });
  }
  if (minPrice || maxPrice) {
    const label = `₹${minPrice || '0'}–${maxPrice ? `₹${maxPrice}` : '∞'}`;
    chips.push({ label, href: buildUrl(params, undefined, ['min_price', 'max_price']) });
  }
  Object.entries(attributeParams).forEach(([key, values]) => {
    values.forEach((v) => {
      const overrides = removeAttrValue(params, key, v);
      chips.push({ label: v, href: buildUrl(params, overrides, []) });
    });
  });

  const hasClearAll = chips.length > 0;

  return (
    <div className="space-y-3 mb-4">
      {/* Top row: count + sort */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of{' '}
          <span className="font-semibold text-gray-700">{totalCount}</span> product{totalCount !== 1 ? 's' : ''}
        </p>

        <select
          value={sort}
          onChange={(e) => router.push(buildUrl(params, { sort: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          aria-label="Sort products"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A–Z</option>
          <option value="name_desc">Name: Z–A</option>
        </select>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <a
              key={chip.label}
              href={chip.href}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[11px] font-medium hover:bg-rose-100 transition-colors"
            >
              {chip.label}
              <X className="w-3 h-3" />
            </a>
          ))}

          {hasClearAll && (
            <a
              href="/shop"
              className="text-[11px] text-gray-500 hover:text-rose-600 underline transition-colors"
            >
              Clear all
            </a>
          )}
        </div>
      )}
    </div>
  );
}