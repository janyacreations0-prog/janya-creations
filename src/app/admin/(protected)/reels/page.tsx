'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  createReelJob,
  listReelJobs,
  listProductsForReels,
  approveReelJob,
  updateReelCaption,
  deleteReelJob,
  regenerateReelJob,
  type ReelJob,
} from '@/lib/reel-actions';
import { REEL_TEMPLATES, type ReelTemplate } from '@/lib/reel-templates';
import {
  ArrowLeft,
  Film,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Pencil,
  Play,
} from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  generating: 'Generating…',
  ready: 'Ready',
  approved: 'Approved',
  failed: 'Failed',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  generating: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-blue-100 text-blue-700',
  failed: 'bg-rose-100 text-rose-700',
};

export default function ReelFactoryPage() {
  const searchParams = useSearchParams();
  const presetProduct = searchParams.get('product') || '';

  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);
  const [jobs, setJobs] = useState<ReelJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Generate form
  const [selectedProduct, setSelectedProduct] = useState(presetProduct);
  const [selectedTemplate, setSelectedTemplate] = useState<ReelTemplate>('product_spotlight');
  const [generating, setGenerating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');

  // Per-job actions
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRegenerateId, setConfirmRegenerateId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [prodList, jobList] = await Promise.all([
        listProductsForReels(),
        listReelJobs(),
      ]);
      setProducts(prodList);
      setJobs(jobList);
    } catch (e: any) {
      setError(e?.message || 'Failed to load Reel Factory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 3500);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(
      (j) =>
        (statusFilter === 'all' || j.status === statusFilter) &&
        (templateFilter === 'all' || j.template === templateFilter)
    );
  }, [jobs, statusFilter, templateFilter]);

  const handleGenerate = async () => {
    if (!selectedProduct || generating) return;
    setError('');
    setGenerating(true);
    try {
      const res = await createReelJob(selectedProduct, selectedTemplate);
      if (!res.success) {
        setError(res.error || 'Failed to generate Reel.');
      } else {
        showToast(res.job?.status === 'ready' ? '✅ Reel generated.' : 'Reel job created.');
        await load();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to generate Reel.');
    } finally {
      setGenerating(false);
    }
  };

  const runJobAction = async (jobId: string, action: () => Promise<{ success: boolean; error?: string }>, msg: string) => {
    if (busyRef.current) return; // prevent duplicate/parallel submissions
    busyRef.current = true;
    setBusyJobId(jobId);
    setError('');
    try {
      const res = await action();
      if (res.success) {
        showToast(msg);
        await load();
      } else {
        setError(res.error || 'Action failed.');
      }
    } catch (e: any) {
      setError(e?.message || 'Action failed.');
    } finally {
      busyRef.current = false;
      setBusyJobId(null);
    }
  };

  // Keyboard: Escape cancels any open inline confirmation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmDeleteId(null);
        setConfirmRegenerateId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openDeleteConfirm = (jobId: string) => {
    setConfirmRegenerateId(null);
    setConfirmDeleteId(jobId);
  };
  const openRegenerateConfirm = (jobId: string) => {
    setConfirmDeleteId(null);
    setConfirmRegenerateId(jobId);
  };
  const clearConfirms = () => {
    setConfirmDeleteId(null);
    setConfirmRegenerateId(null);
  };

  const startEditCaption = (job: ReelJob) => {
    setEditingCaptionId(job.id);
    setCaptionDraft(job.caption || '');
  };

  const saveCaption = async (jobId: string) => {
    await runJobAction(jobId, () => updateReelCaption(jobId, captionDraft), '✅ Caption updated.');
    setEditingCaptionId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Film className="w-6 h-6 text-rose-600" /> Reel Factory
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Generate, preview and approve product Reels. Publishing is a later phase.
              </p>
            </div>
          </div>
        </div>

        {toast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
            {toast}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Generate form */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Generate Reel</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Template</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {REEL_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTemplate(t.key)}
                    aria-pressed={selectedTemplate === t.key}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      selectedTemplate === t.key
                        ? 'border-rose-600 bg-rose-50 text-rose-700'
                        : 'border-gray-200 hover:border-rose-300'
                    }`}
                  >
                    <span className="block text-xs font-bold">{t.label}</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedProduct || generating}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
              {generating ? 'Generating…' : 'Generate Reel'}
            </button>
            {generating && (
              <span className="text-xs text-gray-500">
                This may take a few seconds while the video is rendered.
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
            aria-label="Filter by template"
          >
            <option value="all">All templates</option>
            {REEL_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Job list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading Reels…
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <Film className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No Reels yet. Generate your first one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Preview */}
                <div className="aspect-[9/16] bg-gray-900 relative">
                  {job.signedVideoUrl ? (
                    <video
                      src={job.signedVideoUrl}
                      poster={job.signedThumbnailUrl ?? undefined}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <Play className="w-8 h-8" />
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[job.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[job.status] || job.status}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <div>
                    <p className="text-xs font-bold text-gray-900 line-clamp-1">{job.product_title || 'Product'}</p>
                    <p className="text-[11px] text-gray-500">
                      {REEL_TEMPLATES.find((t) => t.key === job.template)?.label || job.template} · v{job.creative_version} · {job.reel_id}
                    </p>
                  </div>

                  {/* Caption */}
                  {editingCaptionId === job.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        rows={5}
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveCaption(job.id)}
                          disabled={busyJobId === job.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCaptionId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-600 line-clamp-3 whitespace-pre-line">{job.caption}</p>
                  )}

                  {/* Tracking URL */}
                  <div className="flex items-center gap-2">
                    <a
                      href={job.tracking_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-rose-600 hover:underline truncate"
                      title={job.tracking_url || ''}
                    >
                      {job.tracking_url || 'No tracking URL'}
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => startEditCaption(job)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                    >
                      <Pencil className="w-3 h-3" /> Caption
                    </button>
                    <button
                      type="button"
                      onClick={() => openRegenerateConfirm(job.id)}
                      disabled={busyJobId === job.id}
                      aria-expanded={confirmRegenerateId === job.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                    {job.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => runJobAction(job.id, () => approveReelJob(job.id), '✅ Reel approved — ready for future publishing.')}
                        disabled={busyJobId === job.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(job.id)}
                      disabled={busyJobId === job.id}
                      aria-expanded={confirmDeleteId === job.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-100 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>

                  {/* Inline confirmation for destructive/regenerative actions */}
                  {(confirmDeleteId === job.id || confirmRegenerateId === job.id) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-800">
                        {confirmDeleteId === job.id
                          ? 'Are you sure you want to delete this Reel? This cannot be undone.'
                          : 'Regenerate this Reel? A new creative version will be created.'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirmDeleteId === job.id) {
                              runJobAction(job.id, () => deleteReelJob(job.id), '🗑 Reel deleted.').then(() => {
                                setConfirmDeleteId(null);
                                setConfirmRegenerateId(null);
                              });
                            } else {
                              runJobAction(job.id, () => regenerateReelJob(job.id), '✅ Reel regenerated (new creative version).').then(() => {
                                setConfirmDeleteId(null);
                                setConfirmRegenerateId(null);
                              });
                            }
                          }}
                          disabled={busyJobId === job.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition disabled:opacity-50 ${
                            confirmDeleteId === job.id
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-amber-600 hover:bg-amber-700'
                          }`}
                        >
                          {busyJobId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {busyJobId === job.id
                            ? 'Working…'
                            : confirmDeleteId === job.id
                              ? 'Delete'
                              : 'Regenerate'}
                        </button>
                        <button
                          type="button"
                          onClick={clearConfirms}
                          disabled={busyJobId === job.id}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
