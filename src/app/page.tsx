import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/product/ProductCard';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import { getFeaturedProducts, toProductCard } from '@/lib/products';
import { getCategoryTree } from '@/lib/categories';
import { getReviewSummaries } from '@/lib/reviews';
import { Sparkles, ShieldCheck, Truck, RefreshCw, ArrowRight } from 'lucide-react';

// ISR: revalidate the homepage product grid every 5 minutes. The shop/category
// pages stay fully dynamic, so product availability is never stale for long.
export const revalidate = 300;

export default async function HomePage() {
  const featured = await getFeaturedProducts(12);
  const reviewMap = await getReviewSummaries(featured.map((p) => String(p.id)));
  const topCategories = await getCategoryTree();

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

      {/* Shop by Category */}
      {topCategories.length > 0 && (
        <section className="bg-white py-12 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-serif font-bold text-gray-900">Shop by Category</h2>
                <p className="text-xs text-gray-500">Browse our curated collections</p>
              </div>
              <Link
                href="/shop"
                className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider"
              >
                View All
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {topCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="group relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  {cat.image_url ? (
                    <div className="relative h-28 sm:h-36">
                      <Image
                        src={cat.image_url}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end p-3">
                        <span className="text-white text-sm font-semibold">{cat.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 sm:h-28 flex items-center justify-between px-4 bg-rose-50 group-hover:bg-rose-100 transition-colors">
                      <span className="text-sm font-semibold text-rose-700">{cat.name}</span>
                      <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Grid (server-rendered, 12 newest) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900">New Arrivals</h2>
            <p className="text-xs text-gray-500">The latest pieces, fresh in store</p>
          </div>
          <Link
            href="/shop?filter=new-arrivals"
            className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {featured.map((p) => (
            <ProductCard key={p.id} product={toProductCard(p)} rating={reviewMap[String(p.id)]} />
          ))}
        </div>
      </main>

      {/* Customer Reviews — social proof (hidden automatically when no approved reviews) */}
      <ReviewsSection />
    </div>
  );
}
