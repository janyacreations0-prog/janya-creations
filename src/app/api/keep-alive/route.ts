import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // 1. Simple database query to keep the project alive
    // This creates/updates a timestamp in a keep-alive table
    const { data, error } = await supabase
      .from('_keep_alive')
      .upsert({ 
        id: 1, 
        last_ping: new Date().toISOString(),
        ping_count: supabase.rpc('increment_counter', { row_id: 1 })
      })
      .select();

    if (error) throw error;

    console.log('✅ Keep-alive ping successful at:', new Date().toISOString());

    return NextResponse.json({
      success: true,
      message: 'Keep-alive ping successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Keep-alive ping failed:', error.message);

    // Even if the table doesn't exist, try a simple health check
    try {
      // Fallback: Just check auth health endpoint
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Keep-alive ping successful (fallback)',
        timestamp: new Date().toISOString(),
      });
    } catch (fallbackError: any) {
      console.error('❌ Fallback ping also failed:', fallbackError.message);
      
      return NextResponse.json(
        { success: false, error: fallbackError.message },
        { status: 500 }
      );
    }
  }
}