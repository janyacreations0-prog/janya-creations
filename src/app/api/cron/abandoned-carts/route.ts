import { NextResponse } from 'next/server';
import { processAbandonedCarts } from '@/lib/email';

/**
 * Protected scheduler endpoint for abandoned-cart reminders.
 * Vercel Cron invokes this with `Authorization: Bearer $CRON_SECRET` when the
 * CRON_SECRET environment variable is set. Without CRON_SECRET the endpoint
 * refuses requests, so it can never be used to send unlimited emails.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processAbandonedCarts();
  return NextResponse.json(result);
}
