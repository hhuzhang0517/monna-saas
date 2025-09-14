import { GoogleGenerativeAI } from "@google/generative-ai";
import { putAndGetUrl } from "@/lib/storage";

// 初始化Gemini客户端
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateImageGemini(prompt: string) {
  // 注意：Gemini 目前主要是文本生成，图像生成功能可能有限
  // 这里提供一个基础实现框架，具体API可能需要根据Google最新文档调整
  
  // 暂时抛出错误，提醒需要根据最新的Gemini图像生成API进行实现
  throw new Error("Gemini image generation needs to be implemented according to latest Google AI API");
  
  // 以下是预期的实现结构（需要根据实际API调整）:
  /*
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
  const result = await model.generateContent([prompt]);
  
  // 处理返回的图像数据
  // const imageData = result.response.candidates[0]...
  // const bytes = Buffer.from(imageData, "base64");
  // const url = await putAndGetUrl(`gemini/${crypto.randomUUID()}.png`, bytes, "image/png");
  // return { url };
  */
}

/**
 * 使用Gemini生成结构化的镜头规划JSON
 */
export async function generateShotPlanWithGemini(
  userPrompt: string, 
  targetSeconds: number = 30, 
  ratio: string = '1280:768'
): Promise<any> {
  console.log(`🎬 Generating shot plan with Gemini for: "${userPrompt}" (${targetSeconds}s, ${ratio})`);
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // 使用最新的Gemini模型
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096, // 增加输出长度限制
      }
    });
        const systemPrompt = `You are a professional cinematographer. Break down the user's high-level prompt into coherent shot sequences.

Requirements:
1. Follow Runway model duration constraints: gen4_turbo recommends 5s or 10s per segment
2. Total duration should approach target_seconds, ensure narrative continuity and subject consistency between shots
3. Use positive phrasing only: prompts that describe what should happen in shot
4. Maintain character and scene consistency
5. ALL shot prompts MUST be in English for video generation model compatibility
6. Use direct, simple, and easily understood prompts (max 50 words per shot to avoid Runway errors)
7. Focus on describing the motion, rather than the input image:Both text and image inputs are considered part of your prompt. Reiterating elements that exist within the image in high detail can lead to reduced motion or unexpected results in the output.
8. Use basic camera terms: "static", "handheld", "tracking"
9. Focus on concrete visual elements, not abstract concepts
10. Avoid conversational or command-based prompts:describe how the elements should appear or disappear from the scene
11. Avoid overly complex prompts: simple description of the desired motion for a single scene
12. AVOID words that might trigger content policies: "spiritual", "energy", "pulsating", "mystical", "magical", "ethereal"
13. Use realistic, grounded descriptions instead of fantasy elements

Output strictly in the following JSON format with NO other text:

{
  "ratio": "${ratio}",
  "total_seconds": ${targetSeconds},
  "shots": [
    {
      "id": 1,
      "prompt": "Concise but detailed English description of the first shot",
      "duration_s": 10,
      "camera": "static"
    }
  ]
}`;

    const userInput = `User Prompt: ${userPrompt}
Target Duration (seconds): ${targetSeconds}
Aspect Ratio: ${ratio}

Please break down this prompt into multiple coherent shots, ensuring the total duration meets the target requirement. Remember: ALL shot descriptions must be in English.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userInput }
    ]);

    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 Gemini raw response:', text);

    // 尝试解析JSON
    let plan;
    try {
      // 清理响应文本，移除可能的markdown代码块标记
      let cleanText = text.replace(/```json\s*|\s*```/g, '').trim();
      
      // 检查JSON是否被截断，如果是则尝试修复
      if (!cleanText.endsWith('}') && !cleanText.endsWith(']}')) {
        console.warn('⚠️ Detected truncated JSON, attempting to fix...');
        
        // 找到最后一个完整的镜头对象
        const lastCompleteShot = cleanText.lastIndexOf('    }');
        if (lastCompleteShot !== -1) {
          // 截取到最后一个完整镜头，然后补全JSON结构
          cleanText = cleanText.substring(0, lastCompleteShot + 5) + '\n  ]\n}';
          console.log('🔧 Repaired JSON structure');
        } else {
          // 如果找不到完整的镜头，使用降级方案
          throw new Error('JSON截断严重，无法修复');
        }
      }
      
      plan = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini JSON response:', parseError);
      console.error('Raw text:', text);
      
      // 尝试从截断的JSON中提取可用的镜头信息
      try {
        const shotMatches = text.match(/"id":\s*(\d+),\s*"prompt":\s*"([^"]*)",\s*"duration_s":\s*(\d+),\s*"camera":\s*"([^"]*)"/g);
        if (shotMatches && shotMatches.length > 0) {
          console.log('🔧 Attempting to extract shots from partial JSON...');
          const extractedShots = shotMatches.map((match, index) => {
            const shotMatch = match.match(/"id":\s*(\d+),\s*"prompt":\s*"([^"]*)",\s*"duration_s":\s*(\d+),\s*"camera":\s*"([^"]*)"/);
            if (shotMatch) {
              return {
                id: parseInt(shotMatch[1]),
                prompt: shotMatch[2],
                duration_s: parseInt(shotMatch[3]),
                camera: shotMatch[4]
              };
            }
            return null;
          }).filter(shot => shot !== null);
          
          if (extractedShots.length > 0) {
            plan = {
              ratio: ratio,
              total_seconds: targetSeconds,
              shots: extractedShots
            };
            console.log(`✅ Extracted ${extractedShots.length} shots from partial JSON`);
          } else {
            throw new Error('无法从截断的JSON中提取镜头信息');
          }
        } else {
          throw new Error('Gemini返回的JSON格式有误');
        }
      } catch (extractError) {
        console.error('❌ JSON extraction also failed:', extractError);
        throw new Error('Gemini返回的JSON格式有误');
      }
    }
    
    // 量化时长到Runway支持的值（5s/10s）
    if (plan.shots && Array.isArray(plan.shots)) {
      plan.shots = plan.shots.map((shot: any) => {
        const quantizedDuration = shot.duration_s <= 7 ? 5 : shot.duration_s <= 15 ? 10 : Math.min(30, shot.duration_s);
        return { ...shot, duration_s: quantizedDuration };
      });
    }

    console.log(`📋 Generated shot plan with Gemini:`, {
      totalShots: plan.shots?.length || 0,
      totalDuration: plan.shots?.reduce((sum: number, shot: any) => sum + shot.duration_s, 0) || 0,
      shots: plan.shots?.map((s: any) => ({ id: s.id, duration: s.duration_s, camera: s.camera })) || []
    });

    return plan;
    
  } catch (error) {
    console.error('❌ Gemini API failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini镜头规划失败: ${errorMessage}`);
  }
}