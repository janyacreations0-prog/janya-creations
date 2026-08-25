import { Resend } from 'resend';

/**
 * Reusable Resend email service — server-side only.
 * The API key is read from process.env.RESEND_API_KEY and is never exposed to
 * the browser, logged, or included in any response.
 */

let cachedResend: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!cachedResend) {
    cachedResend = new Resend(apiKey);
  }
  return cachedResend;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Overrides the configured sender (RESEND_FROM_EMAIL). */
  from?: string;
  /** Overrides the configured reply-to (RESEND_REPLY_TO). */
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Sends an email through Resend with graceful failure handling.
 * Sender defaults: RESEND_FROM_EMAIL env, falling back to the Resend sandbox
 * sender until the production domain is verified in Resend.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!isResendConfigured()) {
    console.error('[resend] RESEND_API_KEY is not configured');
    return { success: false, error: 'Email is not configured' };
  }

  try {
    const from =
      options.from || process.env.RESEND_FROM_EMAIL || 'Janya Creations <onboarding@resend.dev>';
    const replyTo = options.replyTo || process.env.RESEND_REPLY_TO;

    const { data, error } = await getResend().emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      ...(replyTo ? { replyTo } : {}),
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
    });

    if (error) {
      console.error('[resend] send failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true, emailId: data?.id };
  } catch (e) {
    console.error('[resend] send error:', e);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Lightweight branded HTML layout for Janya Creations emails.
 */
export function brandedLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#881337;padding:20px 24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">Janya Creations</h1>
          </td>
        </tr>
        <tr><td style="padding:24px;">
          <h2 style="margin:0 0 12px;font-size:18px;">${title}</h2>
          ${content}
        </td></tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 24px;text-align:center;color:#64748b;font-size:12px;">
            &copy; ${new Date().getFullYear()} Janya Creations
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Basic branded test email (used by /api/email/test).
 */
export async function sendTestEmail(): Promise<SendEmailResult> {
  return sendEmail({
    to: process.env.RESEND_TEST_RECIPIENT || 'janyacreations0@gmail.com',
    subject: 'Janya Creations - Resend Test',
    html: brandedLayout(
      'Resend Test',
      '<p>This is a test email from the Janya Creations website.</p><p>Resend integration is working successfully.</p>'
    ),
  });
}

/**
 * Future transactional email event types.
 *
 * Architecture placeholder only — these events are NOT connected to any
 * order/payment/checkout flow yet. The next phase will wire them in.
 *
 * - order_confirmation
 * - payment_success
 * - payment_failed
 * - shipment_notification
 * - delivery_notification
 * - account (password reset / account notices)
 * - abandoned_cart
 */
export type ResendEmailType =
  | 'order_confirmation'
  | 'payment_success'
  | 'payment_failed'
  | 'shipment_notification'
  | 'delivery_notification'
  | 'account'
  | 'abandoned_cart';
