import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph/checkpoint/memory";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// 状态定义 - 基于LLMScheAgent.md的设计
interface LongVideoGenerationState {
  userInput: string;
  parsedScript?: ScriptAnalysis;
  scenePlans: ScenePlan[];
  currentSegment: number;
  generatedSegments: VideoSegment[];
  consistencyContext: ConsistencyContext;
  qualityMetrics: QualityMetrics;
  finalVideo?: string;
  targetDuration: number;
  ratio: string;
}

// 增强的Schema设计
interface ScriptAnalysis {
  theme: string;
  visualStyle: string;
  characterProfiles: CharacterProfile[];
  environmentSettings: EnvironmentSetting[];
  narrativeStructure: NarrativeArc[];
  keyEmotions: string[];
  pacing: 'slow' | 'medium' | 'fast';
}

interface ScenePlan {
  id: number;
  description: string;
  duration: number;
  segmentIndex: number;
  overlapFrames: number;
  keyframeDensity: number;
  consistencyAnchors: ConsistencyAnchor;
  cameraMovement: string;
  lightingStyle: string;
  visualElements: string[];
  transitionStyle?: string;
  emotionalTone: string;
}

interface CharacterProfile {
  id: string;
  name: string;
  appearance: {
    age: string;
    gender: string;
    hairColor: string;
    clothing: string;
    distinctiveFeatures: string[];
  };
  personality: string[];
  role: string;
}

interface EnvironmentSetting {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor' | 'mixed';
  atmosphere: string;
  colorPalette: string[];
  lighting: string;
  props: string[];
}

interface NarrativeArc {
  act: 'setup' | 'development' | 'climax' | 'resolution';
  duration: number;
  keyEvents: string[];
  emotionalIntensity: number;
}

interface ConsistencyAnchor {
  characterFeatures: string[];
  environmentStyle: string;
  colorPalette: string[];
  cameraAngle: string;
  lightingDirection: string;
}

interface VideoSegment {
  id: string;
  url: string;
  duration: number;
  metadata: any;
  consistencyScore: number;
}

interface ConsistencyContext {
  previousScenes: ScenePlan[];
  characterProfiles: CharacterProfile[];
  environmentContinuity: EnvironmentSetting[];
  visualStyle: string;
  recentFrames: Buffer[];
}

interface QualityMetrics {
  visualConsistency: number;
  narrativeCoherence: number;
  technicalQuality: number;
  overallScore: number;
}

// Gemini 2.5 Flash配置
class GeminiLongVideoAnalyzer {
  private gemini: ChatGoogleGenerativeAI;

  constructor() {
    this.gemini = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      temperature: 0.7,
      maxOutputTokens: 8192,
      topK: 40,
      topP: 0.95,
    });
  }

  async analyzeScriptAndPlan(userInput: string, targetDuration: number = 60): Promise<ScriptAnalysis> {
    const prompt = `
    作为专业的视频导演AI，深度分析以下用户输入并生成详细的视频制作计划：

    用户需求：${userInput}
    目标时长：${targetDuration}秒

    请生成包含以下内容的JSON格式输出：
    {
      "theme": "视频的核心主题",
      "visualStyle": "整体视觉风格描述",
      "characterProfiles": [
        {
          "id": "character_1",
          "name": "角色名称",
          "appearance": {
            "age": "年龄段",
            "gender": "性别",
            "hairColor": "发色",
            "clothing": "服装风格",
            "distinctiveFeatures": ["特征1", "特征2"]
          },
          "personality": ["性格特点1", "性格特点2"],
          "role": "在故事中的角色"
        }
      ],
      "environmentSettings": [
        {
          "id": "env_1",
          "name": "场景名称",
          "type": "indoor/outdoor/mixed",
          "atmosphere": "氛围描述",
          "colorPalette": ["#颜色1", "#颜色2"],
          "lighting": "光照风格",
          "props": ["道具1", "道具2"]
        }
      ],
      "narrativeStructure": [
        {
          "act": "setup",
          "duration": 15,
          "keyEvents": ["事件1", "事件2"],
          "emotionalIntensity": 3
        }
      ],
      "keyEmotions": ["情感1", "情感2"],
      "pacing": "slow/medium/fast"
    }

    确保输出是有效的JSON格式。
    `;

    try {
      const response = await this.gemini.invoke(prompt);
      const content = response.content as string;

      // 清理JSON响应
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```/g, "");
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error("Gemini script analysis error:", error);
      throw new Error("Failed to analyze script with Gemini");
    }
  }

  async generateDetailedScenePlans(scriptAnalysis: ScriptAnalysis, targetDuration: number, ratio: string): Promise<ScenePlan[]> {
    const prompt = `
    基于以下脚本分析，生成详细的分镜计划：

    脚本分析：${JSON.stringify(scriptAnalysis, null, 2)}
    总时长：${targetDuration}秒
    画面比例：${ratio}

    生成4-8个镜头，每个镜头8-12秒，确保：
    1. 视觉连贯性和角色一致性
    2. 情感节奏的合理分配
    3. 镜头运动和转场的流畅性
    4. 每个镜头都有明确的视觉描述（英文）

    返回JSON格式的镜头数组。
    `;

    try {
      const response = await this.gemini.invoke(prompt);
      const content = response.content as string;

      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```/g, "");
      const scenesData = JSON.parse(cleanedContent);

      return scenesData.scenes || scenesData;
    } catch (error) {
      console.error("Gemini scene planning error:", error);
      throw new Error("Failed to generate scene plans with Gemini");
    }
  }
}

