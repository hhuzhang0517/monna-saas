import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Use service role key for resending confirmation emails
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('Attempting to resend confirmation email to:', email);
    console.log('Redirect URL:', `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`);
    
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    });

    console.log('Resend response:', { data, error });

    if (error) {
      console.error('Resend confirmation error:', error);
      return NextResponse.json(
        { error: `Failed to send confirmation email: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Confirmation email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}