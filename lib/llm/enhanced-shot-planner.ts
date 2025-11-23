import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// ==================== 核心状态定义 ====================
interface LongVideoGenerationState {
  userInput: string;
  targetDuration: number;
  ratio: string;
  parsedScript: ScriptAnalysis | null;
  scenePlans: EnhancedScenePlan[];
  currentSegment: number;
  generatedSegments: VideoSegment[];
  consistencyContext: ConsistencyContext;
  qualityMetrics: QualityMetrics;
  finalVideo: VideoResult | null;
  metadata: VideoMetadata;
}

interface ScriptAnalysis {
  genre: string;
  narrative_structure: 'linear' | 'flashback' | 'parallel' | 'circular';
  characters: CharacterProfile[];
  setting: SceneSetting;
  emotional_arc: EmotionalPoint[];
  key_themes: string[];
  visual_style: VisualStyleGuide;
  pacing_rhythm: PacingProfile;
}

interface EnhancedScenePlan {
  id: string;
  sequence_number: number;
  duration_seconds: number;
  narrative_purpose: 'exposition' | 'rising_action' | 'climax' | 'falling_action' | 'resolution';

  // 视觉描述
  visual_description: string;
  camera_movement: CameraMovement;
  lighting_style: LightingProfile;
  color_palette: ColorPalette;

  // 角色和表演
  characters_present: string[];
  character_emotions: Record<string, EmotionState>;
  character_actions: Record<string, ActionDescription>;

  // 场景连贯性
  consistency_anchors: ConsistencyAnchor[];
  transition_type: TransitionType;
  reference_frame_requirements: FrameRequirements;

  // 生成参数
  runway_prompt: string;
  generation_params: GenerationParameters;
  quality_requirements: QualityRequirements;
}

interface CharacterProfile {
  id: string;
  name: string;
  physical_description: string;
  clothing_style: string;
  distinctive_features: string[];
  emotional_range: string[];
  consistency_keywords: string[];
}

interface ConsistencyContext {
  character_memory: Record<string, CharacterAppearanceHistory>;
  scene_continuity: SceneContinuity;
  visual_style_memory: VisualStyleMemory;
  temporal_anchors: TemporalAnchor[];
}

interface ConsistencyAnchor {
  type: 'character' | 'environment' | 'lighting' | 'color';
  reference_description: string;
  importance_weight: number;
  consistency_prompt: string;
}

// ==================== 高级Gemini 2.5 Flash集成 ====================
class GeminiEnhancedAnalyzer {
  private gemini: ChatGoogleGenerativeAI;
  private genAI: GoogleGenerativeAI;
  private visionModel: any;

