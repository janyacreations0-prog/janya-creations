'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ProductImageGallery, { type GalleryImage } from '@/components/admin/ProductImageGallery';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast, { type ToastData } from '@/components/admin/Toast';
import AddCategoryModal from '@/components/admin/AddCategoryModal';
import AddAttributeValueModal from '@/components/admin/AddAttributeValueModal';
import type { Category } from '@/types';
import { 
  ShieldCheck, Package, ShoppingBag, LogOut, TrendingUp,
  Plus, Trash2, Edit2, Eye, Search, ChevronLeft, ChevronRight,
  IndianRupee, Users, AlertTriangle, Loader2, ArrowUp, ArrowDown,
  ArrowUpDown, X, CheckSquare
} from 'lucide-react';
import { saveProduct } from '@/lib/admin-actions';
import { mergeAttributeSchemas } from '@/lib/categories';
import { parseSizes, FREE_SIZE } from '@/lib/sizes';
import type { CategoryAttributeDefinition, SizeOption } from '@/types';

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

const ITEMS_PER_PAGE = 20;
const AUTO_BADGE_PATTERN = /^\d+\s*%\s*OFF$/i;

type SortKey = 'name' | 'category' | 'subcategory' | 'price' | 'stock' | 'created';
type SortDir = 'asc' | 'desc';

type DeleteTarget =
  | { kind: 'single'; product: Product }
  | { kind: 'bulk'; ids: string[] };

interface AttrModalState {
  key: string;
  label: string;
  options: string[];
  targetCategoryId: string;
  attributeSchema: CategoryAttributeDefinition[];
}

