import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { generateMedia } from '@/inngest/functions/generate'
import { cleanupJobs } from '@/inngest/functions/cleanup'

// 创建Inngest handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateMedia,
    cleanupJobs,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