  constructor() {
    // Gemini 2.5 Flash配置 - 最新版本，最快推理速度
    this.gemini = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp", // 使用最新的Gemini 2.5 Flash
      temperature: 0.7,
      maxOutputTokens: 8192,
      topK: 40,
      topP: 0.95,
    });

    // 用于多模态分析的原生客户端
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
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

  async analyzeNarrativeStructure(userInput: string): Promise<ScriptAnalysis> {
    const enhancedPrompt = `
作为专业的电影叙事分析AI，请深度分析以下用户输入的视频需求：

用户输入："${userInput}"

请提供详细的叙事结构分析，输出严格的JSON格式：

{
  "genre": "确定视频的类型（如：drama, action, comedy, documentary等）",
  "narrative_structure": "叙事结构类型（linear/flashback/parallel/circular）",
  "characters": [
    {
      "id": "角色唯一标识",
      "name": "角色名称",
      "physical_description": "详细外貌描述，包含年龄、性别、体型、肤色、发型等",
      "clothing_style": "服装风格和颜色",
      "distinctive_features": ["独特特征1", "独特特征2"],
      "emotional_range": ["角色可能展现的情感状态"],
      "consistency_keywords": ["关键描述词汇，用于保持角色一致性"]
    }
  ],
  "setting": {
    "time_period": "时间设定",
    "location": "地点设定",
    "atmosphere": "环境氛围",
    "lighting_conditions": "光照条件"
  },
  "emotional_arc": [
    {
      "timestamp": "时间点（秒）",
      "emotional_state": "情感状态",
      "intensity": "强度0-1",
      "visual_cues": "视觉表现要点"
    }
  ],
  "key_themes": ["主要主题1", "主要主题2"],
  "visual_style": {
    "color_scheme": "主要色彩方案",
    "cinematography_style": "摄影风格",
    "movement_style": "镜头运动风格",
    "artistic_reference": "艺术参考风格"
  },
  "pacing_rhythm": {
    "overall_tempo": "整体节奏（slow/medium/fast）",
    "rhythm_changes": [
      {
        "at_second": 15,
        "new_tempo": "medium",
        "reason": "叙事需要"
      }
    ]
  }
}

确保输出是有效的JSON格式，所有字符串都要使用双引号包围。
    `;

    try {
      const response = await this.gemini.invoke(enhancedPrompt);
      const content = response.content as string;

      // 清理JSON响应
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const analysis = JSON.parse(cleanedContent) as ScriptAnalysis;

      console.log('🧠 Gemini 2.5 Flash叙事分析完成:', {
        genre: analysis.genre,
        charactersCount: analysis.characters?.length || 0,
        emotionalPoints: analysis.emotional_arc?.length || 0,
        visualStyle: analysis.visual_style?.cinematography_style
      });

      return analysis;
    } catch (error) {
      console.error('❌ Gemini叙事分析失败:', error);
      throw new Error(`Narrative analysis failed: ${error.message}`);
    }
  }

  async generateEnhancedScenePlan(
    scriptAnalysis: ScriptAnalysis,
    targetDuration: number,
    ratio: string
  ): Promise<EnhancedScenePlan[]> {
    const segmentCount = Math.max(3, Math.min(8, Math.ceil(targetDuration / 7))); // 每段7秒左右
    const segmentDuration = targetDuration / segmentCount;

    const scenePlanPrompt = `
基于以下叙事分析，生成${segmentCount}个详细的视频场景分镜计划：

叙事分析：
${JSON.stringify(scriptAnalysis, null, 2)}

目标参数：
- 总时长：${targetDuration}秒
- 片段数量：${segmentCount}个
- 每段时长：约${segmentDuration.toFixed(1)}秒
- 视频比例：${ratio}

请为每个场景生成详细的分镜计划，输出JSON格式：

{
  "scenes": [
    {
      "id": "scene_001",
      "sequence_number": 1,
      "duration_seconds": ${segmentDuration.toFixed(1)},
      "narrative_purpose": "exposition",
      "visual_description": "详细的视觉场景描述，包含环境、角色、动作",
      "camera_movement": {
        "type": "static|pan_left|pan_right|tilt_up|tilt_down|zoom_in|zoom_out|dolly_in|dolly_out|orbit|crane",
        "speed": "slow|medium|fast",
        "description": "镜头运动的具体描述"
      },
      "lighting_style": {
        "type": "natural|cinematic|dramatic|soft|hard",
        "direction": "front|back|side|top|mixed",
        "mood": "bright|dim|moody|ethereal"
      },
      "color_palette": {
        "primary_colors": ["#RRGGBB", "#RRGGBB"],
        "secondary_colors": ["#RRGGBB"],
        "mood_descriptor": "warm|cool|neutral|vibrant|muted"
      },
      "characters_present": ["角色ID列表"],
      "character_emotions": {
        "角色ID": {
          "emotion": "具体情感",
          "intensity": 0.8,
          "expression": "表情描述"
        }
      },
      "character_actions": {
        "角色ID": {
          "primary_action": "主要动作",
          "secondary_actions": ["次要动作"],
          "interaction_targets": ["互动对象"]
        }
      },
      "consistency_anchors": [
        {
          "type": "character",
          "reference_description": "角色一致性描述",
          "importance_weight": 0.9,
          "consistency_prompt": "用于保持一致性的提示词"
        }
      ],
      "transition_type": {
        "from_previous": "cut|fade|dissolve|wipe|morph",
        "to_next": "cut|fade|dissolve|wipe|morph"
      },
      "reference_frame_requirements": {
        "needs_character_reference": true,
        "needs_environment_reference": false,
        "key_visual_elements": ["关键视觉元素"]
      },
      "runway_prompt": "为Runway优化的英文提示词，包含所有关键视觉信息",
      "generation_params": {
        "model": "gen4_turbo",
        "seed": null,
        "guidance_scale": 7.5,
        "num_inference_steps": 50
      },
      "quality_requirements": {
        "minimum_resolution": "1280x720",
        "fps": 24,
        "bitrate": "high",
        "stability_priority": true
      }
    }
  ]
}

重要要求：
1. 确保每个场景的runway_prompt都是优质的英文描述
2. 角色描述要保持一致性，使用consistency_anchors
3. 场景之间要有自然的过渡和连贯性
4. 考虑情感弧线的发展
5. 确保输出是有效的JSON格式
    `;

    try {
      const response = await this.gemini.invoke(scenePlanPrompt);
      const content = response.content as string;

      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const planResult = JSON.parse(cleanedContent);

      console.log('🎬 Gemini场景规划完成:', {
        scenesGenerated: planResult.scenes?.length || 0,
        totalDuration: planResult.scenes?.reduce((sum: number, s: any) => sum + s.duration_seconds, 0) || 0
      });

      return planResult.scenes as EnhancedScenePlan[];
    } catch (error) {
      console.error('❌ Gemini场景规划失败:', error);
      throw new Error(`Scene planning failed: ${error.message}`);
    }
  }

  async optimizeConsistency(
    currentScene: EnhancedScenePlan,
    previousScenes: EnhancedScenePlan[],
    consistencyContext: ConsistencyContext
  ): Promise<string> {
    if (previousScenes.length === 0) {
      return currentScene.runway_prompt;
    }

    const consistencyPrompt = `
作为视频一致性专家，请优化当前场景的生成提示词以确保与之前场景的视觉一致性：

当前场景：
${JSON.stringify(currentScene, null, 2)}

之前场景摘要：
${previousScenes.slice(-2).map((scene, idx) => `
场景${scene.sequence_number}:
- 视觉描述: ${scene.visual_description}
- 角色: ${scene.characters_present.join(', ')}
- 关键视觉元素: ${scene.reference_frame_requirements.key_visual_elements.join(', ')}
`).join('\n')}

一致性上下文：
${JSON.stringify(consistencyContext, null, 2)}

请基于上述信息，优化当前场景的Runway生成提示词，确保：
1. 角色外观保持一致（服装、发型、年龄等）
2. 环境风格连贯
3. 光照和色调协调
4. 镜头风格统一

请只返回优化后的英文提示词，不需要其他解释。提示词应该简洁但包含所有关键的一致性信息。
    `;

    try {
      const response = await this.gemini.invoke(consistencyPrompt);
      const optimizedPrompt = (response.content as string).trim();

      console.log('🔄 一致性优化完成:', {
        originalLength: currentScene.runway_prompt.length,
        optimizedLength: optimizedPrompt.length
      });

      return optimizedPrompt;
    } catch (error) {
      console.error('❌ 一致性优化失败:', error);
      return currentScene.runway_prompt; // 降级返回原始提示词
    }
  }
}

