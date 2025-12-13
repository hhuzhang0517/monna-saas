import { createSupabaseServer } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 /api/auth/set-session called')

    const body = await request.json()
    const { access_token, refresh_token } = body

    if (!access_token || !refresh_token) {
      console.error('❌ Missing tokens in request body')
      return NextResponse.json(
        { error: 'Missing access_token or refresh_token' },
        { status: 400 }
      )
    }

    console.log('📝 Tokens received:', {
      accessTokenLength: access_token?.length,
      refreshTokenLength: refresh_token?.length,
    })

    const supabase = await createSupabaseServer()

    console.log('🔄 Calling Supabase setSession...')
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })

    if (error) {
      console.error('❌ Supabase setSession error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    if (!data?.session || !data?.user) {
      console.error('❌ No session or user returned from Supabase')
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 401 }
      )
    }

    console.log('✅ Session created successfully for user:', data.user.email)

    return NextResponse.json({
      success: true,
      user: {
        email: data.user.email,
        id: data.user.id,
      },
    })
  } catch (err: any) {
    console.error('❌ Error in /api/auth/set-session:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
