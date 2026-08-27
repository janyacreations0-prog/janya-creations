import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
}

function buildHref(basePath: string, params: Record<string, string | string[] | undefined>, page: number): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'page') return;
    if (Array.isArray(v)) {
      v.forEach((item) => qs.append(k, item));
    } else if (v !== undefined && v !== '') {
      qs.set(k, v);
    }
  });
  if (page > 1) qs.set('page', String(page));
  const q = qs.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export default function Pagination({ page, totalPages, basePath, params }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const linkCls =
    'inline-flex items-center justify-center min-w-[36px] h-9 px-3 text-sm font-medium rounded-lg transition-colors';

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Pagination">
      {page > 1 && (
        <Link
          href={buildHref(basePath, params, page - 1)}
          className={`${linkCls} text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-gray-200`}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      )}

      {pages[0] > 1 && (
        <>
          <Link href={buildHref(basePath, params, 1)} className={`${linkCls} text-gray-600 hover:text-rose-600 border border-gray-200`}>
            1
          </Link>
          {pages[0] > 2 && <span className="px-1 text-gray-400 text-sm">…</span>}
        </>
      )}

      {pages.map((p) =>
        p === page ? (
          <span key={p} className={`${linkCls} bg-rose-600 text-white font-bold`}>
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(basePath, params, p)}
            className={`${linkCls} text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-gray-200`}
          >
            {p}
          </Link>
        )
      )}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
          <Link href={buildHref(basePath, params, totalPages)} className={`${linkCls} text-gray-600 hover:text-rose-600 border border-gray-200`}>
            {totalPages}
          </Link>
        </>
      )}

      {page < totalPages && (
        <Link
          href={buildHref(basePath, params, page + 1)}
          className={`${linkCls} text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-gray-200`}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </nav>
  );
}
