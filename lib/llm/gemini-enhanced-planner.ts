import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ==================== 核心接口定义 ====================
interface ShotPlan {
  ratio: string;
  total_seconds: number;
  shots: Array<{
    id: number;
    prompt: string;
    duration_s: number;
    camera: string;
  }>;
}

interface NarrativeAnalysis {
  genre: string;
  narrative_structure: 'linear' | 'flashback' | 'parallel' | 'circular';
  characters: CharacterProfile[];
  setting: SceneSetting;
  emotional_arc: EmotionalPoint[];
  key_themes: string[];
  visual_style: VisualStyleGuide;
  pacing_rhythm: PacingProfile;
  identity_anchors?: string; // 从参考图片提取的身份锚点（可选）
  subject_type?: 'person' | 'object'; // 主体类型：人或物体
  subject_descriptor?: string; // 用于 shot 1 前缀的描述词
}

interface CharacterProfile {
  id: string;
  name: string;
  physical_description: string;
  clothing_style: string;
  distinctive_features: string[];
  consistency_keywords: string[];
}

interface SceneSetting {
  time_period: string;
  location: string;
  atmosphere: string;
  lighting_conditions: string;
}

interface EmotionalPoint {
  timestamp: number;
  emotional_state: string;
  intensity: number;
  visual_cues: string;
}

interface VisualStyleGuide {
  color_scheme: string;
  cinematography_style: string;
  movement_style: string;
  artistic_reference: string;
}

interface PacingProfile {
  overall_tempo: 'slow' | 'medium' | 'fast';
  rhythm_changes: Array<{
    at_second: number;
    new_tempo: 'slow' | 'medium' | 'fast';
    reason: string;
  }>;
}

interface EnhancedScenePlan {
  id: string;
  sequence_number: number;
  duration_seconds: number;
  narrative_purpose: 'exposition' | 'rising_action' | 'climax' | 'falling_action' | 'resolution';
  visual_description: string;
  camera_movement: CameraMovement;
  lighting_style: LightingProfile;
  color_palette: ColorPalette;
  characters_present: string[];
  consistency_anchors: ConsistencyAnchor[];
  runway_prompt: string;
}

interface CameraMovement {
  type: string;
  speed: string;
  description: string;
}

interface LightingProfile {
  type: string;
  direction: string;
  mood: string;
}

interface ColorPalette {
  primary_colors: string[];
  secondary_colors: string[];
  mood_descriptor: string;
}

interface ConsistencyAnchor {
  type: 'character' | 'environment' | 'lighting' | 'color';
  reference_description: string;
  importance_weight: number;
  consistency_prompt: string;
}

interface ImageAnalysisResult {
  identityAnchors: string; // 完整的身份锚点描述
  subjectType: 'person' | 'object'; // 主体类型
  subjectDescriptor: string; // 简短的主体描述词（如 "necklace", "the woman" 等）
}

// ==================== 增强Gemini分析器 ====================
class GeminiEnhancedShotPlanner {
  private gemini: ChatGoogleGenerativeAI;
  private genAI: GoogleGenerativeAI;
  private visionModel: any;

  constructor() {
    // 检查API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set");
    }

