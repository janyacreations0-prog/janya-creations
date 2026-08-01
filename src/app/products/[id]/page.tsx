import { getProducts } from '@/lib/products';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductActions from '@/components/product/ProductActions';
import BackButton from '@/components/ui/BackButton';
import { Home } from 'lucide-react';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  const allProducts = await getProducts();

  const rawProduct = allProducts.find((p: any) => String(p.id) === String(id));

  if (!rawProduct) {
    notFound();
  }

  // Fallback image handling to avoid passing undefined or non-string to Next <Image>
  const fallbackImage =
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800';

  const imageUrl =
    rawProduct.image_url || rawProduct.image || (Array.isArray(rawProduct.images) && rawProduct.images[0]) || fallbackImage;

  // Normalize product structure for client actions
  const product = {
    id: String(rawProduct.id),
    title: String(rawProduct.title || rawProduct.name || 'Janya Product'),
    price: Number(rawProduct.price) || 0,
    discount_price: Number(rawProduct.discount_price || rawProduct.price) || 0,
    material: rawProduct.category || '',
    plating: rawProduct.badge || '',
    images: [imageUrl],
    is_featured: true,
    is_new_arrival: true,
    in_stock: true,
    slug: rawProduct.slug || '',
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Navigation Bar (Back & Home Buttons) */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
        <BackButton />

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-rose-600 transition-colors bg-gray-50 hover:bg-rose-50 px-3.5 py-1.5 rounded-full border border-gray-200"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="aspect-square relative w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col space-y-6">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-widest">
              {rawProduct.category || 'Jewellery'}
            </p>
            <h1 className="text-3xl font-serif font-bold text-gray-900 mt-2">
              {product.title}
            </h1>
            <p className="text-2xl font-bold text-gray-900 mt-4">₹{product.price}</p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
              Description
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {rawProduct.description ||
                'Exquisite handcrafted piece crafted with precision and premium quality materials. Perfect for special occasions and everyday elegance.'}
            </p>
          </div>

          {/* Interactive Actions (Client Component) */}
          <ProductActions product={product} />
        </div>
      </div>
    </main>
  );
}