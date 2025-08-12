import { inngest } from '../client'
import { generateWithOpenAI } from '@/lib/providers/openai'
import { generateWithGemini } from '@/lib/providers/gemini'
import { generateWithIdeogram } from '@/lib/providers/ideogram'
import { createServiceClient } from '@/lib/supabase/server'

export const generateMedia = inngest.createFunction(
  {
    id: 'generate-media',
    name: 'Generate Media',
    throttle: {
      limit: 10,
      period: '1m',
      key: 'event.data.userId',
    },
    retries: 3,
    concurrency: {
      limit: 5,
    },
  },
  { event: 'media/generate.requested' },
  async ({ event, step }) => {
    const { jobId, provider, prompt, userId } = event.data

    // 步骤1: 更新任务状态为processing
    await step.run('update-status-processing', async () => {
      const supabase = await createServiceClient()
      
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', userId) // 安全检查

      if (error) {
        throw new Error(`Failed to update job status: ${error.message}`)
      }
    })

    // 步骤2: 调用AI提供商生成图片
    const resultUrl = await step.run('generate-image', async () => {
      try {
        switch (provider) {
          case 'openai':
            return await generateWithOpenAI(prompt)
          case 'gemini':
            return await generateWithGemini(prompt)
          case 'ideogram':
            return await generateWithIdeogram(prompt)
          default:
            throw new Error(`Unknown provider: ${provider}`)
        }
      } catch (error: any) {
        // 如果生成失败，更新状态并抛出错误
        const supabase = await createServiceClient()
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)
        
        throw error
      }
    })

    // 步骤3: 更新任务状态为完成
    await step.run('update-status-done', async () => {
      const supabase = await createServiceClient()
      
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'done',
          result_url: resultUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to update job result: ${error.message}`)
      }
    })

    return {
      jobId,
      resultUrl,
      message: 'Media generated successfully'
    }
  }
)
