/**
 * Resolves the public site URL for links inside emails and elsewhere.
 * Priority: NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_APP_URL → production domain
 * (when VERCEL_ENV=production) → Vercel deployment domain → production domain.
 * Never uses localhost for customer-facing content.
 */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  // Vercel always injects VERCEL_URL — including for Production deployments,
  // where it points to a random deployment subdomain. In Production the
  // canonical domain must win so customers are never redirected to a
  // Vercel deployment URL.
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://janyacreations.com';
  }
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'https://janyacreations.com';
}
