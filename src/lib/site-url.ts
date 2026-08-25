/**
 * Resolves the public site URL for links inside emails and elsewhere.
 * Priority: NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_APP_URL → Vercel domain →
 * production domain. Never uses localhost for customer-facing content.
 */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'https://janyacreations.com';
}