    // 配置Gemini 2.5 Flash - 最新最快的版本
    this.gemini = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp", // 使用实验版获得最新功能
      temperature: 0.7,
      maxOutputTokens: 8192,
      topK: 40,
      topP: 0.95,
      apiKey: apiKey, // 显式传递API key
      // safetySettings可能在某些版本中有类型问题，暂时移除
      // safetySettings: [
      //   {
      //     category: "HARM_CATEGORY_HARASSMENT",
      //     threshold: "BLOCK_ONLY_HIGH"
      //   }
      // ]
    });

    // 多模态分析客户端
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.visionModel = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.6,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 4096,
      }
    });
  }

  async analyzeUserInput(userInput: string, referenceImages?: string[]): Promise<NarrativeAnalysis> {
    console.log('🧠 使用Gemini 2.5 Flash进行深度叙事分析...');

    // 步骤1：如果用户上传了参考图片，提取身份锚点和主体信息
    let imageAnalysis: ImageAnalysisResult | null = null;
    if (referenceImages && referenceImages.length > 0) {
      console.log(`🖼️ 检测到 ${referenceImages.length} 张参考图片，提取身份锚点...`);
      imageAnalysis = await this.analyzeReferenceImages(referenceImages);
    }

    // 步骤2：进行叙事分析
    const analysisPrompt = `
你是世界级的电影叙事分析专家。请深度分析以下用户的视频生成需求：

用户输入："${userInput}"
${imageAnalysis ? `\n**参考图片身份锚点**：${imageAnalysis.identityAnchors}\n\n⚠️ 重要：用户上传了参考图片。在分析角色/产品时，请基于上述身份锚点进行描述，确保所有镜头中的主体保持一致。` : ''}

请提供专业的叙事结构分析，输出严格的JSON格式：

{
  "genre": "视频类型（drama/action/comedy/documentary/fantasy/sci-fi等）",
  "narrative_structure": "叙事结构（linear/flashback/parallel/circular）",
  "characters": [
    {
      "id": "character_001",
      "name": "角色名称或描述",
      "physical_description": "详细外貌描述：年龄、性别、体型、肤色、发型、特征等",
      "clothing_style": "服装风格和颜色搭配",
      "distinctive_features": ["独特特征1", "独特特征2", "表情习惯"],
      "consistency_keywords": ["关键描述词1", "关键词2", "用于保持一致性"]
    }
  ],
  "setting": {
    "time_period": "时间设定（现代/历史/未来等）",
    "location": "地点设定（室内/室外/具体环境）",
    "atmosphere": "环境氛围描述",
    "lighting_conditions": "主要光照条件"
  },
  "emotional_arc": [
    {
      "timestamp": 0,
      "emotional_state": "开始情感状态",
      "intensity": 0.5,
      "visual_cues": "视觉表现要素"
    }
  ],
  "key_themes": ["主要主题1", "主要主题2"],
  "visual_style": {
    "color_scheme": "主色调方案（warm/cool/vibrant/muted等）",
    "cinematography_style": "摄影风格（cinematic/documentary/artistic/commercial）",
    "movement_style": "镜头运动偏好（static/dynamic/smooth/energetic）",
    "artistic_reference": "艺术参考风格"
  },
  "pacing_rhythm": {
    "overall_tempo": "整体节奏（slow/medium/fast）",
    "rhythm_changes": [
      {
        "at_second": 15,
        "new_tempo": "medium",
        "reason": "叙事需要或情感转折"
      }
    ]
  }
}

要求：
1. 输出必须是有效JSON格式
2. 所有字符串使用双引号
3. 角色描述要详细具体，便于视觉生成
4. 考虑视频连贯性的需求
5. 如果输入较简单，请合理推测和扩展内容
    `;

    try {
      const response = await this.gemini.invoke(analysisPrompt);
      const content = response.content as string;

      // 清理和解析JSON
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const analysis = JSON.parse(cleanedContent) as NarrativeAnalysis;

      // 将图片分析结果添加到分析结果中
      if (imageAnalysis) {
        analysis.identity_anchors = imageAnalysis.identityAnchors;
        analysis.subject_type = imageAnalysis.subjectType;
        analysis.subject_descriptor = imageAnalysis.subjectDescriptor;
      }

      console.log('✅ 叙事分析完成:', {
        genre: analysis.genre,
        structure: analysis.narrative_structure,
        charactersCount: analysis.characters?.length || 0,
        emotionalPoints: analysis.emotional_arc?.length || 0,
        visualStyle: analysis.visual_style?.cinematography_style,
        hasIdentityAnchors: !!imageAnalysis,
        subjectType: analysis.subject_type,
        subjectDescriptor: analysis.subject_descriptor
      });

      return analysis;
    } catch (error) {
      console.error('❌ Gemini叙事分析失败:', error);
      // 返回基础分析结果作为降级方案
      return this.generateBasicAnalysis(userInput);
    }
  }

  /**
   * 提取参考图片的身份锚点（Identity Anchors）
   *
   * 基于 VEO 3.1 最佳实践 (2025):
   * - 只提取主体的持久化特征（颜色、材质、风格等）
   * - 不描述场景、光照、构图
   * - 使用通用术语（"the subject", "the product", "the character"）
   * - 生成可在所有镜头中重复使用的描述
   */
  private async analyzeReferenceImages(imageUrls: string[]): Promise<ImageAnalysisResult | null> {
    try {
      // 下载第一张图片（主要参考）
      const imageUrl = imageUrls[0];
      console.log(`🔍 提取参考图片的身份锚点: ${imageUrl}`);

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.warn(`⚠️ 无法下载参考图片: ${imageResponse.statusText}`);
        return null;
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // 使用Gemini Vision提取身份锚点
      const analysisPrompt = `Analyze this image and extract the subject's identity information for video generation.

**TASK 1: Identify Subject Type and Descriptor**
First, determine:
1. **Is it a PERSON or an OBJECT?**
2. **Provide a SHORT descriptor for Shot 1 prefix**:
   - If PERSON: Use "the man", "the woman", "the boy", "the girl", "the people", or "the person"
   - If OBJECT: Use the specific object name (e.g., "necklace", "sports car", "coffee cup", "handbag")

**TASK 2: Extract Identity Anchors**
Then provide detailed identity anchors following VEO 3.1 best practices:
- Focus ONLY on the main subject (person, product, or object)
- Extract persistent identity features that remain constant across video shots
- DO NOT describe scene, lighting, camera angle, or composition
- DO NOT describe actions or movements

**Key Physical Features to extract**:
   - For products: material, color, shape, design style, distinctive details
   - For people: gender, approximate age, hair (color, length, style), clothing (type, color)
   - For objects: color, material, size category, distinctive patterns

**Output format** (strict JSON):
{
  "subject_type": "person" or "object",
  "subject_descriptor": "the woman" or "necklace" (SHORT descriptor for Shot 1),
  "identity_anchors": "The subject is a [type] with [key feature 1], [key feature 2], [key feature 3]. Notable characteristics: [distinctive detail 1], [distinctive detail 2]."
}

**Example outputs**:
{
  "subject_type": "object",
  "subject_descriptor": "necklace",
  "identity_anchors": "The product is a diamond necklace with graduated sizing, silver platinum chain, and brilliant-cut stones. Notable characteristics: intricate metalwork, sparkling facets."
}

{
  "subject_type": "person",
  "subject_descriptor": "the woman",
  "identity_anchors": "The character is a woman in her late 20s with shoulder-length wavy black hair, wearing a green bomber jacket and gold hoop earrings. Notable characteristics: confident posture, natural makeup."
}

{
  "subject_type": "object",
  "subject_descriptor": "sports car",
  "identity_anchors": "The subject is a red sports car with sleek aerodynamic design, glossy paint finish, and distinctive front grille. Notable characteristics: low profile, aggressive styling."
}

Provide ONLY the JSON output, nothing else.`;

      const visionResult = await this.visionModel.generateContent([
        analysisPrompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg'
          }
        }
      ]);

      const responseText = visionResult.response.text().trim();
      
      // 清理JSON响应
      const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const analysisResult = JSON.parse(cleanedResponse);
      
      console.log(`✅ 图片分析完成:`, {
        subjectType: analysisResult.subject_type,
        descriptor: analysisResult.subject_descriptor,
        anchors: analysisResult.identity_anchors.substring(0, 100) + '...'
      });

      return {
        identityAnchors: analysisResult.identity_anchors,
        subjectType: analysisResult.subject_type,
        subjectDescriptor: analysisResult.subject_descriptor
      };
    } catch (error) {
      console.error('❌ 身份锚点提取失败:', error);
      return null;
    }
  }

  async generateEnhancedScenes(
    analysis: NarrativeAnalysis,
    targetDuration: number,
    ratio: string,
    hasUserUploadedImage: boolean = false
  ): Promise<EnhancedScenePlan[]> {
    console.log('🎬 使用Gemini 2.5 Flash生成增强场景规划...');

    // 计算合理的场景数量
    const segmentCount = this.calculateOptimalSegments(targetDuration);
    const segmentDuration = targetDuration / segmentCount;

    // 如果有身份锚点，生成特殊指令
    const identityAnchorsNote = analysis.identity_anchors ? `
⚠️ **CRITICAL - IDENTITY ANCHORS (Character/Product Consistency)**:
${analysis.identity_anchors}

**MANDATORY REQUIREMENTS for ALL scenes**:
1. Include the identity anchor description in EVERY scene prompt
2. Use consistent descriptor: "${analysis.identity_anchors.split('.')[0]}." at the start of each scene
3. Maintain visual consistency: same colors, same materials, same distinctive features
4. Example: "${analysis.identity_anchors.split('.')[0]}. Camera slowly zooms in..."
5. DO NOT alter or reinterpret the subject's appearance across scenes

This ensures VEO 3.1 generates consistent subject appearance across all video segments.
` : '';

    const scenePrompt = `
基于以下深度叙事分析，生成${segmentCount}个高质量的视频场景分镜计划：

叙事分析：
${JSON.stringify(analysis, null, 2)}

技术参数：
- 目标总时长：${targetDuration}秒
- 场景数量：${segmentCount}个
- 每段平均时长：${segmentDuration.toFixed(1)}秒
- 视频比例：${ratio}
${identityAnchorsNote}

请生成详细的场景分镜计划，输出JSON格式：

{
  "scenes": [
    {
      "id": "scene_001",
      "sequence_number": 1,
      "duration_seconds": ${segmentDuration.toFixed(1)},
      "narrative_purpose": "exposition",
      "visual_description": "完整的场景视觉描述，包含环境、角色、动作、情绪",
      "camera_movement": {
        "type": "static|pan_left|pan_right|tilt_up|tilt_down|zoom_in|zoom_out|dolly_forward|dolly_back|orbit|crane_up|crane_down",
        "speed": "slow|medium|fast",
        "description": "具体的镜头运动描述"
      },
      "lighting_style": {
        "type": "natural|cinematic|dramatic|soft|hard|golden_hour|blue_hour",
        "direction": "front|back|side|top|bottom|rim|mixed",
        "mood": "bright|dim|moody|ethereal|harsh|warm"
      },
      "color_palette": {
        "primary_colors": ["#FF6B6B", "#4ECDC4"],
        "secondary_colors": ["#45B7D1"],
        "mood_descriptor": "warm|cool|neutral|vibrant|muted|desaturated"
      },
      "characters_present": ["character_001"],
      "consistency_anchors": [
        {
          "type": "character",
          "reference_description": "确保角色外观一致性的关键描述",
          "importance_weight": 0.9,
          "consistency_prompt": "用于保持视觉一致性的关键提示词"
        }
      ],
      "runway_prompt": "为Runway优化的英文生成提示词，包含所有重要视觉信息，确保高质量生成"
    }
  ]
}

重要要求：
1. 每个scene的runway_prompt必须是高质量的英文描述
2. 确保角色描述在各场景间保持一致
3. 考虑场景间的自然过渡和情感连贯
4. 根据叙事弧线安排narrative_purpose
5. 输出必须是有效JSON格式
6. runway_prompt要详细但简洁，适合视频生成AI理解
    `;

    try {
      const response = await this.gemini.invoke(scenePrompt);
      const content = response.content as string;

      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const sceneResult = JSON.parse(cleanedContent);

      console.log('✅ 场景规划完成:', {
        scenesGenerated: sceneResult.scenes?.length || 0,
        totalDuration: sceneResult.scenes?.reduce((sum: number, s: any) => sum + s.duration_seconds, 0) || 0
      });

      return sceneResult.scenes as EnhancedScenePlan[];
    } catch (error) {
      console.error('❌ Gemini场景规划失败:', error);
      return this.generateBasicScenes(analysis, targetDuration, segmentCount);
    }
  }

  async optimizeForConsistency(
    scenes: EnhancedScenePlan[],
    analysis: NarrativeAnalysis
  ): Promise<EnhancedScenePlan[]> {
    console.log('🔄 使用Gemini优化视觉一致性...');

    const optimizationPrompt = `
作为专业的视频一致性优化专家，请优化以下场景序列的视觉一致性：

原始叙事分析：
${JSON.stringify(analysis, null, 2)}

当前场景计划：
${JSON.stringify(scenes, null, 2)}

请优化每个场景的runway_prompt，确保：
1. 角色外观在所有场景中完全一致（服装、发型、年龄、体型等）
2. 环境风格和色调保持连贯
3. 光照风格协调统一
4. 镜头风格保持一致性

请输出优化后的JSON格式：
{
  "optimized_scenes": [
    {
      "id": "scene_001",
      "optimized_runway_prompt": "优化后的英文提示词，强调一致性要素"
    }
  ]
}

要求：
1. 保持原有的创意和叙事逻辑
2. 强化视觉一致性元素
3. 确保英文提示词质量
4. 输出有效JSON格式
    `;

    try {
      const response = await this.gemini.invoke(optimizationPrompt);
      const content = response.content as string;

      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const optimizationResult = JSON.parse(cleanedContent);

      // 应用优化结果
      const optimizedScenes = scenes.map(scene => {
        const optimized = optimizationResult.optimized_scenes.find((opt: any) => opt.id === scene.id);
        if (optimized) {
          return {
            ...scene,
            runway_prompt: optimized.optimized_runway_prompt
          };
        }
        return scene;
      });

      console.log('✅ 一致性优化完成');
      return optimizedScenes;
    } catch (error) {
      console.error('❌ 一致性优化失败，使用原始场景:', error);
      return scenes;
    }
  }

  private calculateOptimalSegments(targetDuration: number): number {
    // 根据LLMScheAgent.md的FramePack策略优化分段
    if (targetDuration <= 20) {
      return 3; // 短视频3段
    } else if (targetDuration <= 40) {
      return Math.ceil(targetDuration / 8); // 每段约8秒
    } else {
      return Math.min(8, Math.ceil(targetDuration / 7)); // 长视频最多8段，每段约7秒
    }
  }

  private generateBasicAnalysis(userInput: string): NarrativeAnalysis {
    // 降级方案：基础分析结构
    return {
      genre: "general",
      narrative_structure: "linear",
      characters: [{
        id: "character_001",
        name: "main subject",
        physical_description: "person in the scene",
        clothing_style: "appropriate attire",
        distinctive_features: ["expressive face"],
        consistency_keywords: ["consistent appearance"]
      }],
      setting: {
        time_period: "modern",
        location: "appropriate setting",
        atmosphere: "natural",
        lighting_conditions: "natural lighting"
      },
      emotional_arc: [{
        timestamp: 0,
        emotional_state: "neutral",
        intensity: 0.5,
        visual_cues: "natural expression"
      }],
      key_themes: ["main narrative"],
      visual_style: {
        color_scheme: "natural",
        cinematography_style: "cinematic",
        movement_style: "smooth",
        artistic_reference: "professional"
      },
      pacing_rhythm: {
        overall_tempo: "medium",
        rhythm_changes: []
      }
    };
  }

  private generateBasicScenes(
    analysis: NarrativeAnalysis,
    targetDuration: number,
    segmentCount: number
  ): EnhancedScenePlan[] {
    // 降级方案：基础场景生成
    const segmentDuration = targetDuration / segmentCount;
    const scenes: EnhancedScenePlan[] = [];

    for (let i = 0; i < segmentCount; i++) {
      scenes.push({
        id: `scene_${(i + 1).toString().padStart(3, '0')}`,
        sequence_number: i + 1,
        duration_seconds: segmentDuration,
        narrative_purpose: i === 0 ? 'exposition' : i === segmentCount - 1 ? 'resolution' : 'rising_action',
        visual_description: `Scene ${i + 1} of the narrative`,
        camera_movement: {
          type: i % 2 === 0 ? "static" : "dolly_forward",
          speed: "medium",
          description: "smooth camera movement"
        },
        lighting_style: {
          type: "cinematic",
          direction: "front",
          mood: "natural"
        },
        color_palette: {
          primary_colors: ["#8B9DC3", "#F7DBA7"],
          secondary_colors: ["#F69E7B"],
          mood_descriptor: "warm"
        },
        characters_present: ["character_001"],
        consistency_anchors: [{
          type: "character",
          reference_description: "consistent character appearance",
          importance_weight: 0.8,
          consistency_prompt: "maintain visual consistency"
        }],
        runway_prompt: `Professional cinematic scene, high quality, detailed environment, consistent lighting, segment ${i + 1} of narrative sequence`
      });
    }

    return scenes;
  }
}

