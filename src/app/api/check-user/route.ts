import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user exists in auth.users
    const { data: user, error } = await supabase
      .from('users') // Replace with your users/profiles table name
      .select('id, email')
      .eq('email', email)
      .single();

    if (!user) {
      return NextResponse.json(
        { exists: false, message: 'No account found with this email' },
        { status: 404 }
      );
    }

    return NextResponse.json({ exists: true, user });
  } catch (error) {
    return NextResponse.json(
      { exists: false, message: 'Error checking user' },
      { status: 500 }
    );
  }
}