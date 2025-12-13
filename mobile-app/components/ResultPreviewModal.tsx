import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/commonStyles';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { supabase } from '@/lib/supabase/client';
import { getApiUrl } from '@/config/api';

const { width, height } = Dimensions.get('window');

interface ResultPreviewModalProps {
  visible: boolean;
  imageUrl: string | null;
  jobId?: string;
  onClose: () => void;
  isVideo?: boolean; // 新增：标识是否为视频
}

export function ResultPreviewModal({
  visible,
  imageUrl,
  jobId,
  onClose,
  isVideo = false,
}: ResultPreviewModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 检测URL是否为视频（必须在 hooks 之前，因为我们需要知道是否为视频）
  const isVideoFile = imageUrl ? (imageUrl.includes('.mp4') || imageUrl.includes('.webm') || imageUrl.includes('.mov')) : false;
  const shouldUseVideo = isVideo || isVideoFile;

  // 视频播放器（始终调用，但只在需要时使用 - 遵循 Hooks 规则）
  // 使用空字符串作为 fallback，避免条件调用
  const videoPlayer = useVideoPlayer(shouldUseVideo && imageUrl ? imageUrl : '', (player) => {
    if (shouldUseVideo && imageUrl) {
      player.loop = true;
      player.play();
    }
  });

  if (!imageUrl) return null;

  // 保存到本地相册
  const handleSaveToLocal = async () => {
    try {
      setIsSaving(true);

      // 请求媒体库权限
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', `请允许访问相册以保存${shouldUseVideo ? '视频' : '图片'}`);
        return;
      }

      // 下载文件到本地临时目录
      const extension = shouldUseVideo ? 'mp4' : 'jpg';
      const filename = `monna_${Date.now()}.${extension}`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      console.log('📥 开始下载:', { url: imageUrl, fileUri });
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`下载${shouldUseVideo ? '视频' : '图片'}失败`);
      }

      console.log('✅ 下载完成，保存到相册');
      // 保存到相册
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);

      Alert.alert('保存成功', `${shouldUseVideo ? '视频' : '图片'}已保存到相册`, [
        { text: '确定', onPress: onClose }
      ]);
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('保存失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsSaving(false);
    }
  };

  // 分享功能
  const handleShare = async () => {
    try {
      await Share.share({
        message: `看看我用 Monna AI 生成的${shouldUseVideo ? '视频' : '图片'}！`,
        url: imageUrl,
      });
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  // 删除功能
  const handleDelete = async () => {
    Alert.alert(
      '确认删除',
      `确定要删除这${shouldUseVideo ? '个视频' : '张图片'}吗？此操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              if (!jobId) {
                throw new Error('无法删除：缺少任务ID');
              }

              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                throw new Error('请先登录');
              }

              // 调用删除API
              const response = await fetch(getApiUrl(`api/jobs?id=${jobId}`), {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              if (!response.ok) {
                throw new Error('删除失败');
              }

              Alert.alert('删除成功', `${shouldUseVideo ? '视频' : '图片'}已删除`, [
                { text: '确定', onPress: onClose }
              ]);
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('删除失败', error instanceof Error ? error.message : '未知错误');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // 报告功能
  const handleReport = () => {
    Alert.alert(
      '报告问题',
      '请选择问题类型',
      [
        { text: '内容不当', onPress: () => submitReport('inappropriate') },
        { text: '质量问题', onPress: () => submitReport('quality') },
        { text: '其他问题', onPress: () => submitReport('other') },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  const submitReport = (reason: string) => {
    // TODO: 实现报告提交逻辑
    Alert.alert('感谢反馈', '我们会尽快处理您的报告');
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* 顶部按钮 */}
        <View style={styles.topBar}>
          {/* 左上角关闭按钮 */}
          <TouchableOpacity
            style={styles.topButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* 右上角按钮组 */}
          <View style={styles.topRightButtons}>
            <TouchableOpacity
              style={styles.topButton}
              onPress={handleReport}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="alert-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topButton}
              onPress={handleShare}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 媒体展示区域 */}
        <View style={styles.imageWrapper}>
          {shouldUseVideo ? (
            <VideoView
              player={videoPlayer}
              style={styles.video}
              contentFit="contain"
              nativeControls={true}
            />
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          )}
        </View>

        {/* 底部操作按钮 */}
        <View style={styles.bottomBar}>
          {/* 删除按钮 */}
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <View style={styles.bottomButtonCircle}>
              {isDeleting ? (
                <Text style={styles.buttonText}>...</Text>
              ) : (
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              )}
            </View>
          </TouchableOpacity>

          {/* 保存按钮 - 带向下箭头 */}
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleSaveToLocal}
            disabled={isSaving}
          >
            <View style={styles.saveButtonCircle}>
              {isSaving ? (
                <Text style={styles.buttonText}>...</Text>
              ) : (
                <View style={styles.arrowContainer}>
                  <Ionicons name="arrow-down" size={28} color="#000" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  topRightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  image: {
    width: width,
    height: height - 200,
  },
  video: {
    width: width,
    height: height - 200,
  },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 60,
    zIndex: 10,
  },
  bottomButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buttonText: {
    fontSize: 18,
    color: '#666',
  },
  saveButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

