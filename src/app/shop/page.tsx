import { getProducts } from '@/lib/products';
import Image from 'next/image';
import Link from 'next/link';

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
    filter?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category, filter } = await searchParams;
  const allProducts = await getProducts();

  // Filter products based on URL query parameters
  const filteredProducts = allProducts.filter((product: any) => {
    const prodCat = (product.category || '').toLowerCase();
    const prodTitle = (product.title || product.name || '').toLowerCase();

    if (category) {
      const searchCat = category.toLowerCase();

      // Artificial Jewellery category
      if (searchCat === 'jewellery' || searchCat === 'jewelry') {
        return (
          prodCat.includes('jewel') ||
          prodCat.includes('artificial') ||
          prodCat.includes('brass') ||
          prodCat.includes('alloy') ||
          prodCat.includes('pearl') ||
          prodTitle.includes('necklace') ||
          prodTitle.includes('earring') ||
          prodTitle.includes('choker')
        );
      }

      // Women's Clothing category
      if (searchCat === 'clothing') {
        return (
          prodCat.includes('cloth') ||
          prodCat.includes('apparel') ||
          prodCat.includes('suit') ||
          prodCat.includes('saree') ||
          prodCat.includes('cotton') ||
          prodCat.includes('silk') ||
          prodTitle.includes('anarkali') ||
          prodTitle.includes('dress')
        );
      }

      // Accessories category
      if (searchCat === 'accessories') {
        return (
          prodCat.includes('accessori') ||
          prodCat.includes('velvet') ||
          prodCat.includes('leather') ||
          prodTitle.includes('bag') ||
          prodTitle.includes('clutch') ||
          prodTitle.includes('purse')
        );
      }

      // Default broad match against category or title
      return prodCat.includes(searchCat) || prodTitle.includes(searchCat);
    }

    if (filter === 'new-arrivals') {
      return product.is_new || prodCat.includes('new') || true;
    }

    return true; // Show all if no filter is provided
  });

  // Dynamic heading text
  let pageTitle = 'All Products';
  if (category === 'jewellery') pageTitle = 'Artificial Jewellery';
  if (category === 'clothing') pageTitle = "Women's Clothing";
  if (category === 'accessories') pageTitle = 'Accessories';
  if (filter === 'new-arrivals') pageTitle = 'New Arrivals';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8 capitalize">
        {pageTitle}
      </h1>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No products found in this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {filteredProducts.map((product: any) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group relative border border-gray-100 rounded-lg overflow-hidden p-4 bg-white shadow-sm hover:shadow-md transition-shadow block"
            >
              <div className="aspect-square relative w-full mb-3 bg-gray-50 rounded-md overflow-hidden">
                <Image
                  src={product.image || product.image_url}
                  alt={product.title || product.name || 'Product Image'}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                {product.category}
              </p>
              <h3 className="font-medium text-sm text-gray-800 line-clamp-1 mt-1">
                {product.title || product.name}
              </h3>
              <p className="font-semibold text-sm text-gray-900 mt-1">₹{product.price}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}