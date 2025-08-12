import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'

export const cleanupJobs = inngest.createFunction(
  {
    id: 'cleanup-jobs',
    name: 'Cleanup Old Jobs',
  },
  { cron: '0 * * * *' }, // 每小时运行一次
  async ({ step }) => {
    const supabase = await createServiceClient()
    
    // 清理超过1小时还在processing状态的任务
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: stuckJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id')
      .eq('status', 'processing')
      .lt('updated_at', oneHourAgo)
    
    if (fetchError) {
      throw new Error(`Failed to fetch stuck jobs: ${fetchError.message}`)
    }
    
    if (stuckJobs && stuckJobs.length > 0) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .in('id', stuckJobs.map(job => job.id))
      
      if (updateError) {
        throw new Error(`Failed to update stuck jobs: ${updateError.message}`)
      }
      
      return {
        message: `Cleaned up ${stuckJobs.length} stuck jobs`
      }
    }
    
    return {
      message: 'No stuck jobs found'
    }
  }
)
