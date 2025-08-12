import { createServiceClient } from './supabase/server'

export async function uploadToStorage(
  buffer: Buffer,
  fileName: string,
  contentType: string = 'image/png'
): Promise<string> {
  const supabase = await createServiceClient()
  
  const path = `${Date.now()}_${fileName}`
  
  const { error } = await supabase.storage
    .from('results')
    .upload(path, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  // 获取签名URL（CDN加速）
  const { data } = supabase.storage
    .from('results')
    .getPublicUrl(path)

  return data.publicUrl
}

export async function downloadFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download from URL: ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}
