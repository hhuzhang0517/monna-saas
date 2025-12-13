import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 重试机制
async function translateWithRetry(text: string, targetLang: string, maxRetries: number = 3): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Translation attempt ${attempt}/${maxRetries} for target: ${targetLang}`);
      
      // 尝试不同的模型，优先使用更稳定的版本
      const modelName = attempt === 1 ? "gemini-1.5-flash" : "gemini-1.5-pro";
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.3, // 降低温度提高稳定性
          maxOutputTokens: 1024,
        }
      });
      
      const prompt = `请将以下英文镜头描述翻译成${targetLang}，保持专业的电影制作术语，翻译要简洁准确：\n\n${text}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translatedText = response.text().trim();
      
      console.log(`✅ Translation successful on attempt ${attempt}`);
      return translatedText;
      
    } catch (error) {
      console.error(`❌ Translation attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error; // 最后一次尝试失败，抛出错误
      }
      
      // 等待后重试，指数退避
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("All translation attempts failed");
}

// 简单的本地降级翻译（基于关键词映射）
function getFallbackTranslation(text: string, targetLanguage: string): string {
  const keywordMappings: { [key: string]: { [lang: string]: string } } = {
    'zh': {
      'shot': '镜头',
      'scene': '场景',
      'character': '角色',
      'camera': '摄像机',
      'close-up': '特写',
      'wide shot': '全景',
      'medium shot': '中景',
      'establishing shot': '建立镜头',
      'static': '静止',
      'zoom': '缩放',
      'pan': '平移',
      'tilt': '倾斜',
      'dolly': '推拉',
      'tracking': '跟踪'
    },
    'ja': {
      'shot': 'ショット',
      'scene': 'シーン', 
      'character': 'キャラクター',
      'camera': 'カメラ',
      'close-up': 'クローズアップ',
      'wide shot': 'ワイドショット',
      'medium shot': 'ミディアムショット',
      'establishing shot': '確立ショット',
      'static': '静的',
      'zoom': 'ズーム',
      'pan': 'パン',
      'tilt': 'ティルト',
      'dolly': 'ドリー',
      'tracking': 'トラッキング'
    }
  };

  let translatedText = text;
  const mappings = keywordMappings[targetLanguage];
  
  if (mappings) {
    Object.entries(mappings).forEach(([english, translated]) => {
      const regex = new RegExp(english, 'gi');
      translatedText = translatedText.replace(regex, translated);
    });
  }
  
  return translatedText;
}

// 批量翻译镜头规划
async function translateShotPlan(shotPlan: any, targetLanguage: string) {
  if (!shotPlan || !shotPlan.shots || !Array.isArray(shotPlan.shots)) {
    return NextResponse.json(
      { error: "Invalid shot plan format" }, 
      { status: 400 }
    );
  }

  const languageMap: { [key: string]: string } = {
    'zh': '中文',
    'ja': '日本語'
  };
  
  const targetLang = languageMap[targetLanguage] || targetLanguage;

  try {
    // 将所有镜头描述合并为一个请求
    const allPrompts = shotPlan.shots.map((shot: any, index: number) => 
      `镜头${shot.id}: ${shot.prompt}`
    ).join('\n\n');

    const translatedText = await translateWithRetry(allPrompts, targetLang);
    
    // 解析翻译结果，分配给各个镜头
    const translatedShots = shotPlan.shots.map((shot: any, index: number) => {
      // 从翻译结果中提取对应镜头的翻译
      const shotPattern = new RegExp(`镜头${shot.id}[：:]\\s*([^\\n]*(?:\\n(?!镜头\\d+[：:]).*)*)`);
      const match = translatedText.match(shotPattern);
      const translatedPrompt = match ? match[1].trim() : `翻译失败 - ${shot.prompt}`;
      
      return {
        ...shot,
        translatedPrompt: translatedPrompt,
        originalPrompt: shot.prompt
      };
    });

    const translatedShotPlan = {
      ...shotPlan,
      shots: translatedShots
    };

    return NextResponse.json({ 
      shotPlan: translatedShotPlan,
      method: "gemini_batch",
      targetLanguage
    });
    
  } catch (geminiError) {
    console.warn("❌ Batch translation failed, using fallback:", geminiError);
    
    // 降级到简单的关键词映射翻译
    const translatedShots = shotPlan.shots.map((shot: any) => ({
      ...shot,
      translatedPrompt: getFallbackTranslation(shot.prompt, targetLanguage),
      originalPrompt: shot.prompt
    }));

    const translatedShotPlan = {
      ...shotPlan,
      shots: translatedShots
    };
    
    return NextResponse.json({ 
      shotPlan: translatedShotPlan,
      method: "fallback_batch",
      targetLanguage,
      warning: "使用降级翻译，质量可能较低"
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log("📥 Translation API request body:", body ? body.substring(0, 200) + "..." : "empty");
    
    if (!body) {
      return NextResponse.json(
        { error: "Empty request body" }, 
        { status: 400 }
      );
    }
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" }, 
        { status: 400 }
      );
    }
    
    const { text, targetLanguage, shotPlan } = parsedBody;
    
    // 如果是批量翻译镜头规划
    if (shotPlan) {
      return await translateShotPlan(shotPlan, targetLanguage);
    }
    
    // 禁用单独翻译，强制使用批量翻译
    console.warn("❌ Individual translation blocked - use batch translation only");
    return NextResponse.json(
      { error: "Individual translation disabled - use shotPlan for batch translation" }, 
      { status: 400 }
    );
    
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json(
      { error: "Translation service unavailable" }, 
      { status: 500 }
    );
  }
}