'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import { Product } from '@/types';
import { getProducts } from '@/lib/products';
import { Sparkles, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await getProducts();
        
        // Safely map database fields with fallbacks for NULL/undefined values
        const mappedProducts: Product[] = (data || []).map((item: any) => {
          const safeTitle = item.title || item.name || 'Untitled Product';
          const safeSlug = safeTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          return {
            id: item.id,
            title: safeTitle,
            slug: safeSlug || 'product',
            price: item.original_price || item.price || 0,
            discount_price: item.price || 0,
            material: item.category || 'Jewellery',
            plating: item.badge || '',
            images: item.image_url ? [item.image_url] : ['/placeholder.jpg'],
            stock_quantity: item.stock_quantity ?? 0,
            in_stock: item.in_stock ?? ((item.stock_quantity ?? 0) > 0),
            is_featured: true,
            is_new_arrival: true,
          };
        });

        setProducts(mappedProducts);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Hero Banner */}
      <section className="relative bg-rose-50 overflow-hidden border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center lg:text-left space-y-4">
            <span className="inline-flex items-center space-x-1 text-xs font-semibold uppercase tracking-widest text-rose-600 bg-rose-100 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> New Festive Collection
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-gray-900 leading-tight">
              Elegance Handcrafted For Every Occasion
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Explore exquisite artificial jewellery, traditional ethnic clothing, and stylish accessories at Janya Creations.
            </p>
            <div className="pt-2 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link
                href="/category/artificial-jewellery"
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold tracking-wider uppercase rounded-md shadow-md transition-all"
              >
                Shop Jewellery
              </Link>
              <Link
                href="/category/womens-clothing"
                className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold tracking-wider uppercase rounded-md border border-gray-300 transition-all"
              >
                Shop Apparel
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-gray-200 relative">
            <img
              src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=1200"
              alt="Janya Creations Banner"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
          <div className="flex items-center justify-center space-x-3">
            <Truck className="w-6 h-6 text-rose-600" />
            <div className="text-left">
              <h4 className="text-xs font-bold text-gray-900">All India Shipping</h4>
              <p className="text-[10px] text-gray-500">Fast delivery to your doorstep</p>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <ShieldCheck className="w-6 h-6 text-rose-600" />
            <div className="text-left">
              <h4 className="text-xs font-bold text-gray-900">Quality Checked</h4>
              <p className="text-[10px] text-gray-500">Premium finish guaranteed</p>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-3 col-span-2 md:col-span-1">
            <RefreshCw className="w-6 h-6 text-rose-600" />
            <div className="text-left">
              <h4 className="text-xs font-bold text-gray-900">Easy Support</h4>
              <p className="text-[10px] text-gray-500">Dedicated assistance for orders</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900">Trending Now</h2>
            <p className="text-xs text-gray-500">Handpicked favourites for you</p>
          </div>
          <Link
            href="/shop"
            className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 bg-gray-200 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* Customer Reviews — social proof (hidden automatically when no approved reviews) */}
      <ReviewsSection />
    </div>
  );
}