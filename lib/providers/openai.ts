import OpenAI from 'openai'
import { uploadToStorage } from '../storage'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function generateWithOpenAI(prompt: string): Promise<string> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    })

    const base64Data = response.data[0].b64_json
    if (!base64Data) {
      throw new Error('No image data received from OpenAI')
    }

    // 转换base64为Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // 上传到Supabase Storage
    const url = await uploadToStorage(buffer, 'openai-image.png', 'image/png')
    
    return url
  } catch (error: any) {
    console.error('OpenAI generation error:', error)
    throw new Error(`OpenAI generation failed: ${error?.message || 'Unknown error'}`)
  }
}