// ==================== 主导出函数 ====================
export async function generateEnhancedShotPlan(
  userPrompt: string,
  targetSeconds: number = 30,
  ratio: string = '1280:768',
  referenceImages?: string[] // 新增：用户上传的参考图片
): Promise<ShotPlan> {
  console.log(`🚀 启动Gemini 2.5 Flash增强叙事分解器`);
  console.log(`📝 处理输入: "${userPrompt}" (${targetSeconds}s, ${ratio})`);

  if (referenceImages && referenceImages.length > 0) {
    console.log(`🖼️ 检测到 ${referenceImages.length} 张参考图片，将在镜头规划中使用`);
  }

  const planner = new GeminiEnhancedShotPlanner();

  try {
    // 步骤1：深度叙事分析（包含参考图片分析）
    console.log('🧠 第一步：深度叙事分析');
    const narrativeAnalysis = await planner.analyzeUserInput(userPrompt, referenceImages);

    // 步骤2：生成增强场景计划
    console.log('🎬 第二步：生成增强场景计划');
    const hasUserUploadedImage = (referenceImages && referenceImages.length > 0);
    const scenePlans = await planner.generateEnhancedScenes(
      narrativeAnalysis,
      targetSeconds,
      ratio,
      hasUserUploadedImage
    );

    // 步骤3：优化视觉一致性
    console.log('🔄 第三步：优化视觉一致性');
    const optimizedScenes = await planner.optimizeForConsistency(scenePlans, narrativeAnalysis);

    // 步骤4：转换为标准输出格式
    console.log('📋 第四步：格式化输出');
    const shots = optimizedScenes.map((scene, index) => {
      let prompt = scene.runway_prompt;
      
      // 如果是 shot 1 且有参考图片，在提示词前面强行加入主体描述 + "based on the picture uploaded as reference"
      if (index === 0 && narrativeAnalysis.subject_descriptor) {
        const prefix = `${narrativeAnalysis.subject_descriptor} based on the picture uploaded as reference, `;
        prompt = prefix + prompt;
        console.log(`✨ Shot 1 添加参考图片前缀: "${prefix}"`);
      }
      
      return {
        id: index + 1,
        prompt: prompt,
        duration_s: Math.round(scene.duration_seconds),
        camera: scene.camera_movement.description || scene.camera_movement.type
      };
    });

    const totalDuration = shots.reduce((sum, shot) => sum + shot.duration_s, 0);

    const result: ShotPlan = {
      ratio,
      total_seconds: totalDuration,
      shots
    };

    console.log('🎉 Gemini 2.5 Flash增强方案完成:', {
      totalShots: shots.length,
      totalDuration: totalDuration,
      averageQuality: "enhanced",
      hasImageToVideo: hasUserUploadedImage,
      shots: shots.map(s => ({ id: s.id, duration: s.duration_s, camera: s.camera }))
    });

    return result;

  } catch (error) {
    console.error('❌ Gemini 2.5 Flash增强方案失败:', error);
    throw new Error(`Enhanced shot planning failed: ${error.message}`);
  }
}

// 导出类型定义
export type {
  ShotPlan,
  NarrativeAnalysis,
  EnhancedScenePlan,
  CharacterProfile
};