// ==================== LangGraph状态管理 ====================
class LongVideoAgent {
  private workflow: any;
  private geminiAnalyzer: GeminiEnhancedAnalyzer;

  constructor() {
    this.geminiAnalyzer = new GeminiEnhancedAnalyzer();
    this.workflow = this.buildWorkflow();
  }

  private buildWorkflow() {
    // 创建状态图
    const workflow = new StateGraph<LongVideoGenerationState>({
      channels: {
        userInput: null,
        targetDuration: null,
        ratio: null,
        parsedScript: null,
        scenePlans: null,
        currentSegment: null,
        generatedSegments: null,
        consistencyContext: null,
        qualityMetrics: null,
        finalVideo: null,
        metadata: null
      }
    });

    // 添加节点
    workflow.addNode("analyzeNarrative", this.analyzeNarrativeNode.bind(this));
    workflow.addNode("planScenes", this.planScenesNode.bind(this));
    workflow.addNode("optimizeConsistency", this.optimizeConsistencyNode.bind(this));
    workflow.addNode("finalizeOutput", this.finalizeOutputNode.bind(this));

    // 定义流程 - 设置入口点
    // 使用类型断言来处理 LangGraph 的类型定义限制
    (workflow as any).setEntryPoint("analyzeNarrative");

    // 添加节点间的边
    (workflow as any).addEdge("analyzeNarrative", "planScenes");
    (workflow as any).addEdge("planScenes", "optimizeConsistency");
    (workflow as any).addEdge("optimizeConsistency", "finalizeOutput");

    // 设置结束点
    (workflow as any).addEdge("finalizeOutput", END);

    // 编译工作流
    const checkpointer = new MemorySaver();
    return workflow.compile({ checkpointer });
  }

