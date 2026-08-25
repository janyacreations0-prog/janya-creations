'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import ImageUpload from '@/components/admin/ImageUpload';
import { Plus, Pencil, Trash2, ArrowLeft, Circle, CheckCircle2, Layers } from 'lucide-react';
import type { Category } from '@/types';

interface FormState {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_id: string;
  is_active: boolean;
  sort_order: string;
  attributes: AttrForm[];
}

interface AttrForm {
  label: string;
  key: string;
  type: 'text' | 'number' | 'select' | 'multi-select' | 'boolean';
  required: boolean;
  suffix: string;
  options: string;
}

const ATTR_TYPES: AttrForm['type'][] = ['text', 'number', 'select', 'multi-select', 'boolean'];

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  parent_id: '',
  is_active: true,
  sort_order: '0',
  attributes: [],
};

function attrsToForm(attrs: any[] = []): AttrForm[] {
  return attrs.map((a) => ({
    label: a.label || '',
    key: a.key || '',
    type: (a.type as AttrForm['type']) || 'text',
    required: !!a.required,
    suffix: a.suffix || '',
    options: Array.isArray(a.options) ? a.options.join(', ') : '',
  }));
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [presetParentId, setPresetParentId] = useState<string>('');
  const [editingAttrIndex, setEditingAttrIndex] = useState<number | null>(null);

  const keyFromLabel = (label: string) =>
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const updateAttr = (idx: number, patch: Partial<AttrForm>) => {
    setForm((f) => {
      const next = [...f.attributes];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, attributes: next };
    });
  };

  const handleAttrLabelChange = (idx: number, label: string) => {
    const key = keyFromLabel(label);
    setForm((f) => {
      const next = [...f.attributes];
      next[idx] = { ...next[idx], label, key: next[idx].key || key };
      return { ...f, attributes: next };
    });
  };

  const addAttribute = () => {
    setForm((f) => ({
      ...f,
      attributes: [
        ...f.attributes,
        { label: '', key: '', type: 'text', required: false, suffix: '', options: '' },
      ],
    }));
    setEditingAttrIndex(form.attributes.length);
  };

  const removeAttribute = (idx: number) => {
    setForm((f) => ({ ...f, attributes: f.attributes.filter((_, i) => i !== idx) }));
    setEditingAttrIndex((cur) =>
      cur === null ? null : cur > idx ? cur - 1 : cur === idx ? null : cur
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [catRes, prodRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase.from('products').select('category_id'),
      ]);
      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;

      setCategories(catRes.data as Category[]);

      // Count products per category_id
      const counts: Record<string, number> = {};
      (prodRes.data || []).forEach((p: any) => {
        const cid = String(p.category_id);
        if (cid) counts[cid] = (counts[cid] || 0) + 1;
      });
      setProductCounts(counts);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived data
  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) =>
    categories.filter((c) => String(c.parent_id) === String(id));

  // --- Form handlers ---
  const openCreate = (parentId = '') => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, parent_id: parentId });
    setPresetParentId(parentId);
    setEditingAttrIndex(null);
    setFormOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(String(cat.id));
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
      is_active: cat.is_active,
      sort_order: String(cat.sort_order ?? 0),
      attributes: attrsToForm(cat.attribute_schema as any[]),
    });
    setPresetParentId('');
    setEditingAttrIndex(null);
    setFormOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slug || slugify(name),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Category name is required');
      return;
    }

    const slug = form.slug.trim() || slugify(form.name);

    // Validate attribute rows
    const seenKeys = new Set<string>();
    for (const attr of form.attributes) {
      if (!attr.key.trim() || !attr.label.trim()) {
        setError('Each attribute needs both a label and an internal key.');
        return;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(attr.key.trim())) {
        setError(`Attribute key "${attr.key}" must be lowercase letters, numbers and underscores (no spaces).`);
        return;
      }
      if (seenKeys.has(attr.key.trim())) {
        setError(`Duplicate attribute key: ${attr.key}`);
        return;
      }
      seenKeys.add(attr.key.trim());
      if ((attr.type === 'select' || attr.type === 'multi-select') && !attr.options.trim()) {
        setError(`"${attr.label}" needs at least one option.`);
        return;
      }
    }

    const attributeSchema = form.attributes.map((a) => {
      const def: any = {
        key: a.key.trim(),
        label: a.label.trim(),
        type: a.type,
        required: a.required,
      };
      if (a.type === 'select' || a.type === 'multi-select') {
        def.options = a.options.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (a.type === 'number' && a.suffix.trim()) {
        def.suffix = a.suffix.trim();
      }
      return def;
    });

    const payload = {
      name: form.name.trim(),
      slug,
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      parent_id: form.parent_id || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      attribute_schema: attributeSchema,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editingId);
        if (error) throw error;
        setSuccess('Category updated successfully');
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
        setSuccess('Category created successfully');
      }
      setFormOpen(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    }
  };

  const handleToggleActive = async (cat: Category) => {
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !cat.is_active })
        .eq('id', cat.id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    }
  };

  const handleDelete = async (cat: Category) => {
    const id = String(cat.id);
    const productCount = productCounts[id] || 0;
    const childCount = childrenOf(id).length;

    if (productCount > 0) {
      setError(`This category contains ${productCount} product(s). Please reassign the products before deleting.`);
      return;
    }
    if (childCount > 0) {
      setError(`This category contains ${childCount} subcategory(s). Delete or reassign them before deleting this category.`);
      return;
    }
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Category deleted');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    }
  };

  // --- Render helpers ---
  const renderCategoryRow = (cat: Category, depth = 0) => {
    const id = String(cat.id);
    const children = childrenOf(id);
    return (
      <div key={id}>
        <div
          className={`flex items-center gap-3 py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm ${
            depth > 0 ? 'ml-8 border-l-2 border-gray-100' : ''
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${depth === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                {cat.name}
              </span>
              {cat.is_active ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Circle className="w-3 h-3" /> Inactive
                </span>
              )}
            </div>
            <code className="text-xs text-gray-400">/{cat.slug}</code>
          </div>

          <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">
            {productCounts[id] || 0} product{(productCounts[id] || 0) !== 1 ? 's' : ''}
          </span>

          <button
            onClick={() => handleToggleActive(cat)}
            className="text-xs text-gray-500 hover:text-rose-600 px-2 py-1 rounded transition-colors"
            title={cat.is_active ? 'Deactivate' : 'Activate'}
          >
            {cat.is_active ? 'Deactivate' : 'Activate'}
          </button>

          <button
            onClick={() => openEdit(cat)}
            className="text-xs text-gray-500 hover:text-rose-600 px-2 py-1 rounded transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleDelete(cat)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {depth === 0 && children.length > 0 && (
          <div>
            {children.map((child) => renderCategoryRow(child, 1))}
          </div>
        )}
      </div>
    );
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage categories, subcategories, and their display order
              </p>
            </div>
          </div>
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{success}</div>
        )}

        {/* Category tree */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No categories yet. Create your first category.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {topLevel.map((cat) => renderCategoryRow(cat))}
          </div>
        )}

        {/* Add Subcategory buttons per top-level */}
        {!loading && topLevel.length > 0 && (
          <div className="mt-6 space-y-2">
            {topLevel.map((cat) => (
              <button
                key={cat.id}
                onClick={() => openCreate(String(cat.id))}
                className="text-sm text-rose-600 hover:text-rose-700 font-medium transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Subcategory under {cat.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Create / Edit Form */}
        {formOpen && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Category' : 'New Category'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="auto-generated from name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                  <select
                    value={form.parent_id}
                    onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  >
                    <option value="">— Top-level —</option>
                    {topLevel.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  Active
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
                <ImageUpload
                  folder="categories"
                  onImageUploaded={(urls) => {
                    setForm((f) => ({ ...f, image_url: urls.medium || urls.large || urls.original || '' }));
                  }}
                />
                {form.image_url && (
                  <p className="mt-1 text-xs text-gray-500 truncate">Current: {form.image_url}</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Product Attributes</label>
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                  >
                    + Add Attribute
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  These fields appear on the product form for products in this category.
                </p>

                {form.attributes.length === 0 ? (
                  <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-4 text-center">
                    No attributes configured. Click "+ Add Attribute".
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.attributes.map((attr, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3">
                        {editingAttrIndex === idx ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Label</label>
                                <input
                                  type="text"
                                  value={attr.label}
                                  onChange={(e) => handleAttrLabelChange(idx, e.target.value)}
                                  placeholder="e.g. Material"
                                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Type</label>
                                <select
                                  value={attr.type}
                                  onChange={(e) =>
                                    updateAttr(idx, { type: e.target.value as AttrForm['type'] })
                                  }
                                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                >
                                  {ATTR_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                  Internal key <span className="text-gray-400">(auto-generated from label — edit if needed)</span>
                                </label>
                                <input
                                  type="text"
                                  value={attr.key}
                                  onChange={(e) => updateAttr(idx, { key: e.target.value })}
                                  placeholder="e.g. material"
                                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                              </div>
                              {attr.type === 'number' ? (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Unit / suffix</label>
                                  <input
                                    type="text"
                                    value={attr.suffix}
                                    onChange={(e) => updateAttr(idx, { suffix: e.target.value })}
                                    placeholder="e.g. g"
                                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                  />
                                </div>
                              ) : null}
                            </div>
                            {(attr.type === 'select' || attr.type === 'multi-select') && (
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                  Options <span className="text-gray-400">(comma separated)</span>
                                </label>
                                <input
                                  type="text"
                                  value={attr.options}
                                  onChange={(e) => updateAttr(idx, { options: e.target.value })}
                                  placeholder="e.g. Gold Plated, Alloy, Brass"
                                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={attr.required}
                                  onChange={(e) => updateAttr(idx, { required: e.target.checked })}
                                  className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                />
                                Required field
                              </label>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setEditingAttrIndex(null)}
                                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                                >
                                  Done
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeAttribute(idx)}
                                  className="text-xs text-red-400 hover:text-red-600 font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900">{attr.label || '(unnamed attribute)'}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Type: <span className="capitalize">{attr.type}</span>
                                {attr.required ? ' · Required: Yes' : ' · Required: No'}
                                {attr.type === 'number' && attr.suffix ? ` · Unit: ${attr.suffix}` : ''}
                                {attr.type === 'select' || attr.type === 'multi-select'
                                  ? ` · Options: ${attr.options || '(none)'}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingAttrIndex(idx)}
                                className="text-xs text-gray-500 hover:text-rose-600 font-medium px-2 py-1 rounded"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAttribute(idx)}
                                className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {editingId ? 'Update Category' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}