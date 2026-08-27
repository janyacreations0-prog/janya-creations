'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();

  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const isWishlisted = isInWishlist(product.id);
  const discountPercent = calculateDiscount(product.price, product.discount_price);
  const outOfStock = !product.in_stock || (typeof product.stock_quantity === 'number' && product.stock_quantity <= 0);

  // Prefer the small 300px thumbnail for listing cards. Large images are only
  // used on the product detail page.
  const primaryImage =
    (product.image_thumbnail as string) ||
    (product.images && product.images.length > 0 ? product.images[0] : '') ||
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800';

  const handleQuickAdd = async () => {
    if (outOfStock) return;
    setError('');
    const res = await addToCart(product, 1);
    if (res.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } else {
      setError(res.error || 'Unable to add to cart. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="group relative bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
      {/* Image & Overlay Badges Container */}
      <div className="relative aspect-[3/4] w-full bg-gray-50 overflow-hidden">
        <Link href={`/products/${product.id}`} className="block w-full h-full">
          <Image
            src={primaryImage}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col space-y-1">
          {discountPercent > 0 && (
            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {discountPercent}% OFF
            </span>
          )}
          {product.plating && (
            <span className="bg-amber-900/80 backdrop-blur-md text-amber-100 text-[10px] font-medium px-2 py-0.5 rounded">
              {product.plating}
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-gray-700 hover:text-rose-600 shadow-sm transition-colors z-10"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
        </button>

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="bg-gray-900/80 text-white text-[11px] font-bold px-3 py-1.5 rounded uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick Add To Cart — always visible on touch, hover-reveal on desktop */}
        {!outOfStock && (
          <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleQuickAdd();
              }}
              className="w-full py-2 bg-white/95 hover:bg-rose-600 hover:text-white text-gray-900 text-xs font-bold rounded shadow flex items-center justify-center space-x-1 transition-colors"
              aria-label={`Add ${product.title} to cart`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{added ? 'ADDED!' : 'ADD TO CART'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-3 flex flex-col flex-1 justify-between bg-white">
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5">
            {product.material || 'Janya Special'}
          </span>

          <Link href={`/products/${product.id}`}>
            <h3 className="text-xs sm:text-sm font-medium text-gray-800 line-clamp-1 hover:text-rose-600 transition-colors">
              {product.title}
            </h3>
          </Link>
        </div>

        <div className="mt-2 flex items-baseline space-x-2">
          {product.discount_price ? (
            <>
              <span className="text-sm font-bold text-gray-900">
                {formatPrice(product.discount_price)}
              </span>
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {error && <p className="mt-2 text-[11px] text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