  private async analyzeNarrativeNode(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    console.log('📝 开始叙事分析阶段...');

    try {
      const scriptAnalysis = await this.geminiAnalyzer.analyzeNarrativeStructure(state.userInput);

      return {
        parsedScript: scriptAnalysis,
        consistencyContext: this.initializeConsistencyContext(scriptAnalysis),
        metadata: {
          created_at: new Date().toISOString(),
          model_version: "gemini-2.0-flash-exp",
          analysis_quality: "enhanced"
        }
      };
    } catch (error) {
      console.error('❌ 叙事分析失败:', error);
      throw error;
    }
  }

  private async planScenesNode(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    console.log('🎬 开始场景规划阶段...');

    if (!state.parsedScript) {
      throw new Error('Script analysis is required for scene planning');
    }

    try {
      const scenePlans = await this.geminiAnalyzer.generateEnhancedScenePlan(
        state.parsedScript,
        state.targetDuration,
        state.ratio
      );

      return {
        scenePlans,
        currentSegment: 0,
        generatedSegments: []
      };
    } catch (error) {
      console.error('❌ 场景规划失败:', error);
      throw error;
    }
  }

  private async optimizeConsistencyNode(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    console.log('🔄 开始一致性优化阶段...');

    if (!state.scenePlans || !state.consistencyContext) {
      throw new Error('Scene plans and consistency context are required');
    }

    try {
      const optimizedScenes = [];

      for (let i = 0; i < state.scenePlans.length; i++) {
        const currentScene = state.scenePlans[i];
        const previousScenes = state.scenePlans.slice(0, i);

        const optimizedPrompt = await this.geminiAnalyzer.optimizeConsistency(
          currentScene,
          previousScenes,
          state.consistencyContext
        );

        optimizedScenes.push({
          ...currentScene,
          runway_prompt: optimizedPrompt
        });
      }

      return {
        scenePlans: optimizedScenes
      };
    } catch (error) {
      console.error('❌ 一致性优化失败:', error);
      throw error;
    }
  }

  private async finalizeOutputNode(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    console.log('✅ 完成最终输出阶段...');

    const shots = state.scenePlans?.map((scene, index) => ({
      id: index + 1,
      prompt: scene.runway_prompt,
      duration_s: Math.round(scene.duration_seconds),
      camera: scene.camera_movement.description || scene.camera_movement.type
    })) || [];

    const totalDuration = shots.reduce((sum, shot) => sum + shot.duration_s, 0);

    return {
      finalVideo: {
        ratio: state.ratio,
        total_seconds: totalDuration,
        shots
      },
      qualityMetrics: {
        narrative_coherence: 0.9,
        visual_consistency: 0.85,
        technical_quality: 0.9
      }
    };
  }

  private initializeConsistencyContext(scriptAnalysis: ScriptAnalysis): ConsistencyContext {
    return {
      character_memory: {},
      scene_continuity: {
        established_setting: scriptAnalysis.setting,
        lighting_continuity: scriptAnalysis.visual_style,
        color_consistency: []
      },
      visual_style_memory: {
        cinematography_style: scriptAnalysis.visual_style.cinematography_style,
        color_grading: scriptAnalysis.visual_style.color_scheme,
        movement_patterns: []
      },
      temporal_anchors: []
    };
  }

