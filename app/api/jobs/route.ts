import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

// POST /api/jobs - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { provider, prompt, type = 'image' } = body
    
    // 验证参数
    if (!provider || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, prompt' },
        { status: 400 }
      )
    }
    
    if (!['openai', 'gemini', 'ideogram'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }
    
    // 使用service client创建任务（绕过RLS）
    const serviceSupabase = await createServiceClient()
    
    const { data: job, error: insertError } = await serviceSupabase
      .from('jobs')
      .insert({
        user_id: user.id,
        provider,
        type,
        prompt,
        status: 'queued',
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Job creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      )
    }
    
    // 触发Inngest异步任务
    await inngest.send({
      name: 'media/generate.requested',
      data: {
        jobId: job.id,
        provider,
        prompt,
        userId: user.id,
      },
    })
    
    return NextResponse.json({
      id: job.id,
      status: 'queued',
      message: 'Job created successfully',
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/jobs?id=xxx - 查询任务状态
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('id')
    
    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!jobId) {
      // 返回用户的所有任务
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) {
        console.error('Jobs fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch jobs' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ jobs })
    }
    
    // 查询特定任务
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()
    
    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(job)
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
