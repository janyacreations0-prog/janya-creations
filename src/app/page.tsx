import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/product/ProductCard';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import HeroCarousel from '@/components/home/HeroCarousel';
import { getFeaturedProducts, toProductCard } from '@/lib/products';
import { getReviewSummaries } from '@/lib/reviews';
import { getHeroSlides, getCategoryCards } from '@/lib/homepage';
import { SITE_NAME, SITE_URL, openGraphDefaults } from '@/lib/seo';
import { ShieldCheck, Truck, RefreshCw, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Artificial Jewellery, Women\'s Clothing, Accessories & Toys',
  alternates: { canonical: '/' },
  openGraph: {
    ...openGraphDefaults,
    title: 'Artificial Jewellery, Women\'s Clothing, Accessories & Toys',
    description: 'Shop artificial jewellery, gold plated and anti-tarnish jewellery, women\'s clothing, accessories and toys at Janya Creations.',
    url: SITE_URL,
  },
};

export default async function HomePage() {
  const heroSlides = await getHeroSlides();
  const featured = await getFeaturedProducts(12);
  const reviewMap = await getReviewSummaries(featured.map((p) => String(p.id)));
  const categoryCards = await getCategoryCards();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Primary H1 — the carousel headings are H2, so this keeps a single H1 */}
      <h1 className="sr-only">
        {SITE_NAME} — Artificial Jewellery, Women&apos;s Clothing, Accessories &amp; Toys
      </h1>

      {/* Hero — dynamic product banner carousel (server-selected real products) */}
      <HeroCarousel slides={heroSlides} />

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
      {categoryCards.length > 0 && (
        <section className="bg-white py-12 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-serif font-bold text-gray-900">Shop by Category</h2>
                <p className="text-xs text-gray-500">Browse our curated collections</p>
              </div>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider transition-colors"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {categoryCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/category/${card.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  {card.image ? (
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={card.image}
                        alt={card.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-rose-50 via-rose-100/80 to-rose-50 flex items-center justify-center px-4">
                      <span className="text-lg font-serif font-bold text-rose-700 text-center">
                        {card.name}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col flex-1 p-4">
                    <h3 className="text-sm font-bold text-gray-900">{card.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 flex-1">{card.descriptor}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 mt-3 group-hover:gap-2 transition-all">
                      Shop Now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
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
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider transition-colors"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
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