// 场景规划Agent
class ScenePlanningAgent {
  private geminiAnalyzer: GeminiLongVideoAnalyzer;

  constructor() {
    this.geminiAnalyzer = new GeminiLongVideoAnalyzer();
  }

  async invoke(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    const { userInput, targetDuration, ratio } = state;

    console.log("📋 Advanced scene planning with Gemini 2.5 Flash...");

    try {
      // 第一步：深度分析脚本
      const scriptAnalysis = await this.geminiAnalyzer.analyzeScriptAndPlan(userInput, targetDuration);

      // 第二步：生成详细场景计划
      const scenePlans = await this.geminiAnalyzer.generateDetailedScenePlans(scriptAnalysis, targetDuration, ratio);

      // 第三步：优化时长分配和一致性锚点
      const optimizedScenes = this.optimizeSceneConsistency(scenePlans, scriptAnalysis);

      return {
        ...state,
        parsedScript: scriptAnalysis,
        scenePlans: optimizedScenes,
        consistencyContext: this.buildConsistencyContext(scriptAnalysis, optimizedScenes)
      };
    } catch (error) {
      console.error("❌ Scene planning failed:", error);
      // 降级到简化版本
      return this.fallbackScenePlanning(state);
    }
  }

  private optimizeSceneConsistency(scenes: any[], scriptAnalysis: ScriptAnalysis): ScenePlan[] {
    return scenes.map((scene, index) => ({
      id: index + 1,
      description: scene.description || scene.prompt,
      duration: scene.duration || 8,
      segmentIndex: index,
      overlapFrames: 6,
      keyframeDensity: 0.5,
      consistencyAnchors: {
        characterFeatures: scriptAnalysis.characterProfiles.map(c => c.appearance.distinctiveFeatures).flat(),
        environmentStyle: scriptAnalysis.environmentSettings[0]?.atmosphere || "",
        colorPalette: scriptAnalysis.environmentSettings[0]?.colorPalette || [],
        cameraAngle: scene.cameraAngle || "medium shot",
        lightingDirection: scene.lightingStyle || "natural"
      },
      cameraMovement: scene.cameraMovement || "static",
      lightingStyle: scene.lightingStyle || "natural",
      visualElements: scene.visualElements || [],
      transitionStyle: scene.transitionStyle,
      emotionalTone: scene.emotionalTone || "neutral"
    }));
  }

  private buildConsistencyContext(scriptAnalysis: ScriptAnalysis, scenes: ScenePlan[]): ConsistencyContext {
    return {
      previousScenes: [],
      characterProfiles: scriptAnalysis.characterProfiles,
      environmentContinuity: scriptAnalysis.environmentSettings,
      visualStyle: scriptAnalysis.visualStyle,
      recentFrames: []
    };
  }

