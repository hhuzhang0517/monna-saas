
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { TopNavigationBar } from '@/components/TopNavigationBar';
import { getAssetUrl, getApiUrl } from '@/config/api';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { LoginModal } from '@/components/LoginModal';
import { ResultPreviewModal } from '@/components/ResultPreviewModal';
import { VideoUploadDialog } from '@/components/VideoUploadDialog';

const { width } = Dimensions.get('window');
const cardWidth = width - 32; // 每行显示一个卡片（左右各16px padding）
type Category = 'effects' | 'animation' | 'fantasy';

interface VideoTemplate {
  id: string;
  title: string;
  thumbnail: string;
  video: string;
  category: string;
  prompt: string;
  fixedImage?: string;
  imageToVideo?: boolean; // 是否为图片转视频模式
}

// 从Web版迁移的完整视频模板数据
const VIDEO_TEMPLATE_DATA = {
  effects: [
    { id: "effects-1", title: "切换到冬天", thumbnail: getAssetUrl("figma-designs/videos/effects/11-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/11.mp4"), category: "switchToWinter", prompt: "change the video background to cold snowing scene at half of the video" },
    { id: "effects-2", title: "切换到秋天", thumbnail: getAssetUrl("figma-designs/videos/effects/22-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/22.mp4"), category: "switchToAutumn", prompt: "change the video background to The Autumn forest scene at half of the video" },
    { id: "effects-3", title: "切换到春天", thumbnail: getAssetUrl("figma-designs/videos/effects/33-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/33.mp4"), category: "switchToSpring", prompt: "change the video background to The prairie full of spring scene at half of the video" },
    { id: "effects-4", title: "沙尘暴", thumbnail: getAssetUrl("figma-designs/videos/effects/car_1-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/car_1.mp4"), category: "switchToSandstorm", prompt: "从视频的5秒开始将原背景换成沙尘暴背景" },
    { id: "effects-5", title: "下雨天", thumbnail: getAssetUrl("figma-designs/videos/effects/rain-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/rain.mp4"), category: "switchToRain", prompt: "将视频从5秒开始由当前天气切换到下雨天" },
    { id: "effects-6", title: "日落", thumbnail: getAssetUrl("figma-designs/videos/effects/sunset-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/sunset.mp4"), category: "switchToSunset", prompt: "背景切换到日落" },
    { id: "effects-7", title: "深海", thumbnail: getAssetUrl("figma-designs/videos/effects/ocean-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/ocean.mp4"), category: "switchToOcean", prompt: "change the video background to deep ocean underwater scene" },
    { id: "effects-8", title: "太空", thumbnail: getAssetUrl("figma-designs/videos/effects/space-frame1.jpg"), video: getAssetUrl("figma-designs/videos/effects/space.mp4"), category: "switchToSpace", prompt: "change the video background to outer space with stars and galaxies" },
    { id: "effects-9", title: "森林", thumbnail: getAssetUrl("figma-designs/videos/effects/forest-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/forest.mp4"), category: "switchToForest", prompt: "change the video background to dense mystical forest scene" },
    { id: "effects-10", title: "城市夜景", thumbnail: getAssetUrl("figma-designs/videos/effects/citynight-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/citynight.mp4"), category: "switchToCityNight", prompt: "change the video background to city night scene with neon lights" },
    { id: "effects-11", title: "高山", thumbnail: getAssetUrl("figma-designs/videos/effects/mountain-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/mountain.mp4"), category: "switchToMountain", prompt: "change the video background to majestic mountain peaks with clouds" },
    { id: "effects-12", title: "火焰特效", thumbnail: getAssetUrl("figma-designs/videos/effects/fire-frame1.png"), video: getAssetUrl("figma-designs/videos/effects/fire.mp4"), category: "addFireEffect", prompt: "add dramatic fire effects around the subject" },
  ],
  animation: [
    { id: "animation-1", title: "换脸", thumbnail: getAssetUrl("figma-designs/videos/animation/replace_face_demo-frame1.png"), video: getAssetUrl("figma-designs/videos/animation/replace_face_demo.mp4"), category: "videoAnimation", prompt: "replace the face in the Video with face in image, The mouth shape and facial expression remain unchanged when speaking" },
    { id: "animation-2", title: "3D动画", thumbnail: getAssetUrl("figma-designs/videos/animation/replace_face_orign-frame1.png"), video: getAssetUrl("figma-designs/videos/animation/replace_face_orign.mp4"), category: "videoAnimation", prompt: "3D animation sequence, realistic motion, professional quality" },
  ],
  fantasy: [
    { id: "fantasy-8", title: "花瓣消散", thumbnail: getAssetUrl("figma-designs/videos/fantasy/thumbnail-8.jpg"), video: getAssetUrl("figma-designs/videos/fantasy/video-8.mp4"), category: "petalDissolve", prompt: "将视频中的人物从肩膀和脸部开始以花瓣飞扬的效果消散，肩膀和脸部开始，随着她的手逐渐消散，玫瑰花滑落向下坠落，移出了画面，身形继续一点一点地消失，整个过程流畅自然" },
    { id: "fantasy-7", title: "换衣服", thumbnail: getAssetUrl("figma-designs/videos/fantasy/thumbnail-7.jpg"), video: getAssetUrl("figma-designs/videos/fantasy/video-7.mp4"), category: "changeClothes", prompt: "将视频中人物穿着换成如图片所展示的衣服" },
    { id: "fantasy-3", title: "老照片动起来", thumbnail: getAssetUrl("figma-designs/videos/fantasy/thumbnail-3.jpg"), video: getAssetUrl("figma-designs/videos/fantasy/video-3.mp4"), category: "oldPhotoAnimation", prompt: "bring the photo to life with subtle realistic movements, gentle animation effects, make the scene come alive naturally, cinematic quality", imageToVideo: true },
    { id: "fantasy-1", title: "火球特效", thumbnail: getAssetUrl("figma-designs/videos/fantasy/thumbnail-1.jpg"), video: getAssetUrl("figma-designs/videos/fantasy/video-1.mp4"), category: "generateFireballs", prompt: "generate magical fire balls floating around the subject, mystical fire magic effects, fantasy flame elements, cinematic lighting" },
    { id: "fantasy-2", title: "爆炸效果", thumbnail: getAssetUrl("figma-designs/videos/fantasy/thumbnail-2.jpg"), video: getAssetUrl("figma-designs/videos/fantasy/video-2.mp4"), category: "explosion", prompt: "create dramatic explosion effects in the video scene, dynamic blast effects, cinematic destruction", fixedImage: getAssetUrl("figma-designs/videos/fantasy/thumbnail-2.jpg") },
    { id: "fantasy-9", title: "动漫风格", thumbnail: getAssetUrl("figma-designs/videos/fantasy/thumbnail-9.jpg"), video: getAssetUrl("figma-designs/videos/fantasy/video-9.mp4"), category: "animeStyleVideo", prompt: "将视频转换成动漫风格" },
    { id: "fantasy-10", title: "木偶风格", thumbnail: getAssetUrl("figma-designs/videos/fantasy/thumbnail-10.jpg"), video: getAssetUrl("figma-designs/videos/fantasy/video-10.mp4"), category: "puppetStyle", prompt: "将视频转换成木偶风格" },
    { id: "fantasy-13", title: "植物生长", thumbnail: getAssetUrl("figma-designs/videos/fantasy/thumbnail-13.jpg"), video: getAssetUrl("figma-designs/videos/fantasy/video-13.mp4"), category: "plantGrowth", prompt: "视频中的植物逐渐生长，看起来像快进，要求整个植物看起来很自然地快速长高，变得枝繁叶茂" },
  ],
};

