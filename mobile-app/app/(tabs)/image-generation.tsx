
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { TopNavigationBar } from '@/components/TopNavigationBar';
import { ImageComparisonSlider } from '@/components/ImageComparisonSlider';
import { OptimizedImage } from '@/components/OptimizedImage';
import { UploadDialog } from '@/components/UploadDialog';
import { ResultPreviewModal } from '@/components/ResultPreviewModal';
import { getAssetUrl, getApiUrl, API_CONFIG } from '@/config/api';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { LoginModal } from '@/components/LoginModal';
import { router } from 'expo-router';
import { useTranslation } from '@/lib/contexts/i18n-context';
import { downloadImages, getCachedImagePath } from '@/lib/utils/imageCache';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

type Category = 'expression' | 'retouch' | 'dressup' | 'groupphoto';

interface StyleTemplate {
  id: string;
  title: string;
  image?: string;
  afterImage?: string; // AI生成后的图片（用于对比展示）
  originalImage1?: string; // 第一张原图（用于穿戴和合影）
  originalImage2?: string; // 第二张原图（用于穿戴和合影）
  mergedImage?: string; // 合成后的图片（用于穿戴和合影）
  category: Category;
  prompt: string;
}

// 从web版迁移的模板数据
const styleTemplates: StyleTemplate[] = [
  // Expression templates - 从web版迁移
  { id: "portrait-1", title: "大笑", image: getAssetUrl("figma-designs/portrait/IMAGE-1.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-1-after.png"), category: "expression", prompt: "让图中的人物大笑" },
  { id: "portrait-2", title: "严肃", image: getAssetUrl("figma-designs/portrait/IMAGE-2.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-2-after.png"), category: "expression", prompt: "让图中的人物表情变得严肃" },
  { id: "portrait-3", title: "微笑", image: getAssetUrl("figma-designs/portrait/IMAGE-3.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-3-after.png"), category: "expression", prompt: "让图中的人物表情变得微笑" },
  { id: "portrait-4", title: "悲伤", image: getAssetUrl("figma-designs/portrait/IMAGE-4.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-4-after.png"), category: "expression", prompt: "让图中的人物表情变得悲伤并流着泪" },
  { id: "portrait-5", title: "大哭", image: getAssetUrl("figma-designs/portrait/IMAGE-5.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-5-after.png"), category: "expression", prompt: "让图中的人物表情变成大哭" },
  { id: "portrait-6", title: "厌恶", image: getAssetUrl("figma-designs/portrait/IMAGE-6.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-6-after.png"), category: "expression", prompt: "让图中的人物表情变成厌恶的表情" },
  { id: "portrait-7", title: "愤怒", image: getAssetUrl("figma-designs/portrait/IMAGE-7.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-7-after.png"), category: "expression", prompt: "让图中的人物表情变成愤怒的表情" },
  { id: "portrait-8", title: "惊讶", image: getAssetUrl("figma-designs/portrait/IMAGE-8.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-8-after.png"), category: "expression", prompt: "让图中的人物表情变成惊讶" },
  { id: "portrait-9", title: "失望", image: getAssetUrl("figma-designs/portrait/IMAGE-9.jpg"), afterImage: getAssetUrl("figma-designs/portrait/IMAGE-9-after.png"), category: "expression", prompt: "让图中的人物表情变成失望" },

  // Retouch templates - 从web版的artistic迁移
  { id: "artistic-1", title: "去痘印", image: getAssetUrl("figma-designs/artistic/IMAGE-1.png"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-1-after.png"), category: "retouch", prompt: "去掉图中人物脸上的青春痘或雀斑" },
  { id: "artistic-2", title: "摘眼镜", image: getAssetUrl("figma-designs/artistic/IMAGE-2.jpg"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-2-after.png"), category: "retouch", prompt: "去掉图中人物眼睛上眼镜" },
  { id: "artistic-3", title: "去纹身", image: getAssetUrl("figma-designs/artistic/IMAGE-3.jpg"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-3-after.png"), category: "retouch", prompt: "去掉图中的人物身上所有的纹身痕迹" },
  { id: "artistic-4", title: "剃胡子", image: getAssetUrl("figma-designs/artistic/IMAGE-4.jpg"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-4-after.png"), category: "retouch", prompt: "去除图中男人脸上的胡子" },
  { id: "artistic-5", title: "去皱纹", image: getAssetUrl("figma-designs/artistic/IMAGE-5.jpg"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-5-after.png"), category: "retouch", prompt: "去除图中人物脸上的皱纹，使人物变得更年轻" },
  { id: "artistic-6", title: "瘦身", image: getAssetUrl("figma-designs/artistic/IMAGE-6.jpg"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-6-after.png"), category: "retouch", prompt: "Make the characters in the picture thinner 50%, and looks like more symmetrical" },
  { id: "artistic-7", title: "肌肉感", image: getAssetUrl("figma-designs/artistic/IMAGE-7.png"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-7-after.png"), category: "retouch", prompt: "让图中的人物显得非常有肌肉感" },
  { id: "artistic-8", title: "修复照片", image: getAssetUrl("figma-designs/artistic/IMAGE-8.jpg"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-8-after.png"), category: "retouch", prompt: "修复破损的照片，并保持颜色与原照片一致" },
  { id: "artistic-9", title: "照片上色", image: getAssetUrl("figma-designs/artistic/IMAGE-9.jpg"), afterImage: getAssetUrl("figma-designs/artistic/IMAGE-9-after.png"), category: "retouch", prompt: "给老照片上色，保持光线正常" },

  // Wearing templates - 从web版迁移
  { id: "wearing-1", title: "项链", originalImage1: getAssetUrl("figma-designs/wearing/IMAGE-1-source1.png"), originalImage2: getAssetUrl("figma-designs/wearing/IMAGE-1-source2.png"), mergedImage: getAssetUrl("figma-designs/wearing/IMAGE-1-after.png"), category: "dressup", prompt: "给其中一张有人脸的图佩戴上项链，项链采用另一张图中的款式，并保持项链与有人脸的图光线一致，让项链看起来很自然地戴在人的脖子上" },
  { id: "wearing-2", title: "耳环", originalImage1: getAssetUrl("figma-designs/wearing/IMAGE-2-source1.jpg"), originalImage2: getAssetUrl("figma-designs/wearing/IMAGE-2-source2.png"), mergedImage: getAssetUrl("figma-designs/wearing/IMAGE-2-after.png"), category: "dressup", prompt: "给其中一张有人脸的图佩戴上耳环，耳环采用另一张图中的款式，并保持耳环与有人脸的图光线一致，让耳环看起来很自然地戴在人的耳朵上" },
  { id: "wearing-3", title: "眼镜", originalImage1: getAssetUrl("figma-designs/wearing/IMAGE-3-source1.jpg"), originalImage2: getAssetUrl("figma-designs/wearing/IMAGE-3-source2.png"), mergedImage: getAssetUrl("figma-designs/wearing/IMAGE-3-after.png"), category: "dressup", prompt: "给其中一张有人脸的图佩戴上眼镜，眼镜采用另一张图中的款式，并保持眼镜与有人脸的图光线一致，让眼镜看起来很自然地戴在人脸上" },
  { id: "wearing-4", title: "口红", originalImage1: getAssetUrl("figma-designs/wearing/IMAGE-4-source1.jpg"), originalImage2: getAssetUrl("figma-designs/wearing/IMAGE-4-source2.png"), mergedImage: getAssetUrl("figma-designs/wearing/IMAGE-4-after.png"), category: "dressup", prompt: "给其中一张图的女人嘴唇涂上口红，口红采用另一张图中的颜色" },
  { id: "wearing-5", title: "帽子", originalImage1: getAssetUrl("figma-designs/wearing/IMAGE-5-source1.jpg"), originalImage2: getAssetUrl("figma-designs/wearing/IMAGE-5-source2.png"), mergedImage: getAssetUrl("figma-designs/wearing/IMAGE-5-after.png"), category: "dressup", prompt: "给其中一张有人脸的图佩戴上帽子，帽子采用另一张图中的款式，并保持帽子与有人脸的图光线一致，让帽子看起来很自然地戴在人头上" },
  { id: "wearing-6", title: "衣服", originalImage1: getAssetUrl("figma-designs/wearing/IMAGE-6-source1.jpg"), originalImage2: getAssetUrl("figma-designs/wearing/IMAGE-6-source2.png"), mergedImage: getAssetUrl("figma-designs/wearing/IMAGE-6-after.png"), category: "dressup", prompt: "给其中一张有人脸的图换上另一件衣服，另一件采用另一张图中的款式，并保持衣服与有人脸的图光线一致，让衣服看起来很自然地穿在人身上" },
  { id: "wearing-7", title: "裤子", originalImage1: getAssetUrl("figma-designs/wearing/IMAGE-7-source1.jpg"), originalImage2: getAssetUrl("figma-designs/wearing/IMAGE-7-source2.png"), mergedImage: getAssetUrl("figma-designs/wearing/IMAGE-7-after.png"), category: "dressup", prompt: "给其中一张有人脸的图换上另一条裤子，裤子采用另一张图中的款式，并保持裤子与有人脸的图光线一致，让裤子看起来很自然地穿在人身上" },
  { id: "wearing-8", title: "鞋子", originalImage1: getAssetUrl("figma-designs/wearing/IMAGE-8-source1.jpg"), originalImage2: getAssetUrl("figma-designs/wearing/IMAGE-8-source2.png"), mergedImage: getAssetUrl("figma-designs/wearing/IMAGE-8-after.png"), category: "dressup", prompt: "给其中一张图中的人的脚上换一双鞋子，鞋子采用另一张图中的款式，并保持鞋子与有周边的图光线一致，让鞋子看起来很自然地穿在人脚上" },

  // Group photo templates - 从web版anime迁移
  { id: "anime-1", title: "亲吻", originalImage1: getAssetUrl("figma-designs/anime/IMAGE-1-source1.png"), originalImage2: getAssetUrl("figma-designs/anime/IMAGE-1-source2.jpg"), mergedImage: getAssetUrl("figma-designs/anime/IMAGE-1-after.png"), category: "groupphoto", prompt: "让两张图片中的人物拥抱亲吻，两人相对镜头均侧脸，请确保两人的身体比例协调、真实，姿势自然，场景户外，光线自然柔和" },
  { id: "anime-2", title: "合影", originalImage1: getAssetUrl("figma-designs/anime/IMAGE-2-source1.jpg"), originalImage2: getAssetUrl("figma-designs/anime/IMAGE-2-source2.jpg"), mergedImage: getAssetUrl("figma-designs/anime/IMAGE-2-after.png"), category: "groupphoto", prompt: "让两张图片中的人物合影，请确保两人的身体比例协调、真实，户外场景，光线柔和自然" },
  { id: "anime-3", title: "拥抱", originalImage1: getAssetUrl("figma-designs/anime/IMAGE-3-source1.jpg"), originalImage2: getAssetUrl("figma-designs/anime/IMAGE-3-source2.jpg"), mergedImage: getAssetUrl("figma-designs/anime/IMAGE-3-after.png"), category: "groupphoto", prompt: "将两张图片中的人物进行合影，要求男的从后面搂抱着女的，侧身面对镜头，请确保两人的身体比例协调、真实，户外场景，光线柔和自然" },
  { id: "anime-4", title: "牵手侧向", originalImage1: getAssetUrl("figma-designs/anime/IMAGE-4-source1.png"), originalImage2: getAssetUrl("figma-designs/anime/IMAGE-4-source2.jpg"), mergedImage: getAssetUrl("figma-designs/anime/IMAGE-4-after.png"), category: "groupphoto", prompt: "将两张图片中的人物进行合影，要求两人间隔一定的距离牵手，两人相对镜头侧向，相互面对着微笑，请确保两人的身体比例协调、真实，姿势自然，户外场景，光线柔和自然" },
  { id: "anime-5", title: "牵手正面", originalImage1: getAssetUrl("figma-designs/anime/IMAGE-5-source1.png"), originalImage2: getAssetUrl("figma-designs/anime/IMAGE-5-source2.jpg"), mergedImage: getAssetUrl("figma-designs/anime/IMAGE-5-after.png"), category: "groupphoto", prompt: "将两张图片中的人物进行合影，要求两人间隔一定的距离牵手，面对镜头微笑，请确保两人的身体比例协调、真实，姿势自然，户外场景，光线柔和自然" },
  { id: "anime-8", title: "求婚", originalImage1: getAssetUrl("figma-designs/anime/IMAGE-8-source1.jpg"), originalImage2: getAssetUrl("figma-designs/anime/IMAGE-8-source2.png"), mergedImage: getAssetUrl("figma-designs/anime/IMAGE-8-after.png"), category: "groupphoto", prompt: "将两张图片中的人物进行合影，要求男人单膝跪地向女人做出求婚的姿势，两人侧向镜头，都面带微笑，请确保两人的身体比例协调、真实，姿势自然，户外场景，光线柔和自然" },
  { id: "anime-9", title: "握手", originalImage1: getAssetUrl("figma-designs/anime/IMAGE-9-source1.png"), originalImage2: getAssetUrl("figma-designs/anime/IMAGE-9-source2.png"), mergedImage: getAssetUrl("figma-designs/anime/IMAGE-9-after.png"), category: "groupphoto", prompt: "将两张图片的人物握手，两人均面向镜头，请确保两人的身体比例协调、真实，姿势自然，户外场景，光线柔和自然" },
];

export default function ImageGenerationScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  
  // 调试信息：在开发模式下显示配置
  React.useEffect(() => {
    console.log('🎨 ImageGeneration mounted');
    console.log('📡 API Config from component:', {
      BASE_URL: API_CONFIG.BASE_URL,
      sampleURL: getAssetUrl('figma-designs/portrait/IMAGE-1.jpg'),
    });
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<Category>('expression');
  const [selectedTemplate, setSelectedTemplate] = useState<StyleTemplate | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const categories = [
    { id: 'expression' as Category, label: t('categories.expression', 'Expression') },
    { id: 'retouch' as Category, label: t('categories.artistic', 'Artistic') },
    { id: 'dressup' as Category, label: t('categories.wearing', 'Wearing') },
    { id: 'groupphoto' as Category, label: t('categories.anime', 'Anime') },
  ];

  const filteredTemplates = styleTemplates.filter(
    (template) => template.category === selectedCategory
  );

  // 图片本地缓存映射：远程 URL -> 本地文件路径
  const [imageLocalPaths, setImageLocalPaths] = useState<Map<string, string>>(new Map());
  const hasDownloadedRef = React.useRef(false);

  // App 启动时在后台静默下载所有图片到本地文件系统
  React.useEffect(() => {
    if (hasDownloadedRef.current) {
      console.log('⏭️ 跳过下载：图片已下载到本地');
      return;
    }

    const downloadAllImages = async () => {
      try {
        console.log('🚀 后台静默下载模板图片到本地文件系统...');
        const imagesToDownload: string[] = [];

        // 收集所有模板的所有图片 URL
        styleTemplates.forEach(template => {
          if (template.image) imagesToDownload.push(template.image);
          if (template.afterImage) imagesToDownload.push(template.afterImage);
          if (template.originalImage1) imagesToDownload.push(template.originalImage1);
          if (template.originalImage2) imagesToDownload.push(template.originalImage2);
          if (template.mergedImage) imagesToDownload.push(template.mergedImage);
        });

        console.log(`📦 总共需要下载 ${imagesToDownload.length} 张图片到本地`);

        // 先检查哪些已经缓存
        const localPathsMap = new Map<string, string>();
        const needDownload: string[] = [];

        for (const url of imagesToDownload) {
          const cachedPath = await getCachedImagePath(url);
          if (cachedPath) {
            localPathsMap.set(url, cachedPath);
            console.log(`  ✅ 已缓存: ${url.split('/').pop()}`);
          } else {
            needDownload.push(url);
          }
        }

        console.log(`💾 已缓存: ${localPathsMap.size} 张，需下载: ${needDownload.length} 张`);

        // 下载未缓存的图片（后台静默下载）
        if (needDownload.length > 0) {
          const downloadedPaths = await downloadImages(needDownload);

          // 合并到本地路径映射
          downloadedPaths.forEach((localPath, remoteUrl) => {
            localPathsMap.set(remoteUrl, localPath);
          });
        }

        setImageLocalPaths(localPathsMap);
        hasDownloadedRef.current = true;

        console.log(`🎉 所有图片已准备就绪！共 ${localPathsMap.size} 张`);
        console.log('💾 图片存储在本地，切换分类瞬间加载');
      } catch (error) {
        console.error('❌ 下载图片失败:', error);
        // 静默失败，不打扰用户
      }
    };

    downloadAllImages();
  }, []); // 空依赖数组：仅在组件首次挂载时执行

  // 处理模板点击
  const handleTemplateClick = async (template: StyleTemplate) => {
    // 检查登录状态
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    // 检查用户积分
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch(getApiUrl('api/user/stats'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const remainingCredits = data.remainingCredits || 0;
          
          // 如果积分为0，提示用户并跳转到订阅页面
          if (remainingCredits === 0) {
            Alert.alert(
              t('generate.creditsInsufficient', 'Insufficient credits'),
              t('generate.creditsInsufficientMessage', 'You have run out of credits. Please subscribe to continue.'),
              [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                  text: t('generate.viewPlans', 'View Plans'),
                  onPress: () => router.push('/(tabs)/subscription'),
                },
              ]
            );
            return;
          }
        }
      }
    } catch (error) {
      console.error('检查积分失败:', error);
      // 积分检查失败不阻止用户继续，让后端处理
    }
    
    setSelectedTemplate(template);
    setShowUploadDialog(true);
  };

  // 登录成功后的回调
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // 如果之前选择了模板，登录后自动打开上传对话框
    if (selectedTemplate) {
      setShowUploadDialog(true);
    }
  };

  // 处理图片生成
  const handleGenerate = async (images: { image1?: string; image2?: string }) => {
    if (!selectedTemplate) return;

    setShowUploadDialog(false);
    setIsGenerating(true);

    try {
      // 判断是否需要两张图片
      const requiresTwoImages = selectedCategory === 'dressup' || selectedCategory === 'groupphoto';

      // 上传图片
      const uploadedUrls: string[] = [];

      if (images.image1) {
        const url1 = await uploadImage(images.image1);
        uploadedUrls.push(url1);
      }

      if (requiresTwoImages && images.image2) {
        const url2 = await uploadImage(images.image2);
        uploadedUrls.push(url2);
      }

      // 获取 access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(t('generate.pleaseLoginFirst', 'Please login first to use this feature'));
      }

      // 调用生成API（使用与Web端相同的provider: gemini）
      const response = await fetch(getApiUrl('api/jobs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'image',
          prompt: selectedTemplate.prompt,
          referenceImageUrl: uploadedUrls[0],
          referenceImageUrl2: uploadedUrls[1],
          provider: 'gemini',  // 与Web端保持一致
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('generate.generationFailed', 'Generation failed'));
      }

      const result = await response.json();
      const jobId = result.id || result.jobId;

      console.log('✅ 任务创建成功，Job ID:', jobId);
      setCurrentJobId(jobId);

      // 轮询检查任务状态
      await pollJobStatus(jobId);

    } catch (error) {
      console.error('生成失败:', error);
      Alert.alert(
        t('generate.generationFailed', 'Generation failed'),
        error instanceof Error ? error.message : t('generate.unknownError', 'Unknown error')
      );
      setIsGenerating(false);
    }
  };

  // 上传图片到服务器
  const uploadImage = async (imageUri: string): Promise<string> => {
    try {
      // 获取当前会话的访问令牌
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(t('generate.pleaseLoginFirst', 'Please login first to use this feature'));
      }

      const formData = new FormData();

      // 从 URI 创建文件对象
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      console.log('📤 准备上传图片:', { uri: imageUri, filename, type });

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const uploadUrl = getApiUrl('api/upload/image');
      console.log('🌐 上传地址:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
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
          throw new Error(errorJson.error || t('generate.uploadFailed', 'Upload failed'));
        } catch {
          throw new Error(`${t('generate.uploadFailed', 'Upload failed')} (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ 上传成功:', data.url);
      return data.url;
    } catch (error) {
      console.error('💥 上传图片异常:', error);
      throw error;
    }
  };

  // 轮询任务状态
  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 60; // 最多轮询60次
    let attempts = 0;

    const checkStatus = async (): Promise<void> => {
      try {
        // 获取 access token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error(t('generate.sessionExpired', 'Session expired, please login again'));
        }

        const response = await fetch(getApiUrl(`api/jobs?id=${jobId}`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(t('generate.getTaskStatusFailed', 'Failed to get task status'));
        }

        const job = await response.json();

        console.log('📊 任务状态:', job.status, 'Result URL:', job.result_url);

        if (job.status === 'done' && job.result_url) {
          // 任务完成
          console.log('✅ 生成完成！准备显示预览');
          setGeneratedImageUrl(job.result_url);
          setIsGenerating(false);
          setShowResultModal(true); // 显示预览模态框
          console.log('🎉 预览状态已设置: showResultModal=true');
        } else if (job.status === 'failed') {
          const errorMessage = job.result_url?.startsWith('ERROR:')
            ? job.result_url.substring(7)
            : t('generate.generationFailed', 'Generation failed');
          throw new Error(errorMessage);
        } else if (attempts < maxAttempts) {
          // 继续轮询
          attempts++;
          setTimeout(() => checkStatus(), 2000); // 2秒后重试
        } else {
          throw new Error(t('generate.generationFailed', 'Generation timeout, please try again'));
        }
      } catch (error) {
        console.error('轮询错误:', error);
        setIsGenerating(false);
        Alert.alert(
          t('common.error', 'Error'),
          error instanceof Error ? error.message : t('generate.unknownError', 'Unknown error')
        );
      }
    };

    await checkStatus();
  };

  return (
    <View style={styles.container}>
      {/* 调试信息 - 仅在需要时显示 */}
      {false && ( // 改为 true 来显示调试信息
        <View style={{ backgroundColor: '#ffeb3b', padding: 10, borderRadius: 5, margin: 10 }}>
          <Text style={{ color: '#000', fontSize: 11, fontFamily: 'monospace' }}>
            __DEV__: {String(__DEV__)}
          </Text>
          <Text style={{ color: '#000', fontSize: 11, fontFamily: 'monospace' }}>
            BASE_URL: {API_CONFIG.BASE_URL}
          </Text>
          <Text style={{ color: '#000', fontSize: 11, fontFamily: 'monospace' }}>
            Sample: {getAssetUrl('figma-designs/portrait/IMAGE-1.jpg').slice(0, 60)}...
          </Text>
        </View>
      )}

      <TopNavigationBar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryContainer}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[
          styles.templatesGrid,
          (selectedCategory === 'dressup' || selectedCategory === 'groupphoto') && styles.templatesGridSingle
        ]}>
          {filteredTemplates.map((template, index) => {
            const isWideLayout = selectedCategory === 'dressup' || selectedCategory === 'groupphoto';
            const cardStyle = isWideLayout ? styles.templateCardWide : styles.templateCard;

            return (
              <TouchableOpacity
                key={index}
                style={cardStyle}
                onPress={() => handleTemplateClick(template)}
                activeOpacity={0.7}
              >
                {/* 穿戴和合影：显示两张原图 + 合成图 */}
                {template.originalImage1 && template.originalImage2 && template.mergedImage ? (
                  <View style={styles.dualImageLayout}>
                    {/* 上方：两张原图并列 */}
                    <View style={styles.sourceImagesRow}>
                      <OptimizedImage
                        uri={template.originalImage1}
                        localPath={imageLocalPaths.get(template.originalImage1)}
                        style={styles.sourceImage}
                        containerStyle={styles.sourceImage}
                        resizeMode="contain"
                        showLoadingIndicator={false}
                        showErrorRetry={true}
                      />
                      <OptimizedImage
                        uri={template.originalImage2}
                        localPath={imageLocalPaths.get(template.originalImage2)}
                        style={styles.sourceImage}
                        containerStyle={styles.sourceImage}
                        resizeMode="contain"
                        showLoadingIndicator={false}
                        showErrorRetry={true}
                      />
                    </View>
                    {/* 下方：合成后的图片 */}
                    <OptimizedImage
                      uri={template.mergedImage}
                      localPath={imageLocalPaths.get(template.mergedImage)}
                      style={styles.mergedImage}
                      containerStyle={styles.mergedImage}
                      resizeMode="contain"
                      showLoadingIndicator={false}
                      showErrorRetry={true}
                    />
                  </View>
                ) : template.afterImage && template.image ? (
                  /* 表情和修图：使用对比滑块 */
                  <ImageComparisonSlider
                    beforeImage={template.image}
                    afterImage={template.afterImage}
                    beforeImageLocalPath={imageLocalPaths.get(template.image)}
                    afterImageLocalPath={imageLocalPaths.get(template.afterImage)}
                    width={isWideLayout ? width - 32 : cardWidth}
                    height={200}
                  />
                ) : template.image ? (
                  /* 其他：单张图片 */
                  <OptimizedImage
                    uri={template.image}
                    localPath={imageLocalPaths.get(template.image)}
                    style={styles.templateImage}
                    containerStyle={styles.templateImage}
                    resizeMode="contain"
                    showLoadingIndicator={false}
                    showErrorRetry={true}
                  />
                ) : null}
                <View style={styles.templateTitleContainer}>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 上传对话框 */}
      {selectedTemplate && (
        <UploadDialog
          visible={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          onGenerate={handleGenerate}
          templateTitle={selectedTemplate.title}
          templateCategory={selectedCategory}
          requiresTwoImages={selectedCategory === 'dressup' || selectedCategory === 'groupphoto'}
        />
      )}

      {/* 生成中加载指示器 */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('generate.generating', 'Generating...')}</Text>
            <Text style={styles.loadingSubText}>{t('generate.generatingSubtext', 'This may take a few minutes')}</Text>
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
        imageUrl={generatedImageUrl}
        jobId={currentJobId || undefined}
        onClose={() => {
          setShowResultModal(false);
          setGeneratedImageUrl(null);
          setCurrentJobId(null);
        }}
      />
    </View>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 20,
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
  categoryText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: colors.card,
    fontWeight: '600',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  templatesGridSingle: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  templateCard: {
    width: cardWidth,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  templateCardWide: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  templateImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain', // 改为contain以完整显示图片，自动缩放
    backgroundColor: colors.background, // 添加背景色
  },
  dualImageLayout: {
    width: '100%',
    backgroundColor: colors.background,
  },
  sourceImagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 8,
  },
  sourceImage: {
    width: (width - 56) / 2, // 减去容器padding和gap
    height: 150,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  mergedImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.background,
    marginTop: 8,
  },
  templateTitleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  templateTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
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
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
  },
  loadingSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
