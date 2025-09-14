import { createSupabaseServer } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { users, teams, teamMembers, activityLogs, ActivityType } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function ensureUserInDatabase(authUser: any) {
  try {
    // Check if user already exists in our database
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, authUser.id))
      .limit(1)

    if (existingUser.length > 0) {
      console.log('User already exists in database:', existingUser[0].email)
      return existingUser[0]
    }

    // Create user in our database
    console.log('Creating new user in database:', authUser.email)
    const [newUser] = await db
      .insert(users)
      .values({
        email: authUser.email,
        auth_id: authUser.id,
        role: 'owner'
      })
      .returning()

    // Create a team for the user
    const [newTeam] = await db
      .insert(teams)
      .values({
        name: `${authUser.email}'s Team`
      })
      .returning()

    // Add user to the team
    await db.insert(teamMembers).values({
      userId: newUser.id,
      teamId: newTeam.id,
      role: 'owner'
    })

    // Log activity
    await db.insert(activityLogs).values({
      teamId: newTeam.id,
      userId: newUser.id,
      action: ActivityType.SIGN_UP,
      ipAddress: ''
    })

    console.log('User setup completed:', newUser.email)
    return newUser
  } catch (error) {
    console.error('Error setting up user:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/generate'

  // Normalize origin to localhost for cookie consistency
  const normalizedOrigin = origin.replace('0.0.0.0', 'localhost');
  
  console.log('🔄 OAuth callback debug:', {
    hasCode: !!code,
    codeLength: code?.length,
    originalOrigin: origin,
    normalizedOrigin,
    next,
    allParams: Object.fromEntries(searchParams.entries())
  })

  if (code) {
    try {
      const supabase = await createSupabaseServer()
      console.log('🔄 Attempting code exchange...')
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('🔍 Code exchange detailed result:', {
        success: !error,
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userEmail: data?.user?.email,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorStatus: error?.status
      })
      
      if (!error && data?.user) {
        console.log('✅ OAuth exchange successful, creating user in DB...')
        await ensureUserInDatabase(data.user)
        console.log('✅ User created/found in DB')
        
        // Test if we can immediately verify the session
        console.log('🧪 Testing immediate session verification...')
        const { data: { user: verifyUser }, error: verifyError } = await supabase.auth.getUser()
        console.log('🧪 Immediate session test:', {
          hasUser: !!verifyUser,
          userEmail: verifyUser?.email,
          verifyError: verifyError?.message
        })
        
        // Create the redirect response using normalized origin
        const redirectResponse = NextResponse.redirect(`${normalizedOrigin}${next}`)
        
        // Debug: Check what cookies Supabase should have set
        console.log('🍪 Checking session cookies that should be set...')
        console.log('🍪 Session data:', {
          hasAccessToken: !!data.session?.access_token,
          hasRefreshToken: !!data.session?.refresh_token,
          tokenType: data.session?.token_type,
          expiresIn: data.session?.expires_in
        })
        
        // Manually set session cookies with correct attributes
        if (data.session?.access_token) {
          const cookieData = {
            access_token: data.session.access_token,
            token_type: data.session.token_type || 'bearer',
            expires_in: data.session.expires_in,
            expires_at: data.session.expires_at,
            refresh_token: data.session.refresh_token,
            user: data.user
          }
          
          // Get the Supabase project ID for cookie name
          const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0]
          const cookieName = `sb-${projectId}-auth-token`
          
          console.log('🍪 Setting session cookie manually:', {
            cookieName,
            hasData: !!cookieData
          })
          
          redirectResponse.cookies.set(cookieName, JSON.stringify(cookieData), {
            path: '/',
            httpOnly: false,
            secure: false, // Set to false for localhost
            sameSite: 'lax',
            domain: undefined, // Let browser determine domain
            maxAge: data.session.expires_in || 3600
          })
        }
        
        // Force refresh the page to ensure session is loaded
        redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        redirectResponse.headers.set('Pragma', 'no-cache')
        redirectResponse.headers.set('Expires', '0')
        
        // Set a simple flag to indicate OAuth success
        redirectResponse.cookies.set('oauth-success', '1', {
          path: '/',
          maxAge: 10,
          httpOnly: false,
          secure: false,
          sameSite: 'lax'
        })
        
        console.log('🚀 Redirecting to:', `${normalizedOrigin}${next}`)
        return redirectResponse
      } else {
        console.error('❌ OAuth exchange failed:', {
          error: error?.message,
          code: error?.code,
          status: error?.status
        })
      }
    } catch (err) {
      console.error('❌ OAuth callback exception:', err)
    }
  } else {
    console.log('❌ No authorization code provided')
  }

  console.log('🚨 Redirecting to error page')
  return NextResponse.redirect(`${normalizedOrigin}/auth/auth-code-error`)
}