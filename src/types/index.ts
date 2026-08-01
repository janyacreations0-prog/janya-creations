// Category Interface
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  created_at?: string;
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

// Product Interface
export interface Product {
  id: number;
  title: string;
  slug: string;
  description?: string;
  category_id?: number;
  category?: Category;
  price: number;
  discount_price?: number | null;
  material?: string;
  plating?: string;
  care_instructions?: string;
  images: string[]; // Up to 5 image URLs from Cloudinary/Supabase
  is_featured: boolean;
  is_new_arrival: boolean;
  in_stock: boolean;
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