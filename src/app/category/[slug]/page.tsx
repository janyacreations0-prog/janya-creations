import { getProducts } from '@/lib/products';
import Image from 'next/image';
import Link from 'next/link';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const allProducts = await getProducts();

  // Filter products matching the current category slug
  const filteredProducts = allProducts.filter(
    (product: any) => product.category?.toLowerCase() === slug.toLowerCase()
  );

  // Format title (e.g., "artificial-jewellery" -> "Artificial Jewellery")
  const categoryTitle = slug.replace(/-/g, ' ').toUpperCase();

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">{categoryTitle}</h1>

      {filteredProducts.length === 0 ? (
        <p className="text-gray-500 py-12">No products found in this category.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {filteredProducts.map((product: any) => (
            <div key={product.id} className="group relative border rounded-lg overflow-hidden p-4">
              <div className="aspect-square relative w-full mb-3">
                <Image
                  src={product.image || product.image_url}
                  alt={product.title || product.name}
                  fill
                  className="object-cover rounded-md group-hover:scale-105 transition-transform"
                />
              </div>
              <p className="text-xs text-gray-400 uppercase">{product.category}</p>
              <h3 className="font-medium text-sm text-gray-800 line-clamp-1">
                {product.title || product.name}
              </h3>
              <p className="font-semibold text-sm mt-1">₹{product.price}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}