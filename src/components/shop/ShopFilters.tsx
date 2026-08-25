'use client';

import React from 'react';
import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';
import type { CategoryWithChildren, CategoryAttributeDefinition } from '@/types';

export interface Facet {
  def: CategoryAttributeDefinition;
  values: string[];
}

interface ShopFiltersProps {
  q: string;
  categorySlug: string;
  subcategorySlug: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  categories: CategoryWithChildren[];
  activeCategory: { slug: string; name: string } | null;
  subcategories: { slug: string; name: string }[];
  facets: Facet[];
  attributeParams: Record<string, string[]>;
}

function FiltersForm(props: ShopFiltersProps) {
  const {
    q,
    categorySlug,
    subcategorySlug,
    minPrice,
    maxPrice,
    sort,
    categories,
    activeCategory,
    subcategories,
    facets,
    attributeParams,
  } = props;

  const submitOnChange = (e: React.FormEvent) => {
    (e.target as HTMLElement).closest('form')?.requestSubmit();
  };

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5';

  return (
    <form method="get" action="/shop" className="space-y-4">
      {/* Search */}
      <div>
        <label className={labelCls} htmlFor="shop-q">Search</label>
        <input
          id="shop-q"
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search products..."
          className={inputCls}
        />
      </div>

      {/* Category */}
      <div>
        <label className={labelCls} htmlFor="shop-category">Category</label>
        <select
          id="shop-category"
          name="category"
          defaultValue={categorySlug}
          onChange={submitOnChange}
          className={inputCls}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Subcategory */}
      <div>
        <label className={labelCls} htmlFor="shop-subcategory">Subcategory</label>
        <select
          id="shop-subcategory"
          name="subcategory"
          defaultValue={subcategorySlug}
          disabled={!activeCategory}
          onChange={submitOnChange}
          className={`${inputCls} disabled:bg-gray-100 disabled:cursor-not-allowed`}
        >
          <option value="">
            {activeCategory ? 'All subcategories' : 'Select a category first'}
          </option>
          {subcategories.map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div>
        <label className={labelCls}>Price (₹)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="min_price"
            defaultValue={minPrice}
            min="0"
            placeholder="Min"
            className={inputCls}
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            name="max_price"
            defaultValue={maxPrice}
            min="0"
            placeholder="Max"
            className={inputCls}
          />
        </div>
      </div>

      {/* Attribute facets (dynamic from category attribute_schema) */}
      {facets.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Filters</p>
          {facets.map((facet) => (
            <div key={facet.def.key} className="mb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">{facet.def.label}</p>
              <div className="space-y-1">
                {facet.def.type === 'boolean' ? (
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name={facet.def.key}
                      value="true"
                      defaultChecked={attributeParams[facet.def.key]?.includes('true')}
                      onChange={submitOnChange}
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    Yes
                  </label>
                ) : (
                  facet.values.map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name={facet.def.key}
                        value={v}
                        defaultChecked={attributeParams[facet.def.key]?.includes(v)}
                        onChange={submitOnChange}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      {v}
                    </label>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sort */}
      <div>
        <label className={labelCls} htmlFor="shop-sort">Sort by</label>
        <select id="shop-sort" name="sort" defaultValue={sort} onChange={submitOnChange} className={inputCls}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A–Z</option>
          <option value="name_desc">Name: Z–A</option>
        </select>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Apply Filters
        </button>
        <Link
          href="/shop"
          className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors text-center"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}

export default function ShopFilters(props: ShopFiltersProps) {
  const activeFilterCount =
    (props.q ? 1 : 0) +
    (props.categorySlug ? 1 : 0) +
    (props.subcategorySlug ? 1 : 0) +
    (props.minPrice ? 1 : 0) +
    (props.maxPrice ? 1 : 0) +
    Object.values(props.attributeParams).reduce((n, v) => n + (v?.length || 0), 0);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:col-span-1">
        <div className="bg-white border border-gray-100 rounded-xl p-5 sticky top-24">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-rose-600" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-auto text-[11px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </h2>
          <FiltersForm {...props} />
        </div>
      </aside>

      {/* Mobile collapsible */}
      <details className="lg:hidden mb-6 bg-white border border-gray-100 rounded-xl overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-semibold text-gray-800 list-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-rose-600" />
            Filters
            {activeFilterCount > 0 && (
              <span className="text-[11px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </span>
          <X className="w-4 h-4 text-gray-400" />
        </summary>
        <div className="px-4 pb-4">
          <FiltersForm {...props} />
        </div>
      </details>
    </>
  );
}