function emptyForm() {
  return {
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
    gallery: [] as GalleryImage[],
    sizes: [] as SizeOption[],
    attributes: {} as Record<string, unknown>,
  };
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // 🔍 Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Categories (dynamic, database-backed)
  const [categories, setCategories] = useState<any[]>([]);

  // 📄 Database-level Pagination + Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ✅ Bulk selection (survives pagination/search/filter — id-based)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state + unsaved-changes guard
  const [formData, setFormData] = useState(emptyForm());
  const formSnapshotRef = useRef<string>('');
  const [formDirty, setFormDirty] = useState(false);
  const pendingStartEditRef = useRef<Product | null>(null);

  // Re-entry guards — refs (not just state) so rapid double-submits are blocked
  const savingRef = useRef(false);
  const deletingRef = useRef(false);

  // Delete confirmation (single + bulk) and discard-changes confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState(false);

  // Feedback
  const [toast, setToast] = useState<ToastData | null>(null);

  // Quick-add modals (category / subcategory / attribute value)
  const [categoryModal, setCategoryModal] = useState<{ parentId: string; parentName?: string } | null>(null);
  const [attrModal, setAttrModal] = useState<AttrModalState | null>(null);

  // Row-level busy state for the stock toggle
  const [busyStockId, setBusyStockId] = useState<string | null>(null);

  // Real ecommerce KPIs (fetched from live data — never dummy)
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    orders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    products: 0,
    lowStock: 0,
    outOfStock: 0,
    customers: 0,
  });

  // Derived category helpers
  const topCategories = categories.filter((c: any) => !c.parent_id);

  const showToast = useCallback((type: ToastData['type'], message: string) => {
    setToast({ type, message });
  }, []);

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

  // Live discount % derived from MRP and selling price
  const discountPreview = useMemo(() => {
    const mrp = Number(formData.original_price) || 0;
    const sale = Number(formData.price) || 0;
    if (mrp > 0 && sale > 0 && sale < mrp) {
      const pct = Math.round(((mrp - sale) / mrp) * 100);
      return { pct, save: mrp - sale, invalid: false };
    }
    if (mrp > 0 && sale > mrp) {
      return { pct: 0, save: 0, invalid: true };
    }
    return { pct: 0, save: 0, invalid: false };
  }, [formData.price, formData.original_price]);

  // When price/MRP change, auto-fill the discount badge (unless the admin set
  // a custom badge that isn't the auto "X% OFF" pattern).
  const handlePriceChange = (field: 'price' | 'original_price', value: string) => {
    setFormData((f) => {
      const next = { ...f, [field]: value };
      const mrp = Number(next.original_price) || 0;
      const sale = Number(next.price) || 0;
      const currentBadge = (next.badge || '').trim();
      const isAuto = !currentBadge || AUTO_BADGE_PATTERN.test(currentBadge);
      if (isAuto) {
        if (mrp > 0 && sale > 0 && sale < mrp) {
          next.badge = `${Math.round(((mrp - sale) / mrp) * 100)}% OFF`;
        } else {
          next.badge = '';
        }
      }
      return next;
    });
  };

  // Track unsaved form changes against the last known good snapshot.
  useEffect(() => {
    setFormDirty(formSnapshotRef.current !== JSON.stringify(formData));
  }, [formData]);

  const updateSize = (index: number, patch: Partial<SizeOption>) => {
    setFormData((f) => {
      const sizes = f.sizes.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...f, sizes };
    });
  };

  const addSize = (value = '', stock = 0) => {
    setFormData((f) => ({ ...f, sizes: [...f.sizes, { value, stock }] }));
  };

  const addFreeSize = () => {
    setFormData((f) => {
      if (f.sizes.some((s) => s.value === FREE_SIZE)) return f;
      return { ...f, sizes: [...f.sizes, { value: FREE_SIZE, stock: 0 }] };
    });
  };

  const removeSize = (index: number) => {
    setFormData((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== index) }));
  };

  // ── Quick-add handlers ─────────────────────────────────────────────────────

  /** Category/subcategory created → refresh dropdowns + select it. */
  const handleCategoryCreated = (categoryId: string) => {
    const modal = categoryModal;
    if (!modal) return;
    loadCategories();
    if (modal.parentId) {
      // Subcategory created → set parent + new leaf.
      setFormData((f) => ({
        ...f,
        categoryId: modal.parentId,
        subcategoryId: categoryId,
        attributes: {},
      }));
      showToast('success', '✅ Subcategory added.');
    } else {
      setFormData((f) => ({
        ...f,
        categoryId: categoryId,
        subcategoryId: '',
        attributes: {},
      }));
      showToast('success', '✅ Category added.');
    }
    setCategoryModal(null);
  };

  /**
   * Resolves which category holds the attribute definition (leaf, or its parent
   * when the attribute is shared), then opens the quick-add modal.
   */
  const openAttributeModal = (def: CategoryAttributeDefinition) => {
    const leafId = formData.subcategoryId || formData.categoryId;
    if (!leafId) {
      showToast('error', 'Select a category first.');
      return;
    }
    const leaf = categories.find((c: any) => String(c.id) === String(leafId));
    let target = leaf;
    if (leaf?.parent_id) {
      const parent = categories.find((c: any) => String(c.id) === String(leaf.parent_id));
      const leafHasKey = (leaf.attribute_schema || []).some((a: any) => a.key === def.key);
      if (!leafHasKey && parent && (parent.attribute_schema || []).some((a: any) => a.key === def.key)) {
        target = parent;
      }
    }
    if (!target) {
      showToast('error', 'Select a category first.');
      return;
    }
    setAttrModal({
      key: def.key,
      label: def.label,
      options: def.options || [],
      targetCategoryId: String(target.id),
      attributeSchema: (target.attribute_schema || []) as CategoryAttributeDefinition[],
    });
  };

  /** Attribute value created → refresh local schema + select the new value. */
  const handleAttributeValueCreated = (value: string) => {
    const modal = attrModal;
    if (!modal) return;

    // Update the local categories state so the dropdown options refresh
    // without a full reload (keeps all other product form fields intact).
    setCategories((prev) =>
      prev.map((c: any) => {
        if (String(c.id) !== modal.targetCategoryId) return c;
        const schema = (c.attribute_schema || []).map((a: any) => ({ ...a }));
        const def = schema.find((a: any) => a.key === modal.key);
        if (def) {
          if (def.type === 'select' || def.type === 'multi-select') {
            def.options = [...(def.options || []), value];
          }
        } else {
          schema.push({
            key: modal.key,
            label: modal.label,
            type: 'select',
            options: [value],
            required: false,
          });
        }
        return { ...c, attribute_schema: schema };
      })
    );

    // Auto-select the newly created value.
    setFormData((f) => {
      const cur = f.attributes[modal.key];
      if (Array.isArray(cur)) {
        return { ...f, attributes: { ...f.attributes, [modal.key]: [...cur, value] } };
      }
      return { ...f, attributes: { ...f.attributes, [modal.key]: value } };
    });

    showToast('success', `✅ ${modal.label} "${value}" added.`);
    setAttrModal(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/admin/login');
    } else {
      setIsAuthLoading(false);
      loadCategories();
      loadKpis();
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

  // Real KPIs computed from live tables (orders/products/profiles).
  const loadKpis = useCallback(async () => {
    try {
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase.from('orders').select('id, total_amount, payment_status'),
        supabase.from('products').select('id, stock_quantity'),
        supabase.from('profiles').select('id').eq('role', 'customer'),
      ]);
      const orders = (ordersRes.data || []) as any[];
      const paidOrders = orders.filter((o: any) => o.payment_status === 'paid');
      const pendingOrders = orders.filter((o: any) => o.payment_status === 'pending');
      const revenue = paidOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const products = (productsRes.data || []) as any[];
      setKpis({
        totalRevenue: Math.round(revenue),
        orders: orders.length,
        paidOrders: paidOrders.length,
        pendingOrders: pendingOrders.length,
        products: products.length,
        lowStock: products.filter((p: any) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5).length,
        outOfStock: products.filter((p: any) => (p.stock_quantity ?? 0) <= 0).length,
        customers: customersRes.data?.length || 0,
      });
    } catch (err: any) {
      console.error('Error loading KPIs:', err);
    }
  }, [supabase]);

  // Database-level paginated listing with search, category filtering and
  // sorting applied on the server (Supabase) — no client-side slicing.
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Category/subcategory sorts need the categories relation embedded.
      const needsJoin = sortKey === 'category' || sortKey === 'subcategory';
      let query = needsJoin
        ? supabase
            .from('products')
            .select('*, categories(name, parent:categories(name))', { count: 'exact' })
        : supabase
            .from('products')
            .select('*', { count: 'exact' });

      const q = debouncedSearch.trim();
      if (q) {
        query = query.or(`name.ilike.%${q}%,title.ilike.%${q}%`);
      }

      if (selectedCategory !== 'All') {
        const topId = selectedCategory;
        const childIds = categories
          .filter((c: any) => String(c.parent_id) === topId)
          .map((c: any) => String(c.id));
        query = query.in('category_id', [topId, ...childIds]);
      }

      const orderCol =
        sortKey === 'category' ? 'categories(parent(name))'
        : sortKey === 'subcategory' ? 'categories(name)'
        : sortKey === 'stock' ? 'stock_quantity'
        : sortKey === 'created' ? 'created_at'
        : sortKey; // 'name' | 'price'

      query = query.order(orderCol, { ascending: sortDir === 'asc' });

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const { data, count, error } = await query.range(from, from + ITEMS_PER_PAGE - 1);

      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error loading products:', err);
      showToast('error', 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [supabase, debouncedSearch, selectedCategory, currentPage, categories, sortKey, sortDir, showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const handleSort = (key: SortKey) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key && d === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

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

  // 3. Status Toggle Handler (Supabase Update)
  const handleToggleStock = async (product: Product) => {
    if (busyStockId) return;
    setBusyStockId(product.id);
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
      showToast('success', `✅ Stock updated — ${newStock > 0 ? 'In Stock' : 'Out of Stock'}.`);
    } catch (err: any) {
      showToast('error', 'Failed to update stock status.');
    } finally {
      setBusyStockId(null);
    }
  };

  // 4. Populate form for Editing
  const beginEdit = async (product: Product) => {
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

    // Load the product's gallery images (up to 4)
    let gallery: GalleryImage[] = [];
    try {
      const { data: galleryRows, error: gErr } = await supabase
        .from('product_images')
        .select('id, original_url, large_url, medium_url, thumbnail_url')
        .eq('product_id', product.id)
        .order('position', { ascending: true });
      if (!gErr && galleryRows) {
        gallery = galleryRows.map((r: any) => ({
          key: `${r.id}`,
          original: r.original_url || '',
          large: r.large_url || '',
          medium: r.medium_url || '',
          thumbnail: r.thumbnail_url || '',
        }));
      }
    } catch {
      // gallery stays empty — legacy single image columns still shown below
    }

    const nextForm = {
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
      gallery,
      sizes: parseSizes(product.attributes),
      attributes,
    };
    setFormData(nextForm);
    formSnapshotRef.current = JSON.stringify(nextForm);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleStartEdit = (product: Product) => {
    // Never silently discard unsaved edits — confirm first.
    if (formDirty && isAddingProduct) {
      pendingStartEditRef.current = product;
      setDiscardConfirm(true);
      return;
    }
    beginEdit(product);
  };

  const closeForm = () => {
    setIsAddingProduct(false);
    setEditingProduct(null);
    setFormData(emptyForm());
    formSnapshotRef.current = JSON.stringify(emptyForm());
    pendingStartEditRef.current = null;
  };

  const handleCancelForm = () => {
    if (formDirty) {
      pendingStartEditRef.current = null;
      setDiscardConfirm(true);
      return;
    }
    closeForm();
  };

  const handleDiscardConfirmed = () => {
    setDiscardConfirm(false);
    const pending = pendingStartEditRef.current;
    if (pending) {
      pendingStartEditRef.current = null;
      beginEdit(pending);
    } else {
      closeForm();
    }
  };

  // 5. Add / Update Product Submit
  const handleSaveProduct = async (e?: React.FormEvent, keepOpen = false) => {
    e?.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setToast(null);
    setSaving(true);

    try {
      // Reject selling price exceeding MRP before hitting the server.
      const mrpForSave = formData.original_price ? Number(formData.original_price) : 0;
      const saleForSave = Number(formData.price) || 0;
      if (mrpForSave > 0 && saleForSave > mrpForSave) {
        showToast('error', 'Selling price cannot be greater than the original price (MRP).');
        return;
      }

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
        gallery: formData.gallery.map(({ original, large, medium, thumbnail }) => ({
          original, large, medium, thumbnail,
        })),
        sizes: formData.sizes.map((s) => ({ value: s.value, stock: s.stock })),
        attributes,
        legacyCategoryName: editingProduct ? undefined : topCategory?.name,
      });

      if (!result.success) {
        showToast('error', result.error || 'Failed to save product');
        return;
      }

      showToast('success', editingProduct ? '✅ Product updated successfully!' : '✅ Product added successfully!');

      if (keepOpen) {
        // Stay in the form for rapid entry of the next product.
        setFormData(emptyForm());
        formSnapshotRef.current = JSON.stringify(emptyForm());
        setEditingProduct(null);
      } else {
        closeForm();
      }
      await Promise.all([loadProducts(), loadKpis()]);

    } catch (err: any) {
      showToast('error', err.message || 'Failed to save product');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // 6. Delete (single + bulk) via the custom confirmation modal
  const requestDeleteSingle = (product: Product) => {
    setDeleteConfirm({ kind: 'single', product });
  };

  const requestDeleteBulk = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setDeleteConfirm({ kind: 'bulk', ids });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm || deleting || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      if (deleteConfirm.kind === 'single') {
        const { id } = deleteConfirm.product;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast('success', '✅ Product deleted successfully!');
      } else {
        const ids = deleteConfirm.ids;
        const { error } = await supabase.from('products').delete().in('id', ids);
        if (error) throw error;
        setSelectedIds(prev => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        showToast('success', `✅ ${ids.length} product${ids.length !== 1 ? 's' : ''} deleted.`);
      }

      // Close only after a successful deletion.
      setDeleteConfirm(null);
      await Promise.all([loadProducts(), loadKpis()]);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete product(s).');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  // 7. Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected =
    products.length > 0 && products.every((p) => selectedIds.has(String(p.id)));

  const handleToggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        products.forEach((p) => next.delete(String(p.id)));
      } else {
        products.forEach((p) => next.add(String(p.id)));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // 8. Sortable table header
  const sortableHeader = (key: SortKey, label: string, align: 'left' | 'center' = 'left') => {
    const active = sortKey === key;
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th className={`p-3 ${align === 'center' ? 'text-center' : ''}`}>
        <button
          type="button"
          onClick={() => handleSort(key)}
          className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded ${
            active ? 'text-rose-600' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label={`Sort by ${label}${active ? `, currently ${sortDir}ending` : ''}`}
          title={`Sort by ${label}`}
        >
          {label}
          <Icon className={`w-3 h-3 ${active ? 'text-rose-500' : 'text-gray-300'}`} />
        </button>
      </th>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const deleteDialogProps = deleteConfirm
    ? deleteConfirm.kind === 'single'
      ? {
          title: 'Delete Product?',
          message: (
            <>
              Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm.product.name}</span>? This action cannot be undone.
            </>
          ),
          confirmLabel: 'Delete Product',
        }
      : {
          title: 'Delete Selected Products?',
          message: (
            <>
              You are about to delete <span className="font-semibold text-gray-900">{deleteConfirm.ids.length}</span> product{deleteConfirm.ids.length !== 1 ? 's' : ''}. This action cannot be undone.
            </>
          ),
          confirmLabel: `Delete ${deleteConfirm.ids.length} Product${deleteConfirm.ids.length !== 1 ? 's' : ''}`,
        }
    : null;

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
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-1 space-y-6">
        {/* Real ecommerce KPI cards — live data, no placeholders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Revenue</p>
              <IndianRupee className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{money(kpis.totalRevenue)}</p>
            <p className="text-[11px] text-gray-400 mt-1">{kpis.paidOrders} paid order{kpis.paidOrders !== 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase">Orders</p>
              <ShoppingBag className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.orders}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {kpis.pendingOrders} pending · {kpis.paidOrders} paid
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase">Products</p>
              <Package className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.products}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {kpis.lowStock > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="w-3 h-3" /> {kpis.lowStock} low
                </span>
              )}{' '}
              {kpis.outOfStock > 0 && <span className="text-rose-500">{kpis.outOfStock} out</span>}
              {kpis.lowStock === 0 && kpis.outOfStock === 0 && 'Healthy stock'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase">Customers</p>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{kpis.customers}</p>
            <p className="text-[11px] text-gray-400 mt-1">Registered customers</p>
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
                if (isAddingProduct) {
                  handleCancelForm();
                } else {
                  setIsAddingProduct(true);
                  setEditingProduct(null);
                  setFormData(emptyForm());
                  formSnapshotRef.current = JSON.stringify(emptyForm());
                  setToast(null);
                }
              }}
              className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-rose-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
            >
              <Plus className="w-4 h-4" /> {isAddingProduct ? 'Cancel' : 'Add Product'}
            </button>
          </div>

          {/* Add / Edit Product Form */}
          {isAddingProduct && (
            <div className="bg-gray-50 rounded-lg p-6 border mb-4">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <form onSubmit={(e) => handleSaveProduct(e, false)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                    required
                    autoFocus
                    placeholder="e.g., Handwoven Silk Saree"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handlePriceChange('price', e.target.value)}
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
                    onChange={(e) => handlePriceChange('original_price', e.target.value)}
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
                    placeholder="Auto: e.g., 40% OFF"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {discountPreview.invalid ? (
                      <span className="text-rose-600 font-medium">
                        ⚠ Selling price must be less than or equal to MRP.
                      </span>
                    ) : discountPreview.pct > 0 ? (
                      <span className="text-emerald-600 font-medium">
                        ✓ Auto: {discountPreview.pct}% OFF (save {money(discountPreview.save)})
                      </span>
                    ) : (
                      'Discount % is calculated automatically from MRP & price.'
                    )}
                  </p>
                </div>
                <div className="md:col-span-2 border-t border-gray-200 pt-3 -mt-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Product Category
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '', attributes: {} })
                      }
                      className="flex-1 p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                    >
                      <option value="">Select Category</option>
                      {topCategoryOptions.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.is_active ? '' : ' (inactive)'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCategoryModal({ parentId: '' })}
                      title="Add Category"
                      aria-label="Add Category"
                      className="flex-shrink-0 inline-flex items-center justify-center w-9 p-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subcategory</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.subcategoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, subcategoryId: e.target.value, attributes: {} })
                      }
                      disabled={!formData.categoryId || subcategoryOptions.length === 0}
                      className="flex-1 p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    <button
                      type="button"
                      onClick={() => {
                        const parent = categories.find(
                          (c: any) => String(c.id) === String(formData.categoryId)
                        );
                        setCategoryModal({
                          parentId: formData.categoryId,
                          parentName: parent?.name,
                        });
                      }}
                      disabled={!formData.categoryId}
                      title={!formData.categoryId ? 'Select a category first' : 'Add Subcategory'}
                      aria-label="Add Subcategory"
                      className="flex-shrink-0 inline-flex items-center justify-center w-9 p-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
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
                <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Sizes / Options
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Optional. Add the sizes this product actually offers (e.g. XS, M, L, Free Size).
                        "Free Size" is available for every category. Leave empty to disable variants.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addFreeSize}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        + Free Size
                      </button>
                      <button
                        type="button"
                        onClick={() => addSize()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Size
                      </button>
                    </div>
                  </div>

                  {formData.sizes.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No sizes configured — this product has no size options.</p>
                  ) : (
                    <div className="space-y-2">
                      {formData.sizes.map((size, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={size.value}
                            onChange={(e) => updateSize(idx, { value: e.target.value })}
                            placeholder={FREE_SIZE}
                            aria-label={`Size option ${idx + 1} name`}
                            className="w-48 p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                          />
                          <input
                            type="number"
                            value={size.stock}
                            onChange={(e) => updateSize(idx, { stock: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                            min="0"
                            aria-label={`${size.value || `Option ${idx + 1}`} stock`}
                            placeholder="Stock"
                            className="w-24 p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                          />
                          <span className="text-[11px] text-gray-400">units</span>
                          <button
                            type="button"
                            onClick={() => removeSize(idx)}
                            aria-label={`Remove ${size.value || `option ${idx + 1}`}`}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                              <div className="flex gap-2">
                                <select
                                  value={typeof value === 'string' ? value : ''}
                                  onChange={(e) => setVal(e.target.value)}
                                  className="flex-1 p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                                >
                                  <option value="">{def.placeholder || 'Select...'}</option>
                                  {(def.options || []).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => openAttributeModal(def)}
                                  title={`Add ${def.label}`}
                                  aria-label={`Add ${def.label}`}
                                  className="flex-shrink-0 inline-flex items-center justify-center w-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            {def.type === 'multi-select' && (
                              <div>
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
                                <button
                                  type="button"
                                  onClick={() => openAttributeModal(def)}
                                  title={`Add ${def.label}`}
                                  aria-label={`Add ${def.label}`}
                                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add {def.label}
                                </button>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Product Images <span className="text-gray-400 font-normal">(up to 4)</span>
                  </label>
                  <ProductImageGallery
                    images={formData.gallery}
                    onChange={(gallery) => setFormData((f) => ({ ...f, gallery }))}
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
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-rose-600 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveProduct(undefined, true)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                    title="Save this product and start entering the next one"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Saving...' : 'Save & Add Another'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    disabled={saving}
                    className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-xs font-semibold hover:bg-gray-300 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
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
                className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
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

          {/* Bulk selection bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-3 bg-rose-50/70 border border-rose-100 rounded-lg px-4 py-2.5">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-rose-600" />
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={requestDeleteBulk}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}

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
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={handleToggleSelectAll}
                        aria-label="Select all products on this page"
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                    </th>
                    {sortableHeader('name', 'Product')}
                    {sortableHeader('category', 'Category')}
                    {sortableHeader('subcategory', 'Subcategory')}
                    {sortableHeader('price', 'Price')}
                    {sortableHeader('stock', 'Status')}
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {products.length > 0 ? (
                    products.map((product) => {
                      const isInStock = (product.stock_quantity ?? 0) > 0;
                      const isSelected = selectedIds.has(String(product.id));
                      return (
                        <tr key={product.id} className={`hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-rose-50/40' : ''}`}>
                          <td className="p-3 w-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(String(product.id))}
                              aria-label={`Select ${product.name}`}
                              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                            />
                          </td>
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
                              disabled={busyStockId === product.id}
                              aria-label={`${isInStock ? 'Mark' : 'Mark'} ${product.name} ${isInStock ? 'out of' : 'in'} stock`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                                isInStock
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 focus-visible:ring-emerald-500'
                                  : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 focus-visible:ring-gray-400'
                              } disabled:opacity-50 disabled:cursor-wait`}
                            >
                              {busyStockId === product.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${isInStock ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                              )}
                              {isInStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </td>

                          {/* Actions: View, Edit, Delete */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                href={`/products/${product.id}`}
                                aria-label={`View ${product.name}`}
                                title="View Product Page"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              <button
                                onClick={() => handleStartEdit(product)}
                                aria-label={`Edit ${product.name}`}
                                title="Edit Product"
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => requestDeleteSingle(product)}
                                aria-label={`Delete ${product.name}`}
                                title="Delete Product"
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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
                      <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                        No products found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 📄 Pagination Footer — database-level totals */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-gray-500">
            <span>
              Showing {totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} items
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Delete confirmation modal (single + bulk) */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title={deleteDialogProps?.title ?? ''}
        message={deleteDialogProps?.message ?? null}
        confirmLabel={deleteDialogProps?.confirmLabel ?? 'Delete'}
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setDeleteConfirm(null)}
      />

      {/* Discard unsaved changes modal */}
      <ConfirmDialog
        open={discardConfirm}
        title="Discard changes?"
        message="You have unsaved changes in the product form. If you continue, these changes will be lost."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        destructive={false}
        loading={false}
        onConfirm={handleDiscardConfirmed}
        onCancel={() => {
          setDiscardConfirm(false);
          pendingStartEditRef.current = null;
        }}
      />

      {/* Quick-add: Category / Subcategory */}
      <AddCategoryModal
        open={categoryModal !== null}
        onClose={() => setCategoryModal(null)}
        categories={categories as Category[]}
        parentId={categoryModal?.parentId ?? ''}
        parentName={categoryModal?.parentName}
        onCreated={handleCategoryCreated}
      />

      {/* Quick-add: attribute value (Material, Colour, etc.) */}
      {attrModal && (
        <AddAttributeValueModal
          open
          onClose={() => setAttrModal(null)}
          attributeLabel={attrModal.label}
          attributeKey={attrModal.key}
          currentOptions={attrModal.options}
          targetCategoryId={attrModal.targetCategoryId}
          attributeSchema={attrModal.attributeSchema}
          onCreated={handleAttributeValueCreated}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
