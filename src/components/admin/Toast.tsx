'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastData {
  type: 'success' | 'error';
  message: string;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

/**
 * Polished in-app toast used for success/error feedback in the admin panel.
 * Auto-dismisses after a short delay; dismissible via the close button.
 */
export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div
      className={`fixed top-20 right-4 sm:right-6 z-[110] flex items-start gap-3 border rounded-xl shadow-lg px-4 py-3 w-[min(92vw,380px)] ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`} />
      <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="p-0.5 opacity-60 hover:opacity-100 rounded transition focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
