import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { exists: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Try to check if user exists by attempting a password reset
    // This is the safest way without admin privileges
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://janya-creations.vercel.app'}/reset-password`,
    });

    // If there's an error about user not found
    if (error && error.message && error.message.toLowerCase().includes('not found')) {
      return NextResponse.json(
        { exists: false, message: 'No account found with this email' },
        { status: 404 }
      );
    }

    // If any other error, user might exist
    if (error) {
      return NextResponse.json(
        { exists: false, message: 'Error checking user' },
        { status: 500 }
      );
    }

    // No error means user exists
    return NextResponse.json({ exists: true });
    
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { exists: false, message: 'Error checking user' },
      { status: 500 }
    );
  }
}