  private fallbackScenePlanning(state: LongVideoGenerationState): Partial<LongVideoGenerationState> {
    // 简化版降级方案
    const segmentCount = Math.ceil(state.targetDuration / 10);
    const fallbackScenes: ScenePlan[] = [];

    for (let i = 0; i < segmentCount; i++) {
      fallbackScenes.push({
        id: i + 1,
        description: `${state.userInput} - segment ${i + 1}`,
        duration: state.targetDuration / segmentCount,
        segmentIndex: i,
        overlapFrames: 6,
        keyframeDensity: 0.5,
        consistencyAnchors: {
          characterFeatures: [],
          environmentStyle: "",
          colorPalette: [],
          cameraAngle: "medium shot",
          lightingDirection: "natural"
        },
        cameraMovement: "static",
        lightingStyle: "natural",
        visualElements: [],
        emotionalTone: "neutral"
      });
    }

    return {
      ...state,
      scenePlans: fallbackScenes,
      consistencyContext: {
        previousScenes: [],
        characterProfiles: [],
        environmentContinuity: [],
        visualStyle: "cinematic",
        recentFrames: []
      }
    };
  }
}

// 视频生成Agent
class VideoGenerationAgent {
  constructor() {
    // 将在实际调用时注入Runway客户端
  }

  async invoke(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    const { currentSegment, scenePlans, consistencyContext } = state;

    if (currentSegment >= scenePlans.length) {
      return state;
    }

    const currentScene = scenePlans[currentSegment];

    console.log(`🎬 Generating enhanced segment ${currentSegment + 1}/${scenePlans.length}`);

    // 构建增强的提示词
    const enhancedPrompt = this.buildEnhancedPrompt(currentScene, consistencyContext);

    // 生成视频片段（这里会调用实际的Runway API）
    const videoSegment: VideoSegment = {
      id: `segment_${currentSegment + 1}`,
      url: `temp_url_${currentSegment}`, // 临时URL，实际实现会调用Runway
      duration: currentScene.duration,
      metadata: {
        scene: currentScene,
        prompt: enhancedPrompt
      },
      consistencyScore: 0.85 // 临时值
    };

    return {
      ...state,
      generatedSegments: [...state.generatedSegments, videoSegment],
      currentSegment: currentSegment + 1,
      consistencyContext: this.updateConsistencyContext(consistencyContext, currentScene)
    };
  }

  private buildEnhancedPrompt(scene: ScenePlan, context: ConsistencyContext): string {
    let prompt = scene.description;

    // 添加一致性指导
    if (context.characterProfiles.length > 0) {
      const mainCharacter = context.characterProfiles[0];
      prompt += `, featuring ${mainCharacter.appearance.age} ${mainCharacter.appearance.gender} with ${mainCharacter.appearance.hairColor} hair wearing ${mainCharacter.appearance.clothing}`;
    }

    // 添加环境连续性
    if (context.environmentContinuity.length > 0) {
      const environment = context.environmentContinuity[0];
      prompt += `, ${environment.atmosphere} ${environment.type} setting with ${environment.lighting} lighting`;
    }

    // 添加技术规格
    prompt += `, ${scene.cameraMovement} camera, ${scene.lightingStyle} lighting, ${scene.emotionalTone} mood, cinematic quality`;

    return prompt;
  }

  private updateConsistencyContext(context: ConsistencyContext, scene: ScenePlan): ConsistencyContext {
    return {
      ...context,
      previousScenes: [...context.previousScenes, scene].slice(-3) // 保持最近3个场景的记忆
    };
  }
}

// 一致性控制Agent
class ConsistencyControlAgent {
  async invoke(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    const { generatedSegments } = state;

    if (generatedSegments.length < 2) {
      return state;
    }

    console.log("🔍 Analyzing visual consistency...");

    // 计算一致性指标
    const qualityMetrics = this.calculateQualityMetrics(generatedSegments);

    return {
      ...state,
      qualityMetrics
    };
  }

  private calculateQualityMetrics(segments: VideoSegment[]): QualityMetrics {
    // 简化的质量评估
    const avgConsistencyScore = segments.reduce((sum, seg) => sum + seg.consistencyScore, 0) / segments.length;

    return {
      visualConsistency: avgConsistencyScore,
      narrativeCoherence: 0.8, // 临时值
      technicalQuality: 0.85,  // 临时值
      overallScore: (avgConsistencyScore + 0.8 + 0.85) / 3
    };
  }
}

