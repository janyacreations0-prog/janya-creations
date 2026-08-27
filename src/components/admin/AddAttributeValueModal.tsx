'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { revalidateCategoryData } from '@/lib/revalidate-categories';
import type { CategoryAttributeDefinition } from '@/types';

interface AddAttributeValueModalProps {
  open: boolean;
  onClose: () => void;
  /** Label shown in the title/duplicate message (e.g. "Material"). */
  attributeLabel: string;
  /** The schema key (e.g. "material"). */
  attributeKey: string;
  /** Current visible options for duplicate detection. */
  currentOptions: string[];
  /** Category whose attribute_schema receives the new value. */
  targetCategoryId: string;
  /** Snapshot of that category's attribute_schema. */
  attributeSchema: CategoryAttributeDefinition[];
  /** Called with the created value so the form can select it. */
  onCreated: (value: string) => void;
}

/**
 * In-app modal for quick-adding a new option value to a product attribute
 * (e.g. a new Material). Persists by appending to the category's
 * attribute_schema.options — the existing master-data architecture. The product
 * form is never reloaded.
 */
export default function AddAttributeValueModal({
  open,
  onClose,
  attributeLabel,
  attributeKey,
  currentOptions,
  targetCategoryId,
  attributeSchema,
  onCreated,
}: AddAttributeValueModalProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue('');
    setError('');
    setSaving(false);
    savingRef.current = false;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, attributeLabel, attributeKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    setError('');

    const trimmed = value.trim();
    if (!trimmed) {
      setError('Value is required.');
      return;
    }

    // Case-insensitive duplicate detection against the currently visible options.
    const duplicate = (currentOptions || []).some(
      (o) => o.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError(`${attributeLabel} already exists.`);
      return;
    }

    // Append to the target category's attribute_schema (or add the attribute).
    const schema = (attributeSchema || []).map((a) => ({ ...a }));
    const def = schema.find((a) => a.key === attributeKey);
    if (def) {
      if (def.type === 'select' || def.type === 'multi-select') {
        def.options = [...(def.options || []), trimmed];
      } else {
        setError('This attribute does not accept predefined values.');
        return;
      }
    } else {
      schema.push({
        key: attributeKey,
        label: attributeLabel,
        type: 'select',
        options: [trimmed],
        required: false,
      });
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('categories')
        .update({ attribute_schema: schema })
        .eq('id', targetCategoryId);
      if (updateError) throw updateError;
      await revalidateCategoryData();
      onCreated(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to add ${attributeLabel.toLowerCase()}.`);
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
      aria-labelledby="add-attr-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <h3 id="add-attr-title" className="text-base font-bold text-gray-900">
            Add New {attributeLabel}
          </h3>
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
              {attributeLabel} Name *
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              placeholder={`e.g. ${attributeLabel === 'Material' ? 'Gold Plated' : attributeLabel}`}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
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
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
