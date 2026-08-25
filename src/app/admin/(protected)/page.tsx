'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ImageUpload from '@/components/admin/ImageUpload';
import { 
  ShieldCheck, Package, ShoppingBag, LogOut, TrendingUp,
  Plus, Trash2, Edit2, Eye, Search, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { saveProduct } from '@/lib/admin-actions';
import { mergeAttributeSchemas } from '@/lib/categories';
import type { CategoryAttributeDefinition } from '@/types';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  badge?: string | null;
  rating: number;
  sold: number;
  image_url: string;
  image_large?: string;
  image_medium?: string;
  image_thumbnail?: string;
  category: string;
  category_id?: string | null;
  attributes?: Record<string, unknown>;
  stock_quantity: number;
  description?: string;
  created_at?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 🔍 Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Categories (dynamic, database-backed)
  const [categories, setCategories] = useState<any[]>([]);

  // 📄 Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    original_price: '',
    badge: '',
    categoryId: '',
    subcategoryId: '',
    stock_quantity: '10',
    description: '',
    image_url: '',
    image_large: '',
    image_medium: '',
    image_thumbnail: '',
    attributes: {} as Record<string, unknown>,
  });

  // Stats (only real counts; revenue/orders live on /admin/reports)
  const [stats, setStats] = useState({
    totalProducts: 0
  });

  // Derived category helpers
  const topCategories = categories.filter((c: any) => !c.parent_id);

  // Active categories only for product assignment (admin may still edit a
  // product assigned to an inactive category — those are merged back in below).
  const topCategoryOptions = useMemo(() => {
    const active = categories.filter((c: any) => !c.parent_id && c.is_active);
    const map = new Map<string, any>();
    active.forEach((c) => map.set(String(c.id), c));
    const current = editingProduct?.category_id
      ? categories.find((c: any) => String(c.id) === String(editingProduct!.category_id))
      : null;
    const currentTop = current?.parent_id
      ? categories.find((c: any) => String(c.id) === String(current.parent_id))
      : current;
    if (currentTop && !map.has(String(currentTop.id))) map.set(String(currentTop.id), currentTop);
    return [...map.values()].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    );
  }, [categories, editingProduct]);

  const subcategoryOptions = useMemo(() => {
    const children = categories.filter(
      (c: any) => String(c.parent_id) === String(formData.categoryId) && c.is_active
    );
    const map = new Map<string, any>();
    children.forEach((c) => map.set(String(c.id), c));
    const current = editingProduct?.category_id
      ? categories.find((c: any) => String(c.id) === String(editingProduct!.category_id))
      : null;
    if (
      current?.parent_id &&
      String(current.parent_id) === String(formData.categoryId) &&
      !map.has(String(current.id))
    ) {
      map.set(String(current.id), current);
    }
    return [...map.values()].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    );
  }, [categories, formData.categoryId, editingProduct]);

  // Attribute schema of the currently selected leaf category — the top-level
  // category's common schema is inherited and merged with the subcategory's.
  const attributeSchema = useMemo<CategoryAttributeDefinition[]>(() => {
    const leafId = formData.subcategoryId || formData.categoryId;
    const leaf = categories.find((c: any) => String(c.id) === String(leafId));
    const parent = leaf?.parent_id
      ? categories.find((c: any) => String(c.id) === String(leaf.parent_id))
      : null;
    const base = parent ?? leaf ?? null;
    return mergeAttributeSchemas(
      parent?.attribute_schema ?? null,
      leaf && parent ? leaf.attribute_schema : base?.attribute_schema ?? null
    );
  }, [categories, formData.subcategoryId, formData.categoryId]);

  const handleAttributeChange = (key: string, value: unknown) => {
    setFormData((f) => ({
      ...f,
      attributes: { ...f.attributes, [key]: value },
    }));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/admin/login');
    } else {
      setIsAuthLoading(false);
      loadProducts();
      loadCategories();
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
      setStats(prev => ({ ...prev, totalProducts: data?.length || 0 }));
    } catch (err: any) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // 1. Handle Search & Filter logic
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      let matchesCategory = true;
      if (selectedCategory !== 'All') {
        const cat = categories.find((c: any) => String(c.id) === String(product.category_id));
        if (!cat) {
          matchesCategory = false;
        } else {
          const topId = cat.parent_id ? String(cat.parent_id) : String(cat.id);
          matchesCategory = topId === selectedCategory;
        }
      }
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory, categories]);

  // Resolve a product's category/subcategory names from category_id
  const categoryInfoFor = (product: Product) => {
    if (!product.category_id) return { top: null, sub: null };
    const cat = categories.find((c: any) => String(c.id) === String(product.category_id));
    if (!cat) return { top: null, sub: null };
    if (cat.parent_id) {
      const parent = categories.find((c: any) => String(c.id) === String(cat.parent_id));
      return { top: parent?.name ?? null, sub: cat.name };
    }
    return { top: cat.name, sub: null };
  };

  // 2. Handle Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // 3. Status Toggle Handler (Supabase Update)
  const handleToggleStock = async (product: Product) => {
    const newStock = product.stock_quantity > 0 ? 0 : 10;
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev =>
        prev.map(item => item.id === product.id ? { ...item, stock_quantity: newStock } : item)
      );
    } catch (err: any) {
      setError('Failed to update stock status');
    }
  };

  // 4. Populate form for Editing
  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    setIsAddingProduct(true);

    // Resolve category/subcategory from the product's category_id
    let categoryId = '';
    let subcategoryId = '';
    let leafId = product.category_id ? String(product.category_id) : '';
    if (product.category_id) {
      const cat = categories.find((c: any) => String(c.id) === String(product.category_id));
      if (cat) {
        if (cat.parent_id) {
          categoryId = String(cat.parent_id);
          subcategoryId = String(cat.id);
        } else {
          categoryId = String(cat.id);
        }
      }
    }

    // Seed attributes from the product — only keys defined in the category schema
    const leaf = categories.find((c: any) => String(c.id) === String(leafId));
    const schema: CategoryAttributeDefinition[] = leaf?.attribute_schema ?? [];
    const attributes: Record<string, unknown> = {};
    if (product.attributes && typeof product.attributes === 'object') {
      schema.forEach((def) => {
        const raw = product.attributes as Record<string, unknown>;
        if (def.key in raw) attributes[def.key] = raw[def.key];
      });
    }

    setFormData({
      name: product.name || '',
      price: product.price ? String(product.price) : '',
      original_price: product.original_price ? String(product.original_price) : '',
      badge: product.badge || '',
      categoryId,
      subcategoryId,
      stock_quantity: String(product.stock_quantity ?? 10),
      description: product.description || '',
      image_url: product.image_url || '',
      image_large: product.image_large || '',
      image_medium: product.image_medium || '',
      image_thumbnail: product.image_thumbnail || '',
      attributes,
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // 5. Add / Update Product Submit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // The product's category_id is the LEAF (subcategory if chosen, else the
      // selected top-level category). Legacy `category` text is only written on
      // create (not overwritten on edit).
      const leafCategoryId = formData.subcategoryId || formData.categoryId || null;
      const topCategory = topCategories.find(
        (c: any) => String(c.id) === String(formData.categoryId)
      );

      // Collect attribute values from the rendered schema fields. Empty/blank
      // values are omitted; the server action validates the rest.
      const attributes: Record<string, unknown> = {};
      attributeSchema.forEach((def) => {
        const value = formData.attributes[def.key];
        if (value !== undefined && value !== null && value !== '') {
          attributes[def.key] = value;
        }
      });

      const result = await saveProduct({
        id: editingProduct?.id,
        name: formData.name,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : undefined,
        badge: formData.badge || undefined,
        category_id: leafCategoryId,
        stock_quantity: Number(formData.stock_quantity) || 0,
        description: formData.description || '',
        image_url: formData.image_url || '',
        image_large: formData.image_large || '',
        image_medium: formData.image_medium || '',
        image_thumbnail: formData.image_thumbnail || '',
        attributes,
        legacyCategoryName: editingProduct ? undefined : topCategory?.name,
      });

      if (!result.success) {
        setError(result.error || 'Failed to save product');
        setLoading(false);
        return;
      }

      setSuccess(editingProduct ? '✅ Product updated successfully!' : '✅ Product added successfully!');

      setFormData({
        name: '',
        price: '',
        original_price: '',
        badge: '',
        categoryId: '',
        subcategoryId: '',
        stock_quantity: '10',
        description: '',
        image_url: '',
        image_large: '',
        image_medium: '',
        image_thumbnail: '',
        attributes: {},
      });
      setIsAddingProduct(false);
      setEditingProduct(null);
      await loadProducts();

    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product permanently?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('✅ Product deleted successfully!');
      await loadProducts();

    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-rose-600" />
            <h1 className="text-xl font-serif font-bold text-gray-900">Admin Portal</h1>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Protected</span>
            <Link
              href="/admin/categories"
              className="text-xs bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              Categories
            </Link>
            <Link
              href="/admin/orders"
              className="text-xs bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              Orders
            </Link>
            <Link
              href="/admin/reviews"
              className="text-xs bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              Reviews
            </Link>
            <Link
              href="/admin/reports"
              className="text-xs bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              Reports
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-1 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Products</p>
              <Package className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Products</p>
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
          </div>

          <Link
            href="/admin/reports"
            className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:border-rose-200 hover:shadow-md transition-all flex flex-col items-center justify-center text-center"
          >
            <TrendingUp className="w-6 h-6 text-rose-600 mb-2" />
            <p className="text-sm font-bold text-gray-900">Live Reports</p>
            <p className="text-xs text-gray-500 mt-1">Revenue, orders, products & more</p>
          </Link>
        </div>

        {/* Product Management Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-serif font-bold text-gray-900">Product Management</h2>
              <p className="text-xs text-gray-500">Add, edit, filter, or manage visibility for your store items</p>
            </div>
            <button
              onClick={() => {
                setIsAddingProduct(!isAddingProduct);
                setEditingProduct(null);
                setFormData({
                  name: '', price: '', original_price: '', badge: '', categoryId: '', subcategoryId: '', stock_quantity: '10',
                  description: '', image_url: '', image_large: '', image_medium: '', image_thumbnail: '',
                  attributes: {},
                });
                setError('');
                setSuccess('');
              }}
              className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              <Plus className="w-4 h-4" /> {isAddingProduct ? 'Cancel' : 'Add Product'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-xs">
              {success}
            </div>
          )}

          {/* Add / Edit Product Form */}
          {isAddingProduct && (
            <div className="bg-gray-50 rounded-lg p-6 border mb-4">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                    required
                    placeholder="e.g., Handwoven Silk Saree"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                    required
                    min="0"
                    placeholder="1499"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Original Price / MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData({...formData, original_price: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                    min="0"
                    placeholder="2499"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Badge</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({...formData, badge: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder="e.g., 40% OFF"
                  />
                </div>
                <div className="md:col-span-2 border-t border-gray-200 pt-3 -mt-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Product Category
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '', attributes: {} })
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="">Select Category</option>
                    {topCategoryOptions.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.is_active ? '' : ' (inactive)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subcategory</label>
                  <select
                    value={formData.subcategoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, subcategoryId: e.target.value, attributes: {} })
                    }
                    disabled={!formData.categoryId || subcategoryOptions.length === 0}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {formData.categoryId && subcategoryOptions.length > 0
                        ? 'Select Subcategory (optional)'
                        : 'Not applicable'}
                    </option>
                    {subcategoryOptions.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}{sub.is_active ? '' : ' (inactive)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                    min="0"
                    placeholder="10"
                  />
                </div>
                {attributeSchema.length > 0 && (
                  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                    <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                      Product Attributes
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {attributeSchema.map((def) => {
                        const value = formData.attributes[def.key];
                        const setVal = (v: unknown) =>
                          setFormData((f) => ({
                            ...f,
                            attributes: { ...f.attributes, [def.key]: v },
                          }));
                        return (
                          <div key={def.key}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {def.label}
                              {def.required && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                            {def.type === 'text' && (
                              <input
                                type="text"
                                value={typeof value === 'string' ? value : ''}
                                onChange={(e) => setVal(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                                placeholder={def.placeholder}
                              />
                            )}
                            {def.type === 'number' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
                                  onChange={(e) => setVal(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                                  step="any"
                                />
                                {def.suffix && (
                                  <span className="text-xs text-gray-500 whitespace-nowrap">{def.suffix}</span>
                                )}
                              </div>
                            )}
                            {def.type === 'select' && (
                              <select
                                value={typeof value === 'string' ? value : ''}
                                onChange={(e) => setVal(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                              >
                                <option value="">{def.placeholder || 'Select...'}</option>
                                {(def.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}
                            {def.type === 'multi-select' && (
                              <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                {(def.options || []).map((opt) => {
                                  const arr = (Array.isArray(value) ? value : []) as string[];
                                  const checked = arr.includes(opt);
                                  return (
                                    <label key={opt} className="flex items-center gap-1.5 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setVal(
                                            checked ? arr.filter((v) => v !== opt) : [...arr, opt]
                                          );
                                        }}
                                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                      />
                                      {opt}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            {def.type === 'boolean' && (
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={value === true}
                                  onChange={(e) => setVal(e.target.checked)}
                                  className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                />
                                {def.placeholder || 'Yes'}
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product Image</label>
                  <ImageUpload
                    onImageUploaded={(urls) => {
                      setFormData({
                        ...formData,
                        image_url: urls.large,
                        image_large: urls.large,
                        image_medium: urls.medium,
                        image_thumbnail: urls.thumbnail,
                      });
                    }}
                    currentImage={formData.image_url}
                    folder="products"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none min-h-[80px]"
                    placeholder="Describe your product..."
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-rose-600 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingProduct(false);
                      setEditingProduct(null);
                    }}
                    className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-xs font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 🔎 Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value="All">All Categories</option>
              {topCategories.map((c: any) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product List Table */}
          {loading && !isAddingProduct ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-4"></div>
              Loading products...
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Subcategory</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((product) => {
                      const isInStock = (product.stock_quantity ?? 0) > 0;
                      return (
                        <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                                <img 
                                  src={product.image_medium || product.image_url || '/images/placeholder.jpg'} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                                  }}
                                />
                              </div>
                              <span className="font-semibold text-gray-900 line-clamp-1">{product.name}</span>
                            </div>
                          </td>

                          <td className="p-3 text-gray-500 font-medium">
                            {(() => {
                              const info = categoryInfoFor(product);
                              return info.top ? (
                                <span className="text-gray-700">{info.top}</span>
                              ) : (
                                <span className="text-gray-400 italic">Unassigned</span>
                              );
                            })()}
                          </td>

                          <td className="p-3 text-gray-500">
                            {(() => {
                              const info = categoryInfoFor(product);
                              return info.sub ?? <span className="text-gray-300">—</span>;
                            })()}
                          </td>

                          <td className="p-3 font-bold text-rose-600">₹{product.price?.toLocaleString() || '0'}</td>

                          {/* Status Toggle Switch */}
                          <td className="p-3">
                            <button
                              onClick={() => handleToggleStock(product)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${
                                isInStock
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-500 border border-gray-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isInStock ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                              {isInStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </td>

                          {/* Actions: View, Edit, Delete */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/products/${product.id}`}
                                title="View Product Page"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              <button
                                onClick={() => handleStartEdit(product)}
                                title="Edit Product"
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                title="Delete Product"
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                        No products found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 📄 Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-gray-500">
            <span>
              Showing {filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} items
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}