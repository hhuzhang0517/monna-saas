import OpenAI from "openai";
import { generateShotPlanWithGemini } from '@/lib/providers/gemini';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 镜头表Schema
const shotSchema = {
  name: 'shot_plan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ratio', 'total_seconds', 'shots'],
    properties: {
      ratio: { 
        type: 'string', 
        enum: ['1280:768','768:1280'] 
      },
      total_seconds: { type: 'integer', minimum: 3, maximum: 120 },
      shots: {
        type: 'array',
        minItems: 1,
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id','prompt','duration_s','camera'],
          properties: {
            id: { type: 'integer' },
            prompt: { type: 'string' },
            duration_s: { type: 'integer', minimum: 3, maximum: 30 },
            camera: { type: 'string' }
          }
        }
      }
    }
  }
};

export interface ShotPlan {
  ratio: string;
  total_seconds: number;
  shots: Array<{
    id: number;
    prompt: string;
    duration_s: number;
    camera: string;
  }>;
}

export async function generateShotPlan(
  userPrompt: string,
  targetSeconds: number = 30,
  ratio: string = '1280:768'
): Promise<ShotPlan> {
  console.log(`🎬 Generating shot plan for: "${userPrompt}" (${targetSeconds}s, ${ratio})`);

  // 尝试使用最新的Gemini 2.5 Flash增强方案
  try {
    console.log('🚀 Trying enhanced Gemini 2.5 Flash agent first...');
    const { generateEnhancedShotPlan } = await import("./gemini-enhanced-planner");
    const enhancedPlan = await generateEnhancedShotPlan(userPrompt, targetSeconds, ratio);

    // 验证增强方案返回的结构
    if (enhancedPlan && enhancedPlan.shots && Array.isArray(enhancedPlan.shots)) {
      console.log(`📋 Generated enhanced shot plan:`, {
        totalShots: enhancedPlan.shots.length,
        totalDuration: enhancedPlan.total_seconds,
        shots: enhancedPlan.shots.map(s => ({ id: s.id, duration: s.duration_s, camera: s.camera }))
      });
      return enhancedPlan as ShotPlan;
    } else {
      throw new Error('Gemini 2.5 Flash增强方案返回的数据结构不正确');
    }

  } catch (enhancedError) {
    console.error('❌ Gemini 2.5 Flash enhanced agent failed, falling back to basic Gemini:', enhancedError);

    // 降级方案1：尝试Gemini
    try {
      console.log('🔄 Falling back to Gemini...');
      const geminiPlan = await generateShotPlanWithGemini(userPrompt, targetSeconds, ratio);

      // 验证Gemini返回的结构
      if (geminiPlan && geminiPlan.shots && Array.isArray(geminiPlan.shots)) {
        return geminiPlan as ShotPlan;
      } else {
        throw new Error('Gemini返回的数据结构不正确');
      }

    } catch (geminiError) {
      console.error('❌ Gemini API failed, trying OpenAI fallback:', geminiError);

      // 降级方案2：尝试OpenAI
      try {
        console.log('🔄 Falling back to OpenAI...');
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-2024-08-06', // 支持 Structured Outputs
          messages: [
            {
              role: 'system',
              content: `You are a professional cinematographer. Break down the user's high-level prompt into coherent shot sequences.
Requirements:
1. Follow Runway model duration constraints: gen4_turbo recommends 5s or 10s per segment
2. Total duration should approach target_seconds, ensure narrative continuity and subject consistency between shots
3. Each shot must have clear visual descriptions and camera movements
4. Maintain character and scene consistency
5. ALL shot prompts MUST be in English for video generation model compatibility`
            },
            {
              role: 'user',
              content: `User Prompt: ${userPrompt}
Target Duration (seconds): ${targetSeconds}
Aspect Ratio: ${ratio}

Please break down this prompt into multiple coherent shots, ensuring the total duration meets the target requirement. Remember: ALL shot descriptions must be in English.`
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: shotSchema
          },
          temperature: 0.7
        });

        const plan = JSON.parse(response.choices[0].message.content || '{}') as ShotPlan;

        // 量化时长到Runway支持的值（5s/10s）
        plan.shots = plan.shots.map(shot => {
          const quantizedDuration = shot.duration_s <= 7 ? 5 : shot.duration_s <= 15 ? 10 : Math.min(30, shot.duration_s);
          return { ...shot, duration_s: quantizedDuration };
        });

        console.log(`📋 Generated shot plan with OpenAI fallback:`, {
          totalShots: plan.shots.length,
          totalDuration: plan.shots.reduce((sum, shot) => sum + shot.duration_s, 0),
          shots: plan.shots.map(s => ({ id: s.id, duration: s.duration_s, camera: s.camera }))
        });

        return plan;

      } catch (openaiError) {
        console.error('❌ OpenAI API also failed, using local fallback:', openaiError);

        // 降级方案3：使用本地镜头规划逻辑
        return generateFallbackShotPlan(userPrompt, targetSeconds, ratio);
      }
    }
  }
}

// 降级方案：本地镜头规划逻辑
function generateFallbackShotPlan(userPrompt: string, targetSeconds: number, ratio: string): ShotPlan {
  console.log('🔄 Using fallback shot planning logic');
  
  // 从提示词中提取目标时长
  const durationMatch = userPrompt.match(/(\d+)s|(\d+)秒/);
  const actualTargetSeconds = durationMatch ? parseInt(durationMatch[1] || durationMatch[2]) : targetSeconds;
  
  // 计算需要多少个镜头
  const segmentDuration = 10; // 每个镜头10秒
  const shotCount = Math.ceil(actualTargetSeconds / segmentDuration);
  
  console.log(`📋 Fallback planning: ${shotCount} shots of ${segmentDuration}s each for ${actualTargetSeconds}s total`);
  
  const shots = [];
  
  // 生成镜头序列
  for (let i = 0; i < shotCount; i++) {
    const timeStart = i * segmentDuration;
    const timeEnd = Math.min((i + 1) * segmentDuration, actualTargetSeconds);
    const duration = timeEnd - timeStart;
    
    let shotType, camera, sceneDesc;
    
    if (i === 0) {
      // 第一个镜头：建立镜头
      shotType = "WS";
      camera = "static";
      sceneDesc = "establishing shot, showing overall environment";
    } else if (i === shotCount - 1) {
      // 最后一个镜头：收束镜头
      shotType = "LS";
      camera = "slow zoom out";
      sceneDesc = "closing shot, summarizing the scene";
    } else if (i % 3 === 1) {
      // 特写镜头
      shotType = "CU";
      camera = "static";
      sceneDesc = "close-up shot, showing details";
    } else {
      // 中景镜头
      shotType = "MS";
      camera = "dolly";
      sceneDesc = "medium shot, advancing narrative";
    }
    
    // 创建英文镜头描述（为了兼容Runway模型）
    const englishPrompt = `${userPrompt} - ${sceneDesc}, time segment ${timeStart}s to ${timeEnd}s`;
    
    shots.push({
      id: i + 1,
      prompt: englishPrompt,
      duration_s: duration,
      camera: camera
    });
  }
  
  return {
    ratio,
    total_seconds: actualTargetSeconds,
    shots
  };
}