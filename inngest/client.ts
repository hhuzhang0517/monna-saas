import { Inngest } from 'inngest'

export const inngest = new Inngest({ 
  id: 'monna-saas',
  eventKey: process.env.INNGEST_EVENT_KEY,
})

// Event类型定义
export type GenerateMediaEvent = {
  name: 'media/generate.requested'
  data: {
    jobId: string
    provider: 'openai' | 'gemini' | 'ideogram'
    prompt: string
    userId: string
  }
}

export type CleanupJobsEvent = {
  name: 'jobs/cleanup.scheduled'
  data: {}
}
