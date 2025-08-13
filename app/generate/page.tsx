
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

type Provider = 'openai' | 'gemini' | 'ideogram'

export default function GeneratePage() {
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState<Provider>('openai')
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  
  const supabase = createClient()

  // 轮询任务状态
  const { data: job, error, mutate } = useSWR(
    jobId ? `/api/jobs?id=${jobId}` : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    {
      refreshInterval: job?.status === 'done' || job?.status === 'failed' ? 0 : 2000,
    }
  )

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt')
      return
    }

    setLoading(true)
    setJobId(null)

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          prompt,
          type: 'image',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create job')
      }

      const data = await response.json()
      setJobId(data.id)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI Image Generator
        </h1>

        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-700">
          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">AI Provider</label>
            <div className="grid grid-cols-3 gap-3">
              {(['openai', 'gemini', 'ideogram'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    provider === p
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="w-full h-32 px-4 py-3 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={loading}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Creating Job...' : 'Generate Image'}
          </button>
        </div>

        {/* Job Status */}
        {jobId && job && (
          <div className="mt-8 bg-zinc-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-zinc-700">
            <h2 className="text-xl font-semibold mb-4">Generation Status</h2>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                job.status === 'queued' ? 'bg-yellow-500' :
                job.status === 'processing' ? 'bg-blue-500' :
                job.status === 'done' ? 'bg-green-500' :
                'bg-red-500'
              }`} />
              <span className="text-lg capitalize">{job.status}</span>
            </div>

            {job.status === 'processing' && (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-zinc-400">Generating your image...</span>
              </div>
            )}

            {job.status === 'done' && job.result_url && (
              <div className="mt-6">
                <img
                  src={job.result_url}
                  alt="Generated image"
                  className="w-full rounded-lg shadow-2xl"
                />
                <div className="mt-4 flex gap-3">
                  <a
                    href={job.result_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-4 bg-zinc-700 hover:bg-zinc-600 text-center rounded-lg transition-colors"
                  >
                    Open Full Size
                  </a>
                  <button
                    onClick={() => {
                      setJobId(null)
                      setPrompt('')
                    }}
                    className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            )}

            {job.status === 'failed' && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400">Generation failed. Please try again.</p>
              </div>
            )}
          </div>
        )}

        {/* Recent Jobs */}
        <RecentJobs />
      </div>
    </div>
  )
}

function RecentJobs() {
  const { data, error, isLoading } = useSWR('/api/jobs', async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  })

  if (isLoading) return null
  if (error || !data?.jobs?.length) return null

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6">Recent Generations</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {data.jobs
          .filter((job: any) => job.status === 'done' && job.result_url)
          .slice(0, 6)
          .map((job: any) => (
            <div key={job.id} className="group relative overflow-hidden rounded-lg bg-zinc-800/50 border border-zinc-700">
              <img
                src={job.result_url}
                alt={job.prompt}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                <p className="text-xs text-zinc-300 line-clamp-2">{job.prompt}</p>
                <p className="text-xs text-zinc-500 mt-1">{job.provider}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
