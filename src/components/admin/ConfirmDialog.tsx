'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red destructive confirm button (delete/irreversible actions). */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation modal for destructive admin actions.
 * - Escape or backdrop click closes (unless a request is in flight)
 * - Focus lands on the least destructive action (Cancel)
 * - Buttons disabled + spinner while `loading` prevents double submission
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => cancelRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-start gap-3 p-5 pb-2">
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              destructive ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-gray-900">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close dialog"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-1 pb-5">
          <div className="text-sm text-gray-600 leading-relaxed">{message}</div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              ref={cancelRef}
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition inline-flex items-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                destructive
                  ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500'
                  : 'bg-gray-900 hover:bg-gray-800 focus-visible:ring-gray-700'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