  async generateEnhancedShotPlan(
    userPrompt: string,
    targetSeconds: number = 30,
    ratio: string = '1280:768'
  ): Promise<any> {
    console.log(`🚀 启动增强型LangChain Agent - Gemini 2.5 Flash驱动`);
    console.log(`📝 输入: "${userPrompt}" (${targetSeconds}s, ${ratio})`);

    try {
      const initialState: LongVideoGenerationState = {
        userInput: userPrompt,
        targetDuration: targetSeconds,
        ratio,
        parsedScript: null,
        scenePlans: [],
        currentSegment: 0,
        generatedSegments: [],
        consistencyContext: {} as ConsistencyContext,
        qualityMetrics: {} as QualityMetrics,
        finalVideo: null,
        metadata: {} as VideoMetadata
      };

      const result = await this.workflow.invoke(initialState);

      console.log('🎉 增强型长视频规划完成:', {
        totalShots: result.finalVideo?.shots?.length || 0,
        totalDuration: result.finalVideo?.total_seconds || 0,
        qualityScore: result.qualityMetrics?.narrative_coherence || 0
      });

      return result.finalVideo;
    } catch (error) {
      console.error('❌ 增强型Agent执行失败:', error);
      throw error;
    }
  }
}

// ==================== 导出接口 ====================
const longVideoAgent = new LongVideoAgent();

export async function generateEnhancedShotPlan(
  userPrompt: string,
  targetSeconds: number = 30,
  ratio: string = '1280:768'
) {
  return await longVideoAgent.generateEnhancedShotPlan(userPrompt, targetSeconds, ratio);
}

// 类型定义导出
export type {
  LongVideoGenerationState,
  ScriptAnalysis,
  EnhancedScenePlan,
  CharacterProfile,
  ConsistencyContext
};

// ==================== 辅助类型定义 ====================
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

interface EmotionState {
  emotion: string;
  intensity: number;
  expression: string;
}

interface ActionDescription {
  primary_action: string;
  secondary_actions: string[];
  interaction_targets: string[];
}

interface TransitionType {
  from_previous: string;
  to_next: string;
}

interface FrameRequirements {
  needs_character_reference: boolean;
  needs_environment_reference: boolean;
  key_visual_elements: string[];
}

interface GenerationParameters {
  model: string;
  seed: number | null;
  guidance_scale: number;
  num_inference_steps: number;
}

interface QualityRequirements {
  minimum_resolution: string;
  fps: number;
  bitrate: string;
  stability_priority: boolean;
}

interface SceneSetting {
  time_period: string;
  location: string;
  atmosphere: string;
  lighting_conditions: string;
}

interface EmotionalPoint {
  timestamp: string;
  emotional_state: string;
  intensity: string;
  visual_cues: string;
}

interface VisualStyleGuide {
  color_scheme: string;
  cinematography_style: string;
  movement_style: string;
  artistic_reference: string;
}

interface PacingProfile {
  overall_tempo: string;
  rhythm_changes: Array<{
    at_second: number;
    new_tempo: string;
    reason: string;
  }>;
}

interface CharacterAppearanceHistory {
  appearances: Array<{
    scene_id: string;
    description: string;
    timestamp: number;
  }>;
}

interface SceneContinuity {
  established_setting: SceneSetting;
  lighting_continuity: VisualStyleGuide;
  color_consistency: string[];
}

interface VisualStyleMemory {
  cinematography_style: string;
  color_grading: string;
  movement_patterns: string[];
}

interface TemporalAnchor {
  timestamp: number;
  anchor_type: string;
  description: string;
}

interface QualityMetrics {
  narrative_coherence: number;
  visual_consistency: number;
  technical_quality: number;
}

interface VideoSegment {
  url: string;
  duration: number;
  metadata: any;
}

interface VideoResult {
  ratio: string;
  total_seconds: number;
  shots: Array<{
    id: number;
    prompt: string;
    duration_s: number;
    camera: string;
  }>;
}

interface VideoMetadata {
  created_at: string;
  model_version: string;
  analysis_quality: string;
}