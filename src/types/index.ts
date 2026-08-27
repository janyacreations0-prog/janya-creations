// ============================================================================
// Janya Creations — Shared types
// ============================================================================

// Category attribute definition (stored in categories.attribute_schema JSONB)
export interface CategoryAttributeDefinition {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multi-select' | 'number' | 'boolean';
  options?: string[];
  required?: boolean;
  suffix?: string;
  placeholder?: string;
}

// Category Interface (mirrors the database `categories` table)
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  parent_id?: string | null;
  is_active: boolean;
  sort_order: number;
  attribute_schema?: CategoryAttributeDefinition[] | null;
  created_at?: string;
  updated_at?: string;
}

// Category with its one-level subcategories attached
export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

// Product Variant (Sizes like S, M, L or Colors like Gold, Silver)
export interface ProductVariant {
  id?: number;
  product_id?: number;
  variant_type: 'SIZE' | 'COLOR';
  variant_value: string;
  stock_quantity: number;
  sku?: string;
}

// A single size/option a product offers (stored in products.attributes.sizes).
// "Free Size" is a normal option value — available universally, never
// hardcoded to any one category.
export interface SizeOption {
  value: string;
  stock: number;
}

// Product Interface
export interface Product {
  id: string | number;
  title: string;
  slug?: string;
  description?: string;
  category_id?: string | null;
  category?: string | Category | null;
  attributes?: Record<string, unknown>;
  price: number;
  discount_price?: number | null;
  stock_quantity?: number;
  in_stock?: boolean;
  material?: string;
  plating?: string;
  care_instructions?: string;
  image_url?: string;
  image_large?: string;
  image_medium?: string;
  image_thumbnail?: string;
  images: string[]; // Up to 5 image URLs from Cloudinary/Supabase
  is_featured: boolean;
  is_new_arrival: boolean;
  /** Optional size/option list (e.g. ["S","M","L","Free Size"] + stock). */
  sizes?: SizeOption[];
  variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

// Shopping Cart Item Interface
export interface CartItem {
  product: Product;
  selected_variant?: ProductVariant;
  quantity: number;
}

// Customer Address Interface
export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

// Order Interface
export interface Order {
  id?: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  total_amount: number;
  payment_method: 'PHONEPE' | 'UPI' | 'COD';
  payment_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payment_id?: string;
  order_status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  tracking_number?: string;
  items: CartItem[];
  created_at?: string;
}
