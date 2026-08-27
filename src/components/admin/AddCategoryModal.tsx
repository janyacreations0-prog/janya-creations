'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { revalidateCategoryData } from '@/lib/revalidate-categories';
import { slugify } from '@/lib/utils';
import ImageUpload from '@/components/admin/ImageUpload';
import type { Category } from '@/types';

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** When set, the new category is created as a subcategory of this parent. */
  parentId?: string;
  parentName?: string;
  /** Called with the new category id after successful creation. */
  onCreated: (categoryId: string) => void;
}

/**
 * In-app modal for quick-adding a category (or a subcategory when a parent is
 * selected). Uses the existing categories table + RLS (admin writes). The
 * product form is never reloaded — the caller refreshes its dropdowns.
 */
export default function AddCategoryModal({
  open,
  onClose,
  categories,
  parentId = '',
  parentName,
  onCreated,
}: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setImageUrl('');
    setError('');
    setSaving(false);
    savingRef.current = false;
    const t = setTimeout(() => nameInputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const isSubcategory = Boolean(parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Category name is required.');
      return;
    }

    // Case-insensitive duplicate detection at the same hierarchy level.
    const siblings = categories.filter((c) =>
      isSubcategory
        ? String(c.parent_id) === String(parentId)
        : !c.parent_id
    );
    const duplicate = siblings.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError(
        isSubcategory
          ? 'Subcategory already exists under this category.'
          : 'Category already exists.'
      );
      return;
    }

    // Unique slug derived from the name.
    const base = slugify(trimmed);
    let slug = base;
    let n = 2;
    const slugs = new Set(categories.map((c) => c.slug.toLowerCase()));
    while (slugs.has(slug.toLowerCase())) {
      slug = `${base}-${n}`;
      n++;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const supabase = createClient();
      const maxOrder = categories
        .filter((c) =>
          isSubcategory
            ? String(c.parent_id) === String(parentId)
            : !c.parent_id
        )
        .reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);

      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          name: trimmed,
          slug,
          description: description.trim() || null,
          image_url: imageUrl || null,
          parent_id: parentId || null,
          is_active: true,
          sort_order: maxOrder + 1,
          attribute_schema: [],
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      await revalidateCategoryData();
      onCreated(String(data.id));
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create category.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-category-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 id="add-category-title" className="text-base font-bold text-gray-900">
              {isSubcategory ? 'Add New Subcategory' : 'Add New Category'}
            </h3>
            {isSubcategory && parentName && (
              <p className="text-xs text-gray-500 mt-0.5">Under {parentName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              placeholder="e.g. Bangles"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-y"
              placeholder="Optional short description"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category Image
            </label>
            <ImageUpload
              folder="categories"
              onImageUploaded={(urls) => {
                setImageUrl(urls.medium || urls.large || urls.original || '');
              }}
            />
            {imageUrl && (
              <p className="mt-1 text-xs text-gray-500 truncate">Uploaded ✓</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving
                ? 'Creating...'
                : isSubcategory
                  ? 'Create Subcategory'
                  : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