// 视频合并Agent
class VideoMergerAgent {
  async invoke(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    const { generatedSegments } = state;

    console.log("🔗 Merging video segments with advanced consistency...");

    // 这里会调用实际的视频合并逻辑
    const finalVideoUrl = `merged_video_${Date.now()}.mp4`; // 临时URL

    return {
      ...state,
      finalVideo: finalVideoUrl
    };
  }
}

// 条件判断函数
function shouldContinueGeneration(state: LongVideoGenerationState): string {
  const { currentSegment, scenePlans } = state;
  return currentSegment < scenePlans.length ? "continue" : "merge";
}

// 输入解析Agent
class InputParserAgent {
  async invoke(state: LongVideoGenerationState): Promise<Partial<LongVideoGenerationState>> {
    // 解析用户输入，提取时长等信息
    const durationMatch = state.userInput.match(/(\d+)s|(\d+)秒/);
    const targetDuration = durationMatch ? parseInt(durationMatch[1] || durationMatch[2]) : 60;

    return {
      ...state,
      targetDuration,
      currentSegment: 0,
      generatedSegments: [],
      consistencyContext: {
        previousScenes: [],
        characterProfiles: [],
        environmentContinuity: [],
        visualStyle: "cinematic",
        recentFrames: []
      }
    };
  }
}

// 创建增强的视频生成Graph
export function createEnhancedVideoGenerationGraph() {
  const workflow = new StateGraph<LongVideoGenerationState>({
    channels: {
      userInput: null,
      parsedScript: null,
      scenePlans: null,
      currentSegment: null,
      generatedSegments: null,
      consistencyContext: null,
      qualityMetrics: null,
      finalVideo: null,
      targetDuration: null,
      ratio: null
    }
  });

  // 添加Agent节点
  workflow.addNode("parseInput", new InputParserAgent());
  workflow.addNode("planScenes", new ScenePlanningAgent());
  workflow.addNode("generateSegments", new VideoGenerationAgent());
  workflow.addNode("ensureConsistency", new ConsistencyControlAgent());
  workflow.addNode("mergeVideo", new VideoMergerAgent());

  // 定义工作流边
  workflow.addEdge("parseInput", "planScenes");
  workflow.addEdge("planScenes", "generateSegments");
  workflow.addConditionalEdges(
    "generateSegments",
    shouldContinueGeneration,
    {
      continue: "generateSegments",
      merge: "ensureConsistency"
    }
  );
  workflow.addEdge("ensureConsistency", "mergeVideo");

  workflow.setEntryPoint("parseInput");
  workflow.setFinishPoint("mergeVideo");

  // 编译并返回
  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}

// 主要导出函数 - 兼容现有接口
export async function generateEnhancedShotPlan(
  userPrompt: string,
  targetSeconds: number = 60,
  ratio: string = "1280:720"
): Promise<{
  ratio: string;
  total_seconds: number;
  shots: Array<{
    id: number;
    prompt: string;
    duration_s: number;
    camera: string;
  }>;
}> {
  console.log(`🎬 Enhanced shot planning with LangChain for: "${userPrompt}"`);

  try {
    const graph = createEnhancedVideoGenerationGraph();

    const initialState: LongVideoGenerationState = {
      userInput: userPrompt,
      scenePlans: [],
      currentSegment: 0,
      generatedSegments: [],
      consistencyContext: {
        previousScenes: [],
        characterProfiles: [],
        environmentContinuity: [],
        visualStyle: "cinematic",
        recentFrames: []
      },
      qualityMetrics: {
        visualConsistency: 0,
        narrativeCoherence: 0,
        technicalQuality: 0,
        overallScore: 0
      },
      targetDuration: targetSeconds,
      ratio
    };

    const result = await graph.invoke(initialState);

    // 转换为兼容格式
    const compatibleShots = result.scenePlans.map(scene => ({
      id: scene.id,
      prompt: scene.description,
      duration_s: Math.round(scene.duration),
      camera: scene.cameraMovement
    }));

    return {
      ratio,
      total_seconds: targetSeconds,
      shots: compatibleShots
    };

  } catch (error) {
    console.error("❌ Enhanced shot planning failed:", error);

    // 降级到原有方案
    const { generateShotPlan } = await import("./shot-planner");
    return await generateShotPlan(userPrompt, targetSeconds, ratio);
  }
}

export { ScenePlanningAgent, VideoGenerationAgent, ConsistencyControlAgent, VideoMergerAgent };