type CategoryLabel = {
  id: Category;
  label: string;
};

export default function VideoGenerationScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category>('effects');
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const categories: CategoryLabel[] = [
    { id: 'effects', label: '特效' },
    { id: 'animation', label: '角色' },
    { id: 'fantasy', label: '幻想' },
  ];

  const filteredTemplates = VIDEO_TEMPLATE_DATA[selectedCategory];

  // 处理模板点击
  const handleTemplateClick = (template: VideoTemplate) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    setSelectedTemplate(template);
    setShowUploadDialog(true);
  };

  // 登录成功后的回调
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (selectedTemplate) {
      setShowUploadDialog(true);
    }
  };

  // 处理视频生成
  const handleGenerate = async (files: { video?: string; image?: string }) => {
    if (!selectedTemplate) return;

    setShowUploadDialog(false);
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('请先登录后再使用此功能');
      }

      // 根据模板类型决定上传什么
      let videoUrl, imageUrl;

      if (selectedTemplate.imageToVideo) {
        // 图片转视频：上传图片
        if (!files.image) {
          throw new Error('请上传图片');
        }
        imageUrl = await uploadImage(files.image);
      } else if (selectedCategory === 'animation') {
        // 角色迁移：需要视频和图片
        if (!files.video || !files.image) {
          throw new Error('请上传视频和图片');
        }
        videoUrl = await uploadVideo(files.video);
        imageUrl = await uploadImage(files.image);
      } else {
        // 特效和幻想：上传视频
        if (!files.video) {
          throw new Error('请上传视频');
        }
        videoUrl = await uploadVideo(files.video);
      }

      // 构建增强的prompt（与Web端保持一致）
      const fileType = (selectedCategory === 'effects' || (selectedCategory === 'fantasy' && !selectedTemplate.imageToVideo))
        ? "video"
        : "reference image";
      const enhancedPrompt = `${selectedTemplate.prompt}, based on uploaded ${fileType}, create dynamic video content, high quality, professional result`;

      // 📋 调试日志：打印上传结果
      console.log('📋 上传结果:', {
        category: selectedCategory,
        templateId: selectedTemplate.id,
        imageToVideo: selectedTemplate.imageToVideo,
        videoUrl,
        imageUrl,
        hasVideo: !!videoUrl,
        hasImage: !!imageUrl,
      });

      // 调用生成API（与Web端保持一致，不传递model参数，由后端自动选择）
      const requestBody = {
        type: 'video',
        prompt: enhancedPrompt,
        referenceVideoUrl: videoUrl,
        referenceImageUrl: imageUrl,
        provider: 'runway',
        fixedImagePath: selectedTemplate.fixedImage,
      };

      console.log('📤 发送到API的数据:', requestBody);

      const response = await fetch(getApiUrl('api/jobs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成失败');
      }

      const result = await response.json();
      const jobId = result.id || result.jobId;

      console.log('✅ 视频任务创建成功，Job ID:', jobId);
      setCurrentJobId(jobId);

      // 轮询检查任务状态
      await pollJobStatus(jobId);

    } catch (error) {
      console.error('生成失败:', error);
      Alert.alert('生成失败', error instanceof Error ? error.message : '未知错误');
      setIsGenerating(false);
    }
  };

  // 上传图片
  const uploadImage = async (imageUri: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('请先登录');

    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await fetch(getApiUrl('api/upload/image'), {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const data = await response.json();
    return data.url;
  };

  // 上传视频
  const uploadVideo = async (videoUri: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('请先登录');

      const formData = new FormData();
      const filename = videoUri.split('/').pop() || 'video.mp4';

      console.log('📤 准备上传视频:', { uri: videoUri, filename });

      formData.append('file', {
        uri: videoUri,
        name: filename,
        type: 'video/mp4',
      } as any);

      const uploadUrl = getApiUrl('api/upload/video');
      console.log('🌐 上传地址:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          // ⚠️ 不要手动设置 Content-Type，让系统自动添加 boundary
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('📡 上传响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 上传失败响应:', errorText);

        // 尝试解析 JSON 错误
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || '视频上传失败');
        } catch {
          throw new Error(`上传失败 (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ 视频上传成功:', data.url);
      return data.url;
    } catch (error) {
      console.error('💥 上传视频异常:', error);
      throw error;
    }
  };

  // 轮询任务状态
  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 120; // 视频生成时间较长，最多轮询120次（4分钟）
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5; // 允许最多5次连续错误
    const checkStatus = async (): Promise<void> => {
      try {
        attempts++;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('会话已过期，请重新登录');
        }

        // 设置15秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
          const response = await fetch(getApiUrl(`api/jobs?id=${jobId}`), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            // 网络错误，但不致命，继续重试
            console.warn(`⚠️ 获取任务状态失败(${response.status})，将重试...`);
            consecutiveErrors++;

            if (consecutiveErrors >= maxConsecutiveErrors) {
              throw new Error('网络连接不稳定，请检查网络后重试');
            }

            if (attempts < maxAttempts) {
              setTimeout(() => checkStatus(), 3000); // 延长重试间隔到3秒
              return;
            } else {
              throw new Error('生成超时，请稍后重试');
            }
          }

          const job = await response.json();
          consecutiveErrors = 0; // 重置错误计数

          console.log('📊 视频任务状态:', job.status, `(第${attempts}次查询)`);

          if (job.status === 'done' && job.result_url) {
            // 任务完成
            console.log('✅ 视频生成完成！');
            setGeneratedVideoUrl(job.result_url);
            setIsGenerating(false);
            setShowResultModal(true);
          } else if (job.status === 'failed') {
            const errorMessage = job.result_url?.startsWith('ERROR:')
              ? job.result_url.substring(7)
              : '生成失败';
            throw new Error(errorMessage);
          } else if (attempts < maxAttempts) {
            // 继续轮询
            setTimeout(() => checkStatus(), 2000);
          } else {
            throw new Error('生成超时，请稍后重试');
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);

          // 网络超时或中断，不是致命错误
          if (fetchError.name === 'AbortError') {
            console.warn('⚠️ 请求超时，将重试...');
            consecutiveErrors++;
          } else {
            throw fetchError;
          }

          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error('网络连接不稳定，请检查网络后重试');
          }

          if (attempts < maxAttempts) {
            setTimeout(() => checkStatus(), 3000);
          } else {
            throw new Error('生成超时，请稍后重试');
          }
        }
      } catch (error) {
        console.error('轮询错误:', error);
        setIsGenerating(false);
        Alert.alert('错误', error instanceof Error ? error.message : '未知错误');
      }
    };

    await checkStatus();
  };

  return (
    <View style={styles.container}>
      <TopNavigationBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryContainer}>
          {categories.map((category) => (
          <TouchableOpacity
              key={category.id}
            style={[
              styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                  selectedCategory === category.id && styles.categoryButtonTextActive,
              ]}
            >
                {category.label}
            </Text>
          </TouchableOpacity>
          ))}
        </View>

        <View style={styles.templatesGrid}>
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplate?.id === template.id}
              onPress={() => handleTemplateClick(template)}
            />
          ))}
        </View>
      </ScrollView>

      {/* 视频上传对话框 */}
      {selectedTemplate && (
        <VideoUploadDialog
          visible={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          onGenerate={handleGenerate}
          templateTitle={selectedTemplate.title}
          category={selectedCategory}
          imageToVideo={selectedTemplate.imageToVideo}
          needsFaceSwap={selectedCategory === 'animation'}
        />
      )}

      {/* 生成中加载指示器 */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>正在生成视频...</Text>
            <Text style={styles.loadingSubText}>这可能需要几分钟时间</Text>
          </View>
        </View>
      )}

      {/* 登录弹窗 */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* 生成结果预览 */}
      <ResultPreviewModal
        visible={showResultModal}
        imageUrl={generatedVideoUrl}
        jobId={currentJobId || undefined}
        isVideo={true}
        onClose={() => {
          setShowResultModal(false);
          setGeneratedVideoUrl(null);
          setCurrentJobId(null);
        }}
      />
    </View>
  );
}

// 视频卡片组件 - 使用缩略图代替视频播放，避免内存溢出
function TemplateCard({
  template,
  isSelected,
  onPress,
}: {
  template: VideoTemplate;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.templateCard,
        isSelected && styles.templateCardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* 使用缩略图代替视频，避免创建多个VideoPlayer导致崩溃 */}
      <Image
        source={{ uri: template.thumbnail }}
        style={styles.templateVideo}
        resizeMode="cover"
      />
      {/* 播放图标指示这是视频 */}
      <View style={styles.playIconContainer}>
        <View style={styles.playIcon}>
          <IconSymbol
            ios_icon_name="play.fill"
            android_material_icon_name="play-arrow"
            size={24}
            color="#fff"
          />
        </View>
      </View>
      <View style={styles.templateInfo}>
        <Text style={styles.templateTitle} numberOfLines={1}>
          {template.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 32 : 44, // Increased by 50px to avoid status bar overlap
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  categoryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  categoryButtonTextActive: {
    color: colors.card,
    fontWeight: '600',
  },
  templatesGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  templateCard: {
    width: cardWidth,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardSelected: {
    borderColor: colors.orange,
    elevation: 6,
  },
  templateVideo: {
    width: '100%',
    height: 343, // 220 * 1.3 * 1.2 = 343 (原高度220 增加56%)
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    padding: 16,
    alignItems: 'center',
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  loadingSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
