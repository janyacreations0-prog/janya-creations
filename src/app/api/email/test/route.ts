import { sendTestEmail } from '@/lib/email/resend';

export async function GET() {
  const result = await sendTestEmail();

  if (!result.success) {
    return Response.json(
      { success: false, error: result.error || 'Failed to send test email' },
      { status: 400 }
    );
  }

  return Response.json({
    success: true,
    message: 'Test email sent successfully',
    emailId: result.emailId,
  });
}
