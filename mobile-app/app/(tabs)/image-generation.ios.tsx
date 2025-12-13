
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { TopNavigationBar } from '@/components/TopNavigationBar';
import { ImageComparisonSlider } from '@/components/ImageComparisonSlider';
import { UploadDialog } from '@/components/UploadDialog';
import { ResultPreviewModal } from '@/components/ResultPreviewModal';
import { getAssetUrl, getApiUrl } from '@/config/api';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { LoginModal } from '@/components/LoginModal';
import { router } from 'expo-router';

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
  const [selectedCategory, setSelectedCategory] = useState<Category>('expression');
  const [selectedTemplate, setSelectedTemplate] = useState<StyleTemplate | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const categories = [
    { id: 'expression' as Category, label: '表情' },
    { id: 'retouch' as Category, label: '修图' },
    { id: 'dressup' as Category, label: '穿戴' },
    { id: 'groupphoto' as Category, label: '合影' },
  ];

  const filteredTemplates = styleTemplates.filter(
    (template) => template.category === selectedCategory
  );

  // 处理模板点击
  const handleTemplateClick = (template: StyleTemplate) => {
    // 检查登录状态
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
      // 判断是否需要两张图片（穿戴和合影）
      const requiresTwoImages = selectedCategory === 'dressup' || selectedCategory === 'groupphoto';
      const uploadedUrls: string[] = [];

      // 上传第一张图片
      if (images.image1) {
        const url1 = await uploadImage(images.image1);
        uploadedUrls.push(url1);
      }

      // 如果需要两张图片，上传第二张
      if (requiresTwoImages && images.image2) {
        const url2 = await uploadImage(images.image2);
        uploadedUrls.push(url2);
      }

      // 获取 access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('请先登录后再使用此功能');
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
        throw new Error(errorData.error || '生成失败');
      }

      const result = await response.json();
      const jobId = result.id || result.jobId;

      console.log('✅ 任务创建成功，Job ID:', jobId);
      setCurrentJobId(jobId);

      // 开始轮询任务状态
      await pollJobStatus(jobId);

    } catch (error) {
      console.error('生成失败:', error);
      Alert.alert('生成失败', error instanceof Error ? error.message : '未知错误');
      setIsGenerating(false);
    }
  };

  // 上传图片到服务器
  const uploadImage = async (imageUri: string): Promise<string> => {
    try {
      // 获取当前会话的访问令牌
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('请先登录后再使用此功能');
      }

      const formData = new FormData();
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
          throw new Error(errorJson.error || '图片上传失败');
        } catch {
          throw new Error(`上传失败 (${response.status}): ${errorText}`);
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
          throw new Error('会话已过期，请重新登录');
        }

        const response = await fetch(getApiUrl(`api/jobs?id=${jobId}`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('获取任务状态失败');
        }

        const job = await response.json();

        console.log('📊 任务状态:', job.status, 'Result URL:', job.result_url);

        if (job.status === 'done' && job.result_url) {
          // 生成完成
          console.log('✅ 生成完成！准备显示预览');
          setGeneratedImageUrl(job.result_url);
          setIsGenerating(false);
          setShowResultModal(true); // 显示预览模态框
          console.log('🎉 预览状态已设置: showResultModal=true');
        } else if (job.status === 'failed') {
          // 检查是否有错误信息
          const errorMessage = job.result_url?.startsWith('ERROR:')
            ? job.result_url.substring(7)
            : '生成失败';
          throw new Error(errorMessage);
        } else if (attempts < maxAttempts) {
          // 继续轮询
          attempts++;
          setTimeout(() => checkStatus(), 2000); // 2秒轮询一次
        } else {
          throw new Error('生成超时，请稍后重试');
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
                      <Image
                        source={{ uri: template.originalImage1 }}
                        style={styles.sourceImage}
                        resizeMode="contain"
                      />
                      <Image
                        source={{ uri: template.originalImage2 }}
                        style={styles.sourceImage}
                        resizeMode="contain"
                      />
                    </View>
                    {/* 下方：合成后的图片 */}
                    <Image
                      source={{ uri: template.mergedImage }}
                      style={styles.mergedImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : template.afterImage && template.image ? (
                  /* 表情和修图：使用对比滑块 */
                  <ImageComparisonSlider
                    beforeImage={template.image}
                    afterImage={template.afterImage}
                    width={isWideLayout ? width - 32 : cardWidth}
                    height={200}
                  />
                ) : template.image ? (
                  /* 其他：单张图片 */
                  <Image source={{ uri: template.image }} style={styles.templateImage} />
                ) : null}
                <View style={styles.templateTitleContainer}>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.uploadButton}>
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={24}
            color={colors.card}
          />
          <Text style={styles.uploadButtonText}>上传图片开始创作</Text>
        </TouchableOpacity>
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

      {/* 生成中加载遮罩 */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>正在生成中...</Text>
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
    paddingTop: 10, // Increased by 50px to avoid status bar overlap
    paddingHorizontal: 16,
    paddingBottom: 32,
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
    fontSize: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  templateCardWide: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  uploadButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
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
  resultModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultModalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  resultImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  resultButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resultButtonPrimary: {
    backgroundColor: colors.primary,
  },
  resultButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultButtonTextPrimary: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
  },
  resultButtonTextSecondary